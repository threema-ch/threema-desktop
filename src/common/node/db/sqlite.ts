import {SynchronousPromise} from 'synchronous-promise';
import type {UpdatableValues} from 'ts-sql-query/extras/types';
import {ConsoleLogQueryRunner} from 'ts-sql-query/queryRunners/ConsoleLogQueryRunner';
import type {QueryRunner} from 'ts-sql-query/queryRunners/QueryRunner';
import type {ColumnsForSetOf, OuterJoinSourceOf} from 'ts-sql-query/utils/tableOrViewUtils';

import DatabaseConstructor, {type Database} from 'better-sqlcipher';
import type {NonceHash} from '~/common/crypto';
import type {
    DbAudioMessage,
    DbAudioMessageFragment,
    DatabaseBackend,
    DbAnyMessage,
    DbBaseFileMessageFragment,
    DbContact,
    DbContactUid,
    DbConversation,
    DbConversationUid,
    DbCreate,
    DbCreateConversationMixin,
    DbCreated,
    DbDistributionListUid,
    DbFileData,
    DbFileDataUid,
    DbFileMessage,
    DbGet,
    DbGlobalProperty,
    DbGroup,
    DbGroupUid,
    DbHas,
    DbImageMessage,
    DbImageMessageFragment,
    DbList,
    DbMessageCommon,
    DbMessageUid,
    DbNonce,
    DbNonceUid,
    DbReceiverLookup,
    DbRemove,
    DbTextMessage,
    DbTextMessageFragment,
    DbUnreadMessageCountMixin,
    DbUpdate,
    DbVideoMessage,
    DbVideoMessageFragment,
    RawDatabaseKey,
    DbCreateMessage,
    DbAnyMediaMessage,
    DbMessageReaction,
    DbMessageEditFor,
    DbMessageLastEdit,
    DbStatusMessage,
    DbStatusMessageUid,
    DbCreateStatusMessage,
    DbAnyNonDeletedMessage,
    DbDeletedMessage,
} from '~/common/db';
import {
    type GlobalPropertyKey,
    GroupUserState,
    MessageQueryDirection,
    MessageType,
    type NonceScope,
    ReceiverType,
} from '~/common/enum';
import type {FileId} from '~/common/file-storage';
import type {Logger} from '~/common/logging';
import type {
    AnyNonDeletedMessageType,
    MediaBasedMessageType,
    TextBasedMessageType,
} from '~/common/model/types/message';
import {
    statusMessageUidToStatusMessageId,
    type GroupId,
    type IdentityString,
    type MessageId,
} from '~/common/network/types';
import {type Settings, SETTINGS_CODEC} from '~/common/settings';
import type {u53} from '~/common/types';
import {chunk} from '~/common/utils/array';
import {
    assert,
    assertUnreachable,
    isNotUndefined,
    unreachable,
    unwrap,
} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {hasProperty, omit, pick} from '~/common/utils/object';

import {CUSTOM_TYPES, DBConnection} from './connection';
import {MigrationHelper} from './migrations';
import {BetterSqlCipherQueryRunner} from './query-runner';
import {sync} from './sync';
import {
    tContact,
    tConversation,
    tFileData,
    tGlobalProperty,
    tGroup,
    tGroupMember,
    tMessage,
    tMessageAudioData,
    tMessageFileData,
    tMessageHistory,
    tMessageImageData,
    tMessageReaction,
    tMessageTextData,
    tMessageVideoData,
    tNonce,
    tSettings,
    tStatusMessage,
} from './tables';

type UpdateSetsForDbMessage<
    TDbMessage extends DbFileMessage | DbImageMessage | DbVideoMessage | DbAudioMessage,
> = TDbMessage extends DbFileMessage
    ? UpdatableValues<typeof tMessageFileData>
    : TDbMessage extends DbImageMessage
      ? UpdatableValues<typeof tMessageImageData>
      : TDbMessage extends DbVideoMessage
        ? UpdatableValues<typeof tMessageVideoData>
        : TDbMessage extends DbAudioMessage
          ? UpdatableValues<typeof tMessageAudioData>
          : never;

/**
 * All update sets that include thumbnail data.
 */
type UpdateSetWithThumbnail =
    | UpdateSetsForDbMessage<DbFileMessage>
    | UpdateSetsForDbMessage<DbImageMessage>
    | UpdateSetsForDbMessage<DbVideoMessage>;

/**
 * Union of all media message data table types.
 */
type AnyMediaMessageDataTable =
    | typeof tMessageImageData
    | typeof tMessageFileData
    | typeof tMessageAudioData
    | typeof tMessageVideoData;

/**
 * Database backend backed by SQLite (with SQLCipher), using the BetterSqlCipher driver.
 */
export class SqliteDatabaseBackend implements DatabaseBackend {
    /**
     * Raw BetterSqlCipher database connection.
     */
    private readonly _rawDb: Database;

    /**
     * Database connection used for `ts-sql-query`.
     */
    private readonly _db: DBConnection;

    /**
     * Instantiate database backend.
     *
     * Note: The {@link dbKey} will be consumed and purged after initialization!
     */
    private constructor(
        private readonly _log: Logger,
        private readonly _migrationHelper: MigrationHelper,
        dbPath: string,
        dbKey: RawDatabaseKey,
    ) {
        // Determine verbose logging adapter for (mostly) echoed SQL commands
        let verbose;
        if (import.meta.env.DEBUG && import.meta.env.VERBOSE_LOGGING.DB) {
            verbose = (message?: unknown, ...args: readonly unknown[]) => {
                if (typeof message !== 'string') {
                    return;
                }
                if (message.startsWith('PRAGMA key')) {
                    this._log.debug('PRAGMA key <redacted>');
                    return;
                }
                this._log.debug(message, ...args);
            };
        }

        // Initialise the database
        this._rawDb = new DatabaseConstructor(dbPath, {
            verbose,
        });
        this._log.info(`Connected to database at ${dbPath}`);

        // Set database version compatibility and key
        //
        // Note: We set the key directly without PBKDF2 derivation, see:
        // https://www.zetetic.net/sqlcipher/sqlcipher-api/#example-2-raw-key-data-without-key-derivation
        {
            const dbKeyHex: string = bytesToHex(dbKey.unwrap());
            assert(dbKeyHex.length === 64);
            this._rawDb.pragma('cipher_compatibility = 4');
            this._rawDb.pragma(`key = "x'${dbKeyHex}'"`);
        }
        dbKey.purge();

        // Check cipher provider
        const provider: unknown = this._rawDb.pragma('cipher_provider', {simple: true});
        if (provider !== 'bearssl') {
            throw new Error(`Invalid cipher provider: ${provider}`);
        }
        this._log.info('Using cipher provider:', provider);

        // Because we want to ensure that only encrypted data is written to the database, make sure
        // that SQLite doesn't write teporary files to disk. Our SQLite bindings already force
        // in-memory storage for temporary files (SQLITE_TEMP_STORE=3 compile time option), but as a
        // failsafe mechanism, set that option again here using a pragma.
        this._rawDb.pragma('temp_store = MEMORY');

        // Enable WAL (Write-Ahead Logging) for improved performance. See [1] for more details. Note
        // that SQLCipher encrypts the WAL as well [2].
        //
        // [1] https://www.sqlite.org/wal.html
        // [2] https://www.zetetic.net/sqlcipher/design/
        this._rawDb.pragma('journal_mode = WAL');

        // With WAL enabled, SQLite will append new data to the WAL instead of writing it directly
        // to the database. This improves write performance, but reads will need to look up data in
        // the WAL first. That means that overly large WAL files will lead to degraded read
        // performance.
        //
        // To avoid the WAL getting too large, SQLite will do regular automatic checkpoints, where
        // data from the WAL is written to the database. By default this value is set to 1000 pages.
        // Because browsing chats will be more read-heavy than write-heavy, slightly reduce this
        // value. Before further tweaks are done, we'd need a benchmark, otherwise we're just
        // guessing.
        this._rawDb.pragma('wal_autocheckpoint = 800');

        // Reduce sync mode from HIGH to NORMAL. In WAL mode, this is still safe from corruption.
        // Durability is very slightly decreased, a transaction committed in WAL mode with
        // synchronous=NORMAL might roll back following a power loss or system crash. Transactions
        // are durable across application crashes regardless of the synchronous setting or journal
        // mode.
        //
        // From the docs: "The synchronous=NORMAL setting is a good choice for most applications
        // running in WAL mode."
        //
        // More details can be found at https://www.sqlite.org/pragma.html#pragma_synchronous
        this._rawDb.pragma('synchronous = NORMAL');

        // Quick database integrity check
        this.checkIntegrity();

        // Ensure we're using safe integers (bigint) by default
        this._rawDb.defaultSafeIntegers();

        // Whether to enable SQL query logging
        // TODO(DESK-434): This should be part of a config flag!
        const enableVerboseQueryLogging = false;

        // Determine query runner
        let queryRunner: QueryRunner = new BetterSqlCipherQueryRunner(this._rawDb, {
            promise: SynchronousPromise,
        });
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (enableVerboseQueryLogging) {
            queryRunner = new ConsoleLogQueryRunner(queryRunner);
        }

        // Wrap database with ts-sql-query connection type
        this._db = new DBConnection(_log, queryRunner);
    }

    /**
     * Instantiate SqlCipher database.
     *
     * Note: The {@link dbKey} will be consumed and purged after initialization!
     *
     * Note: Migrations are loaded, but not run!
     */
    public static create(
        log: Logger,
        dbPath: string,
        dbKey: RawDatabaseKey,
    ): SqliteDatabaseBackend {
        // Instantiate migration helper
        const migrationHelper = MigrationHelper.create(log);

        // Instantiate backend
        const backend = new SqliteDatabaseBackend(log, migrationHelper, dbPath, dbKey);

        log.info('SqliteDatabaseBackend initialized');
        return backend;
    }

    /**
     * Run database migrations.
     */
    public runMigrations(): void {
        const count = this._migrationHelper.migrate(this._rawDb);
        if (count > 0) {
            this._log.info(`Successfully ran ${count} database migration(s)`);
        }
    }

    /**
     * Self test function.
     *
     * @throws {Error} if the self-test failed.
     */
    public checkIntegrity(): void {
        if (this._rawDb.prepare('SELECT count(*) FROM sqlite_master').all().length !== 1) {
            throw new Error('Database file corrupt or invalid key');
        }
    }

    /* eslint-disable @typescript-eslint/member-ordering */

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private _splitContact<
        TContact extends (DbCreate<DbContact> & DbCreateConversationMixin) | DbUpdate<DbContact>,
    >(contact: TContact) {
        return {
            set: () => ({
                ...contact,
                ...(contact.notificationTriggerPolicyOverride !== undefined
                    ? ({
                          notificationTriggerPolicyOverride:
                              contact.notificationTriggerPolicyOverride.policy,
                          notificationTriggerPolicyOverrideExpiresAt:
                              contact.notificationTriggerPolicyOverride.expiresAt,
                      } as const)
                    : ({
                          notificationTriggerPolicyOverride: undefined,
                          notificationTriggerPolicyOverrideExpiresAt: undefined,
                      } as const)),
            }),
            ignoreIfSet: () => {
                const ignore: ColumnsForSetOf<typeof tContact>[] = [];
                if (!hasProperty(contact, 'notificationTriggerPolicyOverride')) {
                    ignore.push(
                        'notificationTriggerPolicyOverride',
                        'notificationTriggerPolicyOverrideExpiresAt',
                    );
                }
                return ignore;
            },
        };
    }

    /** @inheritdoc */
    public createContact(contact: DbCreate<DbContact> & DbCreateConversationMixin): DbContactUid {
        const split = this._splitContact(contact);
        return this._db.syncTransaction(() => {
            // Create the contact first
            const uid = sync(
                this._db
                    .insertInto(tContact)
                    .set(split.set())
                    .returningLastInsertedId()
                    .executeInsert(),
            );

            // Now, create the associated conversation
            this._createConversation({
                receiver: {
                    type: ReceiverType.CONTACT,
                    uid,
                },
                lastUpdate: contact.lastUpdate,
                category: contact.category,
                visibility: contact.visibility,
            });

            // Return the UID of the contact
            return uid;
        }, this._log);
    }

    /** @inheritdoc */
    public hasContactByIdentity(identity: IdentityString): DbHas<DbContact> {
        return sync(
            this._db
                .selectFrom(tContact)
                .select({uid: tContact.uid})
                .where(tContact.identity.equals(identity))
                .executeSelectNoneOrOne(),
        )?.uid;
    }

    /** @inheritdoc */
    public getContactByUid(uid: DbContactUid): DbGet<DbContact> {
        const contact = sync(
            this._db
                .selectFrom(tContact)
                .select({
                    uid: tContact.uid,
                    identity: tContact.identity,
                    publicKey: tContact.publicKey,
                    createdAt: tContact.createdAt,
                    firstName: tContact.firstName,
                    lastName: tContact.lastName,
                    nickname: tContact.nickname,
                    verificationLevel: tContact.verificationLevel,
                    workVerificationLevel: tContact.workVerificationLevel,
                    identityType: tContact.identityType,
                    acquaintanceLevel: tContact.acquaintanceLevel,
                    activityState: tContact.activityState,
                    featureMask: tContact.featureMask,
                    syncState: tContact.syncState,
                    typingIndicatorPolicyOverride: tContact.typingIndicatorPolicyOverride,
                    readReceiptPolicyOverride: tContact.readReceiptPolicyOverride,
                    notificationTriggerPolicyOverrideValue:
                        tContact.notificationTriggerPolicyOverride,
                    notificationTriggerPolicyOverrideExpiresAt:
                        tContact.notificationTriggerPolicyOverrideExpiresAt,
                    notificationSoundPolicyOverride: tContact.notificationSoundPolicyOverride,
                    profilePictureContactDefined: tContact.profilePictureContactDefined,
                    profilePictureGatewayDefined: tContact.profilePictureGatewayDefined,
                    profilePictureUserDefined: tContact.profilePictureUserDefined,
                    profilePictureBlobIdSent: tContact.profilePictureBlobIdSent,
                    colorIndex: tContact.colorIndex,
                })
                .where(tContact.uid.equals(uid))
                .guidedSplitOptional('notificationTriggerPolicyOverride', {
                    policy: 'notificationTriggerPolicyOverrideValue!',
                    expiresAt: 'notificationTriggerPolicyOverrideExpiresAt?',
                })
                .executeSelectNoneOrOne(),
        );
        if (contact === null) {
            return undefined;
        }

        return {
            ...contact,
            type: ReceiverType.CONTACT,
        };
    }

    /** @inheritdoc */
    public updateContact(contact: DbUpdate<DbContact>): void {
        const split = this._splitContact(contact);
        sync(
            this._db
                .update(tContact)
                .set(split.set())
                .ignoreIfSet(...split.ignoreIfSet())
                .where(tContact.uid.equals(contact.uid))
                .executeUpdate(),
        );
    }

    /** @inheritdoc */
    public removeContact(uid: DbRemove<DbContact>): boolean {
        return this._db.syncTransaction(() => {
            // Remove the conversation first. This implicitly removes any associated messages.
            sync(
                this._db
                    .deleteFrom(tConversation)
                    .where(tConversation.contactUid.equals(uid))
                    .executeDelete(),
            );

            // Next, remove all remaining messages from this user (e.g. in group conversations)
            // TODO(DESK-770): Ensure that group messages don't get silently deleted when removing a contact
            sync(
                this._db
                    .deleteFrom(tMessage)
                    .where(tMessage.senderContactUid.equals(uid))
                    .executeDelete(),
            );

            // Delete all inactive groups where the contact to be deleted is the creator. Note: This
            // will not update the corresponding stores, so that the UI might be inconsistent until
            // reload.
            // TODO(DESK-770): Do not automatically delete this groups.
            const identityOfContactToRemove = sync(
                this._db
                    .selectFrom(tContact)
                    .where(tContact.uid.equals(uid))
                    .selectOneColumn(tContact.identity)
                    .executeSelectNoneOrOne(),
            );
            if (identityOfContactToRemove !== null) {
                const groupUids = sync(
                    this._db
                        .selectFrom(tGroup)
                        .where(
                            tGroup.creatorIdentity
                                .equals(identityOfContactToRemove)
                                .and(tGroup.userState.notEquals(GroupUserState.MEMBER)),
                        )
                        .selectOneColumn(tGroup.uid)
                        .executeSelectMany(),
                );
                for (const groupUid of groupUids) {
                    // Remove the conversation first. This implicitly removes any associated messages.
                    sync(
                        this._db
                            .deleteFrom(tConversation)
                            .where(tConversation.groupUid.equals(groupUid))
                            .executeDelete(),
                    );

                    // Now, remove the group
                    sync(
                        this._db
                            .deleteFrom(tGroup)
                            .where(tGroup.uid.equals(groupUid))
                            .executeDelete(),
                    );
                }
            }

            // Now, remove the contact
            return (
                sync(
                    this._db.deleteFrom(tContact).where(tContact.uid.equals(uid)).executeDelete(),
                ) > 0
            );
        }, this._log);
    }

    /** @inheritdoc */
    public getAllContactUids(): DbList<DbContact, 'uid'> {
        return sync(this._db.selectFrom(tContact).select({uid: tContact.uid}).executeSelectMany());
    }

    /**
     * Unsplit a DbGroup into the fields as required by the database.
     */
    private _reverseDbGroupSplit<
        TGroup extends (DbCreate<DbGroup> & DbCreateConversationMixin) | DbUpdate<DbGroup>,
    >(
        group: TGroup,
    ): TGroup & {
        readonly notificationTriggerPolicyOverride: undefined | 0 | 1;
        readonly notificationTriggerPolicyOverrideExpiresAt: Date | undefined;
    } {
        let notificationOverridePartial;
        if (group.notificationTriggerPolicyOverride === undefined) {
            notificationOverridePartial = {
                notificationTriggerPolicyOverride: undefined,
                notificationTriggerPolicyOverrideExpiresAt: undefined,
            } as const;
        } else {
            notificationOverridePartial = {
                notificationTriggerPolicyOverride: group.notificationTriggerPolicyOverride.policy,
                notificationTriggerPolicyOverrideExpiresAt:
                    group.notificationTriggerPolicyOverride.expiresAt,
            } as const;
        }

        return {
            ...group,
            ...notificationOverridePartial,
        };
    }

    /**
     * Get an array of fields that should be ignored after the unsplitting process.
     */
    private _getIgnoredFieldsAfterDbGroupSplitReversal<TGroup extends DbUpdate<DbGroup>>(
        group: TGroup,
    ): ColumnsForSetOf<typeof tGroup>[] {
        const ignore: ColumnsForSetOf<typeof tGroup>[] = [];
        if (!hasProperty(group, 'notificationTriggerPolicyOverride')) {
            ignore.push(
                'notificationTriggerPolicyOverride',
                'notificationTriggerPolicyOverrideExpiresAt',
            );
        }
        return ignore;
    }

    /** @inheritdoc */
    public createGroup(group: DbCreate<DbGroup> & DbCreateConversationMixin): DbGroupUid {
        return this._db.syncTransaction(() => {
            // Create the group first
            const uid = sync(
                this._db
                    .insertInto(tGroup)
                    .set(this._reverseDbGroupSplit(group))
                    .returningLastInsertedId()
                    .executeInsert(),
            );

            // Now, create the associated conversation
            this._createConversation({
                receiver: {
                    type: ReceiverType.GROUP,
                    uid,
                },
                lastUpdate: group.lastUpdate ?? new Date(),
                category: group.category,
                visibility: group.visibility,
            });

            // Return the UID of the group
            return uid;
        }, this._log);
    }

    /** @inheritdoc */
    public hasGroupByIdAndCreator(groupdId: GroupId, creator: IdentityString): DbHas<DbGroup> {
        return sync(
            this._db
                .selectFrom(tGroup)
                .select({uid: tGroup.uid})
                .where(tGroup.groupId.equals(groupdId).and(tGroup.creatorIdentity.equals(creator)))
                .executeSelectNoneOrOne(),
        )?.uid;
    }

    /** @inheritdoc */
    public getGroupByUid(queryUid: DbGroupUid): DbGet<DbGroup> {
        const group = sync(
            this._db
                .selectFrom(tGroup)
                .select({
                    uid: tGroup.uid,
                    creatorIdentity: tGroup.creatorIdentity,
                    groupId: tGroup.groupId,
                    name: tGroup.name,
                    createdAt: tGroup.createdAt,
                    userState: tGroup.userState,
                    notificationTriggerPolicyOverrideValue:
                        tGroup.notificationTriggerPolicyOverride,
                    notificationTriggerPolicyOverrideExpiresAt:
                        tGroup.notificationTriggerPolicyOverrideExpiresAt,
                    notificationSoundPolicyOverride: tGroup.notificationSoundPolicyOverride,
                    profilePictureAdminDefined: tGroup.profilePictureAdminDefined,
                    colorIndex: tGroup.colorIndex,
                })
                .where(tGroup.uid.equals(queryUid))
                .guidedSplitOptional('notificationTriggerPolicyOverride', {
                    policy: 'notificationTriggerPolicyOverrideValue!',
                    expiresAt: 'notificationTriggerPolicyOverrideExpiresAt?',
                })
                .executeSelectNoneOrOne(),
        );
        if (group === null) {
            return undefined;
        }

        return {
            ...group,
            type: ReceiverType.GROUP,
        };
    }

    /** @inheritdoc */
    public updateGroup(group: DbUpdate<DbGroup>): void {
        sync(
            this._db
                .update(tGroup)
                .set(this._reverseDbGroupSplit(group))
                .ignoreIfSet(...this._getIgnoredFieldsAfterDbGroupSplitReversal(group))
                .where(tGroup.uid.equals(group.uid))
                .executeUpdate(),
        );
    }

    /** @inheritdoc */
    public removeGroup(uid: DbRemove<DbGroup>): boolean {
        return this._db.syncTransaction(() => {
            // Remove the conversation first. This implicitly removes any associated messages.
            sync(
                this._db
                    .deleteFrom(tConversation)
                    .where(tConversation.groupUid.equals(uid))
                    .executeDelete(),
            );

            // Now, remove the group
            return (
                sync(this._db.deleteFrom(tGroup).where(tGroup.uid.equals(uid)).executeDelete()) > 0
            );
        }, this._log);
    }

    /** @inheritdoc */
    public getAllGroupUids(): DbList<DbGroup, 'uid'> {
        return sync(this._db.selectFrom(tGroup).select({uid: tGroup.uid}).executeSelectMany());
    }

    /** @inheritdoc */
    public getAllGroupMemberContactUids(groupUid: DbGroupUid): DbList<DbContact, 'uid'> {
        return sync(
            this._db
                .selectFrom(tGroupMember)
                .select({uid: tGroupMember.contactUid})
                .where(tGroupMember.groupUid.equals(groupUid))
                .executeSelectMany(),
        );
    }

    /** @inheritdoc */
    public getAllActiveGroupUidsByMember(contactUid: DbContactUid): DbList<DbGroup, 'uid'> {
        return sync(
            this._db
                .selectFrom(tGroupMember)
                .innerJoin(tGroup)
                .on(
                    // TODO(DESK-770): Do not take into account only active groups
                    tGroup.uid
                        .equals(tGroupMember.groupUid)
                        .and(tGroup.userState.equals(GroupUserState.MEMBER)),
                )
                .select({uid: tGroupMember.groupUid})
                .where(tGroupMember.contactUid.equals(contactUid))
                .executeSelectMany(),
        );
    }

    /** @inheritdoc */
    public hasGroupMember(groupUid: DbGroupUid, contactUid: DbContactUid): boolean {
        const membershipRecord = sync(
            this._db
                .selectFrom(tGroupMember)
                .select({uid: tGroupMember.uid})
                .where(
                    tGroupMember.groupUid
                        .equals(groupUid)
                        .and(tGroupMember.contactUid.equals(contactUid)),
                )
                .executeSelectNoneOrOne(),
        );
        return membershipRecord !== null;
    }

    /** @inheritdoc */
    public createGroupMember(groupUid: DbGroupUid, contactUid: DbContactUid): void {
        sync(
            this._db
                .insertInto(tGroupMember)
                .set({
                    contactUid,
                    groupUid,
                })
                .returningLastInsertedId()
                .executeInsert(),
        );
    }

    /** @inheritdoc */
    public removeGroupMember(groupUid: DbGroupUid, contactUid: DbContactUid): boolean {
        return (
            sync(
                this._db
                    .deleteFrom(tGroupMember)
                    .where(
                        tGroupMember.groupUid
                            .equals(groupUid)
                            .and(tGroupMember.contactUid.equals(contactUid)),
                    )
                    .executeDelete(),
            ) > 0
        );
    }

    private _createConversation(conversation: DbCreate<DbConversation>): DbCreated<DbConversation> {
        let receiver:
            | {contactUid: DbContactUid}
            | {groupUid: DbGroupUid}
            | {distributionListUid: DbDistributionListUid};
        switch (conversation.receiver.type) {
            case ReceiverType.CONTACT:
                receiver = {contactUid: conversation.receiver.uid};
                break;
            case ReceiverType.GROUP:
                receiver = {groupUid: conversation.receiver.uid};
                break;
            case ReceiverType.DISTRIBUTION_LIST:
                receiver = {distributionListUid: conversation.receiver.uid};
                break;
            default:
                unreachable(conversation.receiver);
        }

        return sync(
            this._db
                .insertInto(tConversation)
                .set({
                    ...conversation,
                    ...receiver,
                })
                .returningLastInsertedId()
                .executeInsert(),
        );
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private _getCommonConversationSelector() {
        const tUnreadMessages = tMessage.forUseInLeftJoinAs('unreadMessages');
        return this._db
            .selectFrom(tConversation)
            .leftJoin(tUnreadMessages)
            .on(
                // Join condition: Conversation UID matches the conversation, message is inbound
                // and message is unread.
                tUnreadMessages.conversationUid
                    .equals(tConversation.uid)
                    .and(tUnreadMessages.senderContactUid.isNotNull())
                    .and(tUnreadMessages.readAt.isNull()),
            )
            .groupBy(tConversation.uid)
            .select({
                uid: tConversation.uid,
                lastUpdate: tConversation.lastUpdate,
                contactUid: tConversation.contactUid,
                groupUid: tConversation.groupUid,
                distributionListUid: tConversation.distributionListUid,
                category: tConversation.category,
                visibility: tConversation.visibility,
                unreadMessageCount: this._db.count(tUnreadMessages.uid),
            });
    }

    /** @inheritdoc */
    public getConversationByUid(
        uid: DbConversationUid,
    ): DbGet<DbConversation & DbUnreadMessageCountMixin> {
        // Get conversation
        const conversation = sync(
            this._getCommonConversationSelector()
                .where(tConversation.uid.equals(uid))
                .executeSelectNoneOrOne(),
        );
        if (conversation === null) {
            return undefined;
        }

        // Get receiver lookup
        let receiver: DbReceiverLookup;
        if (conversation.contactUid !== undefined) {
            receiver = {type: ReceiverType.CONTACT, uid: conversation.contactUid};
        } else if (conversation.groupUid !== undefined) {
            receiver = {type: ReceiverType.GROUP, uid: conversation.groupUid};
        } else if (conversation.distributionListUid !== undefined) {
            receiver = {
                type: ReceiverType.DISTRIBUTION_LIST,
                uid: conversation.distributionListUid,
            };
        } else {
            assertUnreachable(
                'Either a contactUid, a groupUid or a distributionListUid must be set on a conversation',
            );
        }

        return {
            ...conversation,
            receiver,
        };
    }

    /** @inheritdoc */
    public getConversationOfReceiver(
        receiver: DbReceiverLookup,
    ): DbGet<DbConversation & DbUnreadMessageCountMixin> {
        // Determine where condition based on receiver
        let whereCondition;
        switch (receiver.type) {
            case ReceiverType.CONTACT:
                whereCondition = tConversation.contactUid.equals(receiver.uid);
                break;
            case ReceiverType.GROUP:
                whereCondition = tConversation.groupUid.equals(receiver.uid);
                break;
            case ReceiverType.DISTRIBUTION_LIST:
                whereCondition = tConversation.distributionListUid.equals(receiver.uid);
                break;
            default:
                unreachable(receiver);
        }

        // Fetch conversation
        const conversation = sync(
            this._getCommonConversationSelector().where(whereCondition).executeSelectNoneOrOne(),
        );
        if (conversation === null) {
            return undefined;
        }

        // Aggregate results
        return {
            ...conversation,
            receiver,
        };
    }

    /** @inheritdoc */
    public updateConversation(conversation: DbUpdate<Omit<DbConversation, 'receiver'>>): void {
        sync(
            this._db
                .update(tConversation)
                .set(conversation)
                .where(tConversation.uid.equals(conversation.uid))
                .executeUpdate(),
        );
    }

    public getAllConversationReceivers(): DbList<DbConversation, 'receiver'> {
        return sync(
            this._db
                .selectFrom(tConversation)
                .select({
                    contactUid: tConversation.contactUid,
                    groupUid: tConversation.groupUid,
                    distributionListUid: tConversation.distributionListUid,
                })
                .executeSelectMany(),
        ).map((receiver): Pick<DbConversation, 'receiver'> => {
            if (receiver.contactUid !== undefined) {
                return {receiver: {type: ReceiverType.CONTACT, uid: receiver.contactUid}};
            }
            if (receiver.distributionListUid !== undefined) {
                return {
                    receiver: {
                        type: ReceiverType.DISTRIBUTION_LIST,
                        uid: receiver.distributionListUid,
                    },
                };
            }
            if (receiver.groupUid !== undefined) {
                return {receiver: {type: ReceiverType.GROUP, uid: receiver.groupUid}};
            }
            throw new Error(
                `Unknown receiver in conversation: '${Object.keys(receiver).join(',')}'`,
            );
        });
    }

    /**
     * Insert the common message fields into the {@link tMessage} table.
     *
     * This method should only be used inside a transaction.
     */
    private _insertCommonMessageData<T extends MessageType>(
        message: DbCreateMessage<DbMessageCommon<T>>,
    ): DbMessageUid {
        return sync(
            this._db
                .insertInto(tMessage)
                .set({
                    messageId: message.id,
                    senderContactUid: message.senderContactUid,
                    conversationUid: message.conversationUid,
                    createdAt: message.createdAt,
                    processedAt: message.processedAt,
                    readAt: message.readAt,
                    raw: message.raw,
                    messageType: message.type,
                    threadId: message.threadId,
                })
                .returningLastInsertedId()
                .executeInsert(),
        );
    }

    /** @inheritdoc */
    public createTextMessage(message: DbCreateMessage<DbTextMessage>): DbCreated<DbTextMessage> {
        return this._db.syncTransaction(() => {
            // Common message
            const messageUid: DbMessageUid = this._insertCommonMessageData(message);

            // Text data
            sync(
                this._db
                    .insertInto(tMessageTextData)
                    .set({
                        messageUid,
                        text: message.text,
                        quotedMessageId: message.quotedMessageId,
                    })
                    .executeInsert(),
            );

            // Note: Returning the UID of the main message, not of the messageTextData
            return messageUid;
        }, this._log);
    }

    /**
     * Insert file data into the database.
     *
     * @throws if an entry with the specified file ID already exists
     */
    private _insertFileData(fileData: DbFileData): DbFileDataUid {
        return sync(
            this._db
                .insertInto(tFileData)
                .set({
                    fileId: fileData.fileId,
                    encryptionKey: fileData.encryptionKey,
                    unencryptedByteCount: fileData.unencryptedByteCount,
                    storageFormatVersion: fileData.storageFormatVersion,
                })
                .returningLastInsertedId()
                .executeInsert(),
        );
    }

    private _updateFileData(
        fileData: DbFileData,
        previousFileDataUid: DbFileDataUid,
    ): {newUid: DbFileDataUid; previousUid: DbFileDataUid} | undefined {
        // In order to be able to compare the file data, we first need to fetch the
        // previous file data from the database.
        const previousFileData = sync(
            this._db
                .selectFrom(tFileData)
                .select({
                    fileId: tFileData.fileId,
                    encryptionKey: tFileData.encryptionKey,
                    unencryptedByteCount: tFileData.unencryptedByteCount,
                    storageFormatVersion: tFileData.storageFormatVersion,
                })
                .where(tFileData.uid.equals(previousFileDataUid))
                .executeSelectOne(),
        );

        // Use the file ID to compare file data
        if (fileData.fileId === previousFileData.fileId) {
            // If file ID is the same, then the other data must be identical as well
            if (!fileData.encryptionKey.equals(previousFileData.encryptionKey)) {
                throw new Error(
                    'Cannot insert file data with existing file ID but different encryption key',
                );
            }
            if (fileData.unencryptedByteCount !== previousFileData.unencryptedByteCount) {
                throw new Error(
                    'Cannot insert file data with existing file ID but different byte count',
                );
            }
            if (fileData.storageFormatVersion !== previousFileData.storageFormatVersion) {
                throw new Error(
                    'Cannot insert file data with existing file ID but different storage format version',
                );
            }

            // Data is unchanged!
            return undefined;
        }

        // File data was replaced! Insert new entry
        return {newUid: this._insertFileData(fileData), previousUid: previousFileDataUid};
    }

    /**
     * Try to insert file data into the database.
     *
     * @throws Error if an entry with the specified file ID already exists, but has mismatching
     *   associated data (e.g. a different encryption key)
     */
    private _getOrInsertFileDataUid(fileData: DbFileData): DbFileDataUid {
        // First, check whether file data with this file ID already exists in the database
        const existingFileData = sync(
            this._db
                .selectFrom(tFileData)
                .select({
                    uid: tFileData.uid,
                    fileId: tFileData.fileId,
                    encryptionKey: tFileData.encryptionKey,
                    unencryptedByteCount: tFileData.unencryptedByteCount,
                    storageFormatVersion: tFileData.storageFormatVersion,
                })
                .where(tFileData.fileId.equals(fileData.fileId))
                .executeSelectNoneOrOne(),
        );

        // If data is found, ensure that all fields are identical. Then, return the UID.
        if (existingFileData !== null) {
            assert(
                existingFileData.fileId === fileData.fileId,
                'Existing file data entry with fileId mismatch',
            );
            assert(
                existingFileData.encryptionKey.equals(fileData.encryptionKey),
                'Existing file data entry with encryptionKey mismatch',
            );
            assert(
                existingFileData.unencryptedByteCount === fileData.unencryptedByteCount,
                'Existing file data entry with unencryptedByteCount mismatch',
            );
            assert(
                existingFileData.storageFormatVersion === fileData.storageFormatVersion,
                'Existing file data entry with storageFormatVersion mismatch',
            );
            return existingFileData.uid;
        }

        // Otherwise, insert a new file data row
        return this._insertFileData(fileData);
    }

    /**
     * Write file data for file and thumbnail into the appropriate DB table and return the
     * corresponding UIDs.
     */
    private _writeFileDataForMessage(
        message: Pick<DbFileMessage, 'fileData' | 'thumbnailFileData'>,
    ): {fileDataUid?: DbFileDataUid; thumbnailFileDataUid?: DbFileDataUid} {
        const fileDataUid =
            message.fileData === undefined
                ? undefined
                : this._getOrInsertFileDataUid(message.fileData);
        const thumbnailFileDataUid =
            message.thumbnailFileData === undefined
                ? undefined
                : this._getOrInsertFileDataUid(message.thumbnailFileData);

        // Sanity check: File and thumbnail data UIDs must be different
        if (fileDataUid !== undefined || thumbnailFileDataUid !== undefined) {
            assert(
                fileDataUid !== thumbnailFileDataUid,
                'fileDataUid and thumbnailFileDataUid must be different',
            );
        }

        return {fileDataUid, thumbnailFileDataUid};
    }

    /**
     * Helper function to insert a file based message into the database.
     *
     * @param message The message to insert.
     * @param insertMessageData This function is responsible for executing the insert query, using
     *   the provided shared fields.
     */
    private _createFileBasedMessage<
        TMessageType extends MessageType,
        TDbMessage extends DbMessageCommon<TMessageType> & DbBaseFileMessageFragment,
    >(
        message: DbCreateMessage<TDbMessage>,
        insertMessageData: (sharedFields: {
            messageUid: DbMessageUid;
            fileDataUid?: DbFileDataUid;
            thumbnailFileDataUid?: DbFileDataUid;
        }) => void,
    ): DbCreated<TDbMessage> {
        return this._db.syncTransaction(() => {
            // Common message
            const messageUid: DbMessageUid = this._insertCommonMessageData(message);

            // Write file data into `fileData` table, store UIDs
            const {fileDataUid, thumbnailFileDataUid} = this._writeFileDataForMessage(message);

            // Write message data
            insertMessageData({messageUid, fileDataUid, thumbnailFileDataUid});

            // Note: Returning the UID of the main message, not of the messageFileData
            return messageUid;
        }, this._log);
    }

    /**
     * Return the insert set for the {@link DbBaseFileMessageFragment} fields (excluding file data).
     */
    private _getBaseFileMessageFragmentInsertSet(
        message: DbBaseFileMessageFragment,
    ): Omit<DbBaseFileMessageFragment, 'fileData' | 'thumbnailFileData'> {
        return {
            blobId: message.blobId,
            thumbnailBlobId: message.thumbnailBlobId,
            blobDownloadState: message.blobDownloadState,
            thumbnailBlobDownloadState: message.thumbnailBlobDownloadState,
            encryptionKey: message.encryptionKey,
            mediaType: message.mediaType,
            thumbnailMediaType: message.thumbnailMediaType,
            fileName: message.fileName,
            fileSize: message.fileSize,
            caption: message.caption,
            correlationId: message.correlationId,
        };
    }

    /** @inheritdoc */
    public createFileMessage(message: DbCreateMessage<DbFileMessage>): DbCreated<DbFileMessage> {
        return this._createFileBasedMessage(message, (sharedFields) => {
            sync(
                this._db
                    .insertInto(tMessageFileData)
                    .set({
                        // Fields shared among all file-based message types
                        ...this._getBaseFileMessageFragmentInsertSet(message),
                        ...sharedFields,
                    })
                    .executeInsert(),
            );
        });
    }

    /** @inheritdoc */
    public createImageMessage(message: DbCreateMessage<DbImageMessage>): DbCreated<DbImageMessage> {
        return this._createFileBasedMessage(message, (sharedFields) => {
            sync(
                this._db
                    .insertInto(tMessageImageData)
                    .set({
                        // Fields shared among all file-based message types
                        ...this._getBaseFileMessageFragmentInsertSet(message),
                        ...sharedFields,

                        // Fields specific to this message type
                        renderingType: message.renderingType,
                        animated: message.animated,
                        height: message.dimensions?.height,
                        width: message.dimensions?.width,
                    })
                    .executeInsert(),
            );
        });
    }

    /** @inheritdoc */
    public createVideoMessage(message: DbCreateMessage<DbVideoMessage>): DbCreated<DbVideoMessage> {
        return this._createFileBasedMessage(message, (sharedFields) => {
            sync(
                this._db
                    .insertInto(tMessageVideoData)
                    .set({
                        // Fields shared among all file-based message types
                        ...this._getBaseFileMessageFragmentInsertSet(message),
                        ...sharedFields,

                        // Fields specific to this message type
                        duration: message.duration,
                        height: message.dimensions?.height,
                        width: message.dimensions?.width,
                    })
                    .executeInsert(),
            );
        });
    }

    /** @inheritdoc */
    public createAudioMessage(message: DbCreateMessage<DbAudioMessage>): DbCreated<DbAudioMessage> {
        return this._createFileBasedMessage(message, (sharedFields) => {
            sync(
                this._db
                    .insertInto(tMessageAudioData)
                    .set({
                        // Fields shared among all file-based message types
                        ...this._getBaseFileMessageFragmentInsertSet(message),
                        ...sharedFields,

                        // Fields specific to this message type
                        duration: message.duration,
                    })
                    .executeInsert(),
            );
        });
    }

    /** @inheritdoc */
    public hasMessageById(
        conversationUid: DbConversationUid,
        messageId: MessageId,
    ): DbHas<DbAnyMessage> {
        return sync(
            this._db
                .selectFrom(tMessage)
                .select({uid: tMessage.uid})
                .where(
                    tMessage.conversationUid
                        .equals(conversationUid)
                        .and(tMessage.messageId.equals(messageId)),
                )
                .executeSelectNoneOrOne(),
        )?.uid;
    }

    /** @inheritdoc */
    public hasStatusMessageByUid(
        conversationUid: DbConversationUid,
        uid: DbStatusMessageUid,
    ): boolean {
        return (
            sync(
                this._db
                    .selectFrom(tStatusMessage)
                    .select({uid: tStatusMessage.uid})
                    .where(
                        tStatusMessage.conversationUid
                            .equals(conversationUid)
                            .and(tStatusMessage.uid.equals(uid)),
                    )
                    .executeSelectNoneOrOne(),
            ) !== null
        );
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private _getCommonMessageSelector() {
        const tMesssageReactionLeftJoin = tMessageReaction.forUseInLeftJoin();
        const tMessageHistoryLeftJoin = tMessageHistory.forUseInLeftJoin();
        return this._db
            .selectFrom(tMessage)
            .leftJoin(tMesssageReactionLeftJoin)
            .on(tMesssageReactionLeftJoin.messageUid.equals(tMessage.uid))
            .leftJoin(tMessageHistoryLeftJoin)
            .on(tMessageHistoryLeftJoin.messageUid.equals(tMessage.uid))
            .select({
                uid: tMessage.uid,
                id: tMessage.messageId,
                senderContactUid: tMessage.senderContactUid,
                conversationUid: tMessage.conversationUid,
                createdAt: tMessage.createdAt,
                createdAtTimestamp: tMessage.createdAtTimestamp,
                processedAt: tMessage.processedAt,
                deliveredAt: tMessage.deliveredAt,
                readAt: tMessage.readAt,
                raw: tMessage.raw,
                type: tMessage.messageType,
                threadId: tMessage.threadId,
                lastEditedAt: tMessage.lastEditedAt,
                // TODO(DESK-1445): Implement ordinal using virtual columns
                ordinal: tMessage.processedAtTimestamp.valueWhenNull(tMessage.createdAtTimestamp),
                deletedAt: tMessage.deletedAt,

                reactions: this._db
                    .aggregateAsArrayDistinct({
                        reaction: tMesssageReactionLeftJoin.reaction,
                        reactionAt: tMesssageReactionLeftJoin.reactionAt,
                        senderIdentity: tMesssageReactionLeftJoin.senderIdentity,
                    })
                    .useEmptyArrayForNoValue(),

                history: this._db
                    .aggregateAsArrayDistinct({
                        editedAt: tMessageHistoryLeftJoin.editedAt,
                        text: tMessageHistoryLeftJoin.text,
                    })
                    .useEmptyArrayForNoValue(),
            })
            .groupBy(tMessage.uid);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private _getFileDataSelectColumns(
        tFileDataJoinable: OuterJoinSourceOf<typeof tFileData, 'fileData'>,
    ) {
        return {
            fileId: tFileDataJoinable.fileId,
            encryptionKey: tFileDataJoinable.encryptionKey,
            unencryptedByteCount: tFileDataJoinable.unencryptedByteCount,
            storageFormatVersion: tFileDataJoinable.storageFormatVersion,
        } as const;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private _getThumbnailFileDataSelectColumns(
        tThumbnailFileDataJoinable: OuterJoinSourceOf<typeof tFileData, 'thumbnailFileData'>,
    ) {
        return {
            fileId: tThumbnailFileDataJoinable.fileId,
            encryptionKey: tThumbnailFileDataJoinable.encryptionKey,
            unencryptedByteCount: tThumbnailFileDataJoinable.unencryptedByteCount,
            storageFormatVersion: tThumbnailFileDataJoinable.storageFormatVersion,
        } as const;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private _getMessage<TType extends MessageType>(
        common: DbMessageCommon<TType>,
    ): DbGet<DbAnyMessage> {
        // Depending on type, fetch appropriate data
        switch (common.type) {
            case MessageType.TEXT: {
                const text = sync(
                    this._db
                        .selectFrom(tMessageTextData)
                        .select({
                            text: tMessageTextData.text,
                            quotedMessageId: tMessageTextData.quotedMessageId,
                        })
                        .where(tMessageTextData.messageUid.equals(common.uid))
                        .executeSelectOne(),
                );
                return {
                    ...common,
                    ...text,
                    type: MessageType.TEXT,
                };
            }
            case MessageType.FILE: {
                const tFileDataJoinable = tFileData.forUseInLeftJoinAs('fileData');
                const tThumbnailFileDataJoinable =
                    tFileData.forUseInLeftJoinAs('thumbnailFileData');
                const file = sync(
                    this._db
                        // Main table
                        .selectFrom(tMessageFileData)
                        // Join for fileData
                        .leftJoin(tFileDataJoinable)
                        .on(tMessageFileData.fileDataUid.equals(tFileDataJoinable.uid))
                        // Join for thumbnailFileData
                        .leftJoin(tThumbnailFileDataJoinable)
                        .on(
                            tMessageFileData.thumbnailFileDataUid.equals(
                                tThumbnailFileDataJoinable.uid,
                            ),
                        )
                        // Select data
                        .select({
                            // File data columns
                            fileData: this._getFileDataSelectColumns(tFileDataJoinable),
                            thumbnailFileData: this._getThumbnailFileDataSelectColumns(
                                tThumbnailFileDataJoinable,
                            ),
                            // Base file message fields
                            blobId: tMessageFileData.blobId,
                            thumbnailBlobId: tMessageFileData.thumbnailBlobId,
                            blobDownloadState: tMessageFileData.blobDownloadState,
                            thumbnailBlobDownloadState: tMessageFileData.thumbnailBlobDownloadState,
                            encryptionKey: tMessageFileData.encryptionKey,
                            mediaType: tMessageFileData.mediaType,
                            thumbnailMediaType: tMessageFileData.thumbnailMediaType,
                            fileName: tMessageFileData.fileName,
                            fileSize: tMessageFileData.fileSize,
                            caption: tMessageFileData.caption,
                            correlationId: tMessageFileData.correlationId,
                        })
                        .where(tMessageFileData.messageUid.equals(common.uid))
                        .executeSelectOne(),
                );
                return {
                    ...common,
                    type: MessageType.FILE,
                    ...file,
                };
            }
            case MessageType.IMAGE: {
                const tFileDataJoinable = tFileData.forUseInLeftJoinAs('fileData');
                const tThumbnailFileDataJoinable =
                    tFileData.forUseInLeftJoinAs('thumbnailFileData');
                const image = sync(
                    this._db
                        // Main table
                        .selectFrom(tMessageImageData)
                        // Join for fileData
                        .leftJoin(tFileDataJoinable)
                        .on(tMessageImageData.fileDataUid.equals(tFileDataJoinable.uid))
                        // Join for thumbnailFileData
                        .leftJoin(tThumbnailFileDataJoinable)
                        .on(
                            tMessageImageData.thumbnailFileDataUid.equals(
                                tThumbnailFileDataJoinable.uid,
                            ),
                        )
                        // Select data
                        .select({
                            // File data columns
                            fileData: this._getFileDataSelectColumns(tFileDataJoinable),
                            thumbnailFileData: this._getThumbnailFileDataSelectColumns(
                                tThumbnailFileDataJoinable,
                            ),
                            // Base file message fields
                            blobId: tMessageImageData.blobId,
                            thumbnailBlobId: tMessageImageData.thumbnailBlobId,
                            blobDownloadState: tMessageImageData.blobDownloadState,
                            thumbnailBlobDownloadState:
                                tMessageImageData.thumbnailBlobDownloadState,
                            encryptionKey: tMessageImageData.encryptionKey,
                            mediaType: tMessageImageData.mediaType,
                            thumbnailMediaType: tMessageImageData.thumbnailMediaType,
                            fileName: tMessageImageData.fileName,
                            fileSize: tMessageImageData.fileSize,
                            caption: tMessageImageData.caption,
                            correlationId: tMessageImageData.correlationId,
                            // Image-specific fields
                            renderingType: tMessageImageData.renderingType,
                            animated: tMessageImageData.animated,
                            dimensions: {
                                height: tMessageImageData.height.asRequiredInOptionalObject(),
                                width: tMessageImageData.width.asRequiredInOptionalObject(),
                            },
                        })
                        .where(tMessageImageData.messageUid.equals(common.uid))
                        .executeSelectOne(),
                );
                return {
                    ...common,
                    type: MessageType.IMAGE,
                    ...image,
                };
            }
            case MessageType.VIDEO: {
                const tFileDataJoinable = tFileData.forUseInLeftJoinAs('fileData');
                const tThumbnailFileDataJoinable =
                    tFileData.forUseInLeftJoinAs('thumbnailFileData');
                const video = sync(
                    this._db
                        // Main table
                        .selectFrom(tMessageVideoData)
                        // Join for fileData
                        .leftJoin(tFileDataJoinable)
                        .on(tMessageVideoData.fileDataUid.equals(tFileDataJoinable.uid))
                        // Join for thumbnailFileData
                        .leftJoin(tThumbnailFileDataJoinable)
                        .on(
                            tMessageVideoData.thumbnailFileDataUid.equals(
                                tThumbnailFileDataJoinable.uid,
                            ),
                        )
                        // Select data
                        .select({
                            // File data columns
                            fileData: this._getFileDataSelectColumns(tFileDataJoinable),
                            thumbnailFileData: this._getThumbnailFileDataSelectColumns(
                                tThumbnailFileDataJoinable,
                            ),
                            // Base file message fields
                            blobId: tMessageVideoData.blobId,
                            thumbnailBlobId: tMessageVideoData.thumbnailBlobId,
                            blobDownloadState: tMessageVideoData.blobDownloadState,
                            thumbnailBlobDownloadState:
                                tMessageVideoData.thumbnailBlobDownloadState,
                            encryptionKey: tMessageVideoData.encryptionKey,
                            mediaType: tMessageVideoData.mediaType,
                            thumbnailMediaType: tMessageVideoData.thumbnailMediaType,
                            fileName: tMessageVideoData.fileName,
                            fileSize: tMessageVideoData.fileSize,
                            caption: tMessageVideoData.caption,
                            correlationId: tMessageVideoData.correlationId,
                            // Video-specific fields
                            duration: tMessageVideoData.duration,
                            dimensions: {
                                height: tMessageVideoData.height.asRequiredInOptionalObject(),
                                width: tMessageVideoData.width.asRequiredInOptionalObject(),
                            },
                        })
                        .where(tMessageVideoData.messageUid.equals(common.uid))
                        .executeSelectOne(),
                );
                return {
                    ...common,
                    type: MessageType.VIDEO,
                    ...video,
                };
            }
            case MessageType.AUDIO: {
                const tFileDataJoinable = tFileData.forUseInLeftJoinAs('fileData');
                const audio = sync(
                    this._db
                        // Main table
                        .selectFrom(tMessageAudioData)
                        // Join for fileData
                        .leftJoin(tFileDataJoinable)
                        .on(tMessageAudioData.fileDataUid.equals(tFileDataJoinable.uid))
                        // Select data
                        .select({
                            // File data columns
                            fileData: this._getFileDataSelectColumns(tFileDataJoinable),
                            // Base file message fields
                            blobId: tMessageAudioData.blobId,
                            blobDownloadState: tMessageAudioData.blobDownloadState,
                            encryptionKey: tMessageAudioData.encryptionKey,
                            mediaType: tMessageAudioData.mediaType,
                            fileName: tMessageAudioData.fileName,
                            fileSize: tMessageAudioData.fileSize,
                            caption: tMessageAudioData.caption,
                            correlationId: tMessageAudioData.correlationId,
                            // Audio-specific fields
                            duration: tMessageAudioData.duration,
                        })
                        .where(tMessageAudioData.messageUid.equals(common.uid))
                        .executeSelectOne(),
                );
                return {
                    ...common,
                    type: MessageType.AUDIO,
                    ...audio,
                };
            }

            case MessageType.DELETED:
                return {
                    ...common,
                    type: MessageType.DELETED,
                    deletedAt: unwrap(
                        common.deletedAt,
                        'A message of type deleted must havea deletedAt timestamp',
                    ),
                };

            default:
                return unreachable(common.type, new Error(`Unknown message type ${common.type}`));
        }
    }

    /** @inheritdoc */
    public getMessageIdentifiersByText(
        text: string,
        limit?: u53,
    ): DbList<Pick<DbAnyNonDeletedMessage, 'conversationUid' | 'id' | 'uid'>> {
        // TODO(DESK-1333): The following queries could potentially be improved by not utilizing
        // subqueries.
        return sync(
            this._db
                .selectFrom(tMessage)
                .select({
                    conversationUid: tMessage.conversationUid,
                    id: tMessage.messageId,
                    ordinal: tMessage.processedAtTimestamp.valueWhenNull(
                        tMessage.createdAtTimestamp,
                    ),
                    uid: tMessage.uid,
                })
                .where(
                    tMessage.uid.in(
                        this._db
                            .selectFrom(tMessageTextData)
                            .where(tMessageTextData.text.containsInsensitive(text))
                            .selectOneColumn(tMessageTextData.messageUid),
                    ),
                )
                .or(
                    tMessage.uid.in(
                        this._db
                            .selectFrom(tMessageAudioData)
                            .where(tMessageAudioData.caption.containsInsensitive(text))
                            .selectOneColumn(tMessageAudioData.messageUid),
                    ),
                )
                .or(
                    tMessage.uid.in(
                        this._db
                            .selectFrom(tMessageFileData)
                            .where(tMessageFileData.caption.containsInsensitive(text))
                            .selectOneColumn(tMessageFileData.messageUid),
                    ),
                )
                .or(
                    tMessage.uid.in(
                        this._db
                            .selectFrom(tMessageImageData)
                            .where(tMessageImageData.caption.containsInsensitive(text))
                            .selectOneColumn(tMessageImageData.messageUid),
                    ),
                )
                .or(
                    tMessage.uid.in(
                        this._db
                            .selectFrom(tMessageVideoData)
                            .where(tMessageVideoData.caption.containsInsensitive(text))
                            .selectOneColumn(tMessageVideoData.messageUid),
                    ),
                )
                .orderBy('ordinal', 'desc')
                .limitIfValue(limit)
                .executeSelectMany(),
        );
    }

    /** @inheritdoc */
    public getMessageByUid(uid: DbMessageUid): DbGet<DbAnyMessage> {
        const common = sync(
            this._getCommonMessageSelector()
                .where(tMessage.uid.equals(uid))
                .executeSelectNoneOrOne(),
        );
        if (common === null) {
            return undefined;
        }
        return this._getMessage(common);
    }

    /** @inheritdoc */
    public getStatusMessageByUid(uid: DbStatusMessageUid): DbGet<DbStatusMessage> {
        const statusMessage = sync(
            this._db
                .selectFrom(tStatusMessage)
                .select({
                    type: tStatusMessage.type,
                    conversationUid: tStatusMessage.conversationUid,
                    createdAt: tStatusMessage.createdAt,
                    createdAtTimestamp: tStatusMessage.createdAtTimestamp,
                    statusBytes: tStatusMessage.statusBytes,
                    uid: tStatusMessage.uid,
                    ordinal: tStatusMessage.createdAtTimestamp,
                })
                .where(tStatusMessage.uid.equals(uid))
                .executeSelectNoneOrOne()
                .then((value) =>
                    value === null
                        ? null
                        : {
                              ...value,
                              id: statusMessageUidToStatusMessageId(value.uid),
                          },
                ),
        );
        return statusMessage ?? undefined;
    }

    /** @inheritdoc */
    public getLastMessage(conversationUid: DbConversationUid): DbGet<DbAnyMessage> {
        const common = sync(
            this._getCommonMessageSelector()
                .where(tMessage.conversationUid.equals(conversationUid))
                // TODO(DESK-296): Order correctly
                .orderBy('ordinal', 'desc')
                .limit(1)
                .executeSelectNoneOrOne(),
        );
        if (common === null) {
            return undefined;
        }

        return this._getMessage(common);
    }

    /** @inheritdoc */
    public getLastStatusMessage(conversationUid: DbConversationUid): DbGet<DbStatusMessage> {
        const statusMessage = sync(
            this._db
                .selectFrom(tStatusMessage)
                .select({
                    type: tStatusMessage.type,
                    conversationUid: tStatusMessage.conversationUid,
                    createdAt: tStatusMessage.createdAt,
                    createdAtTimestamp: tStatusMessage.createdAtTimestamp,
                    statusBytes: tStatusMessage.statusBytes,
                    uid: tStatusMessage.uid,
                    ordinal: tStatusMessage.createdAtTimestamp,
                })
                .where(tStatusMessage.conversationUid.equals(conversationUid))
                .orderBy('createdAt', 'desc')
                .limit(1)
                .executeSelectNoneOrOne()
                .then((value) =>
                    value === null
                        ? null
                        : {
                              ...value,
                              id: statusMessageUidToStatusMessageId(value.uid),
                          },
                ),
        );
        return statusMessage ?? undefined;
    }

    /** @inheritdoc */
    public getFirstUnreadMessage(conversationUid: DbConversationUid): DbGet<DbAnyMessage> {
        const common = sync(
            this._getCommonMessageSelector()
                .where(
                    tMessage.conversationUid
                        .equals(conversationUid)
                        .and(tMessage.senderContactUid.isNotNull())
                        .and(tMessage.readAt.isNull()),
                )
                // TODO(DESK-296): Order correctly
                .orderBy('ordinal', 'asc')
                .limit(1)
                .executeSelectNoneOrOne(),
        );
        if (common === null) {
            return undefined;
        }

        return this._getMessage(common);
    }

    /** @inheritdoc */
    public createOrUpdateMessageReaction(reaction: DbCreate<DbMessageReaction>): void {
        const update = pick(reaction, ['reactionAt', 'reaction', 'senderIdentity', 'messageUid']);
        const updated = sync(
            this._db
                .insertInto(tMessageReaction)
                .set(update)
                .onConflictDoUpdateSet(update)
                .executeInsert(),
        );
        assert(
            updated === 1,
            `Expected to update exactly one message reaction with message UID ${reaction.messageUid}, but we updated ${updated} rows.`,
        );
    }

    /** @inheritdoc */
    public getReactionsByMessageUid(uid: DbMessageUid): DbGet<DbMessageReaction>[] {
        const result = sync(
            this._db
                .selectFrom(tMessageReaction)
                .select({
                    reactionAt: tMessageReaction.reactionAt,
                    reaction: tMessageReaction.reaction,
                    senderIdentity: tMessageReaction.senderIdentity,
                    uid: tMessageReaction.uid,
                    messageUid: tMessageReaction.messageUid,
                })
                .where(tMessageReaction.messageUid.equals(uid))
                .executeSelectMany(),
        );
        return result;
    }

    private _getLastVideoMessageEdit(
        table: typeof tMessageVideoData,
        messageUid: DbMessageUid,
    ): DbMessageLastEdit {
        const tLeftJoin = table.forUseInLeftJoin();
        return sync(
            this._db
                .selectFrom(tMessage)
                .leftJoin(tLeftJoin)
                .on(tLeftJoin.messageUid.equals(tMessage.uid))
                .select({
                    text: tLeftJoin.caption,
                    lastEditedAt: tMessage.lastEditedAt,
                    createdAt: tMessage.createdAt,
                })
                .where(tMessage.uid.equals(messageUid))
                .executeSelectOne(),
        );
    }

    private _getLastFileMessageEdit(
        table: typeof tMessageFileData,
        messageUid: DbMessageUid,
    ): DbMessageLastEdit {
        const tLeftJoin = table.forUseInLeftJoin();
        return sync(
            this._db
                .selectFrom(tMessage)
                .leftJoin(tLeftJoin)
                .on(tLeftJoin.messageUid.equals(tMessage.uid))
                .select({
                    text: tLeftJoin.caption,
                    lastEditedAt: tMessage.lastEditedAt,
                    createdAt: tMessage.createdAt,
                })
                .where(tMessage.uid.equals(messageUid))
                .executeSelectOne(),
        );
    }

    private _getLastAudioMessageEdit(
        table: typeof tMessageAudioData,
        messageUid: DbMessageUid,
    ): DbMessageLastEdit {
        const tLeftJoin = table.forUseInLeftJoin();
        return sync(
            this._db
                .selectFrom(tMessage)
                .leftJoin(tLeftJoin)
                .on(tLeftJoin.messageUid.equals(tMessage.uid))
                .select({
                    text: tLeftJoin.caption,
                    lastEditedAt: tMessage.lastEditedAt,
                    createdAt: tMessage.createdAt,
                })
                .where(tMessage.uid.equals(messageUid))
                .executeSelectOne(),
        );
    }

    private _getLastImageMessageEdit(
        table: typeof tMessageImageData,
        messageUid: DbMessageUid,
    ): DbMessageLastEdit {
        const tLeftJoin = table.forUseInLeftJoin();
        return sync(
            this._db
                .selectFrom(tMessage)
                .leftJoin(tLeftJoin)
                .on(tLeftJoin.messageUid.equals(tMessage.uid))
                .select({
                    text: tLeftJoin.caption,
                    lastEditedAt: tMessage.lastEditedAt,
                    createdAt: tMessage.createdAt,
                })
                .where(tMessage.uid.equals(messageUid))
                .executeSelectOne(),
        );
    }

    private _getLastTextMessageEdit(
        table: typeof tMessageTextData,
        messageUid: DbMessageUid,
    ): DbMessageLastEdit {
        const tLeftJoin = table.forUseInLeftJoin();
        return sync(
            this._db
                .selectFrom(tMessage)
                .leftJoin(tLeftJoin)
                .on(tLeftJoin.messageUid.equals(tMessage.uid))
                .select({
                    text: tLeftJoin.text,
                    lastEditedAt: tMessage.lastEditedAt,
                    createdAt: tMessage.createdAt,
                })
                .where(tMessage.uid.equals(messageUid))
                .executeSelectOne(),
        );
    }

    private _getLastEdit(
        type: AnyNonDeletedMessageType,
        messageUid: DbMessageUid,
    ): DbMessageLastEdit {
        switch (type) {
            case 'text':
                return this._getLastTextMessageEdit(tMessageTextData, messageUid);
            case 'file':
                return this._getLastFileMessageEdit(tMessageFileData, messageUid);
            case 'image':
                return this._getLastImageMessageEdit(tMessageImageData, messageUid);
            case 'video':
                return this._getLastVideoMessageEdit(tMessageVideoData, messageUid);
            case 'audio':
                return this._getLastAudioMessageEdit(tMessageAudioData, messageUid);
            default:
                return unreachable(type);
        }
    }

    private _getTableForFileType(type: MediaBasedMessageType): AnyMediaMessageDataTable {
        switch (type) {
            case 'file':
                return tMessageFileData;
            case 'image':
                return tMessageImageData;
            case 'video':
                return tMessageVideoData;
            case 'audio':
                return tMessageAudioData;
            default:
                return unreachable(type);
        }
    }

    private _editMessageTextInDb(
        table: typeof tMessageTextData,
        messageUpdate: Pick<DbMessageEditFor<TextBasedMessageType>, 'text'>,
        messageUid: DbMessageUid,
    ): void {
        sync(
            this._db
                .update(table)
                .set({
                    ...messageUpdate,
                })
                .where(table.messageUid.equalsIfValue(messageUid))
                .executeUpdate(),
        );
    }

    private _editMediaCaptionInDb(
        table: AnyMediaMessageDataTable,
        messageUpdate: Pick<DbMessageEditFor<MediaBasedMessageType>, 'caption'>,
        messageUid: DbMessageUid,
    ): void {
        sync(
            this._db
                .update(table)
                .set({
                    ...messageUpdate,
                })
                .where(table.messageUid.equalsIfValue(messageUid))
                .executeUpdate(),
        );
    }

    /** @inheritdoc */
    public editMessage<TMessageType extends AnyNonDeletedMessageType>(
        messageUid: DbMessageUid,
        type: TMessageType,
        messageUpdate: DbMessageEditFor<TMessageType>,
    ): void {
        const lastEditedAt = pick<DbMessageEditFor<TMessageType>>(messageUpdate, ['lastEditedAt']);

        const typeFromDb = sync(
            this._db
                .selectFrom(tMessage)
                .select({
                    type: tMessage.messageType,
                })
                .where(tMessage.uid.equals(messageUid))
                .executeSelectOne(),
        );

        assert(
            typeFromDb.type === type,
            'The given and the expected type of the edited message do not correspond',
        );
        // Sqlite does not allow updating two tables in a single join transaction.
        // Therefore, we need to do this sequentially
        this._db.syncTransaction(() => {
            // First, we need to check if the message has already been updated once
            const lastEdit = this._getLastEdit(type, messageUid);

            // Message has never been edited before, create a corresponding entry for the first
            // version in the history database.
            if (lastEdit.lastEditedAt === undefined) {
                sync(
                    this._db
                        .insertInto(tMessageHistory)
                        .set({
                            messageUid,
                            editedAt: lastEdit.createdAt,
                            text: lastEdit.text,
                        })
                        .executeInsert(),
                );
            }

            sync(
                this._db
                    .update(tMessage)
                    .set({
                        ...lastEditedAt,
                    })
                    .where(tMessage.uid.equals(messageUid))
                    .executeUpdate(),
            );
            let text: string;
            if (type === MessageType.TEXT) {
                const update = messageUpdate as DbMessageEditFor<TextBasedMessageType>;
                this._editMessageTextInDb(tMessageTextData, update, messageUid);
                text = update.text;
            } else {
                const update = messageUpdate as DbMessageEditFor<MediaBasedMessageType>;
                const table = this._getTableForFileType(type);
                this._editMediaCaptionInDb(table, update, messageUid);
                text = update.caption;
            }

            // Now, we need to add the message into the message version table
            sync(
                this._db
                    .insertInto(tMessageHistory)
                    .set({
                        messageUid,
                        editedAt: messageUpdate.lastEditedAt,
                        text,
                    })
                    .executeInsert(),
            );
        }, this._log);
    }

    /** @inheritdoc */
    public updateMessage(
        conversationUid: DbConversationUid,
        message: DbUpdate<DbAnyNonDeletedMessage, 'type'>,
    ): {deletedFileIds: FileId[]} {
        const messageWithoutReactions = omit<typeof message, 'reactions'>(message, ['reactions']);

        return this._db.syncTransaction(() => {
            // Update common data
            //
            // Note: This makes a sanity-check on the message type and conversation uid by filtering
            //       on it.
            const updated = sync(
                this._db
                    .update(tMessage)
                    .set({
                        ...messageWithoutReactions,
                    })
                    .where(tMessage.uid.equals(message.uid))
                    .and(tMessage.messageType.equals(message.type))
                    .and(tMessage.conversationUid.equals(conversationUid))
                    .executeUpdate(),
            );
            assert(
                updated === 1,
                `Expected to update exactly one message with UID ${message.uid} and type ` +
                    `${message.type}, but we updated ${updated} rows.`,
            );

            // Add reactions.
            //
            // Note: This logic only enables adding or updating reactions, but it cannot remove
            // reactions. This is fine for now, since that's not supported by the protocol anyways.
            // But if we extend the protocol (emoji reactions and removable reactions), we'll need
            // to update the code (probably using diffing).
            for (const reaction of message.reactions ?? []) {
                this.createOrUpdateMessageReaction({
                    ...reaction,
                    messageUid: messageWithoutReactions.uid,
                });
            }

            // Update associated data as well
            //
            // Note: At this point, we can be certain that the message type is correct!
            switch (message.type) {
                case MessageType.TEXT:
                    sync(
                        this._db
                            .update(tMessageTextData)
                            .set(
                                pick<Partial<DbTextMessageFragment>>(message, [
                                    'text',
                                    'quotedMessageId',
                                ]),
                            )
                            .where(tMessageTextData.messageUid.equals(message.uid))
                            .executeUpdate(),
                    );
                    return {deletedFileIds: []};
                case MessageType.FILE: {
                    // Prepare update
                    const update: UpdatableValues<typeof tMessageFileData> = pick<
                        Partial<DbBaseFileMessageFragment>
                    >(message, [
                        'blobId',
                        'thumbnailBlobId',
                        'blobDownloadState',
                        'thumbnailBlobDownloadState',
                        'encryptionKey',
                        'mediaType',
                        'thumbnailMediaType',
                        'fileName',
                        'fileSize',
                        'caption',
                        'correlationId',
                    ]);

                    // Add, update or remove associated file data entries
                    const removedFileDataUids = this._processFileDataChanges(message, update);

                    // Update message file data
                    sync(
                        this._db
                            .update(tMessageFileData)
                            .set(update)
                            .where(tMessageFileData.messageUid.equals(message.uid))
                            .executeUpdate(),
                    );

                    // Delete file data rows that are now unreferenced
                    //
                    // NOTE: This must be called after the db update query! Otherwise rows are still
                    //       referenced and aren't removed.
                    const deletedFileIds =
                        this._deleteFromMessageDataIfUnreferenced(removedFileDataUids);

                    return {deletedFileIds};
                }
                case MessageType.IMAGE: {
                    // Prepare update
                    const update: UpdatableValues<typeof tMessageImageData> = pick<
                        Partial<DbImageMessageFragment>
                    >(message, [
                        'blobId',
                        'thumbnailBlobId',
                        'blobDownloadState',
                        'thumbnailBlobDownloadState',
                        'encryptionKey',
                        'mediaType',
                        'thumbnailMediaType',
                        'fileName',
                        'fileSize',
                        'caption',
                        'correlationId',
                        'renderingType',
                        'animated',
                        'dimensions',
                    ]);

                    // Add, update or remove associated file data entries
                    const removedFileDataUids = this._processFileDataChanges(message, update);

                    // Update message file data
                    sync(
                        this._db
                            .update(tMessageImageData)
                            .set(update)
                            .where(tMessageImageData.messageUid.equals(message.uid))
                            .executeUpdate(),
                    );

                    // Delete file data rows that are now unreferenced
                    //
                    // NOTE: This must be called after the db update query! Otherwise rows are still
                    //       referenced and aren't removed.
                    const deletedFileIds =
                        this._deleteFromMessageDataIfUnreferenced(removedFileDataUids);

                    return {deletedFileIds};
                }
                case MessageType.VIDEO: {
                    // Prepare update
                    const update: UpdatableValues<typeof tMessageVideoData> = pick<
                        Partial<DbVideoMessageFragment>
                    >(message, [
                        'blobId',
                        'thumbnailBlobId',
                        'blobDownloadState',
                        'thumbnailBlobDownloadState',
                        'encryptionKey',
                        'mediaType',
                        'thumbnailMediaType',
                        'fileName',
                        'fileSize',
                        'caption',
                        'correlationId',
                        'duration',
                        'dimensions',
                    ]);

                    // Add, update or remove associated file data entries
                    const removedFileDataUids = this._processFileDataChanges(message, update);

                    // Update message file data
                    sync(
                        this._db
                            .update(tMessageVideoData)
                            .set(update)
                            .where(tMessageVideoData.messageUid.equals(message.uid))
                            .executeUpdate(),
                    );

                    // Delete file data rows that are now unreferenced
                    //
                    // NOTE: This must be called after the db update query! Otherwise rows are still
                    //       referenced and aren't removed.
                    const deletedFileIds =
                        this._deleteFromMessageDataIfUnreferenced(removedFileDataUids);

                    return {deletedFileIds};
                }
                case MessageType.AUDIO: {
                    // Prepare update
                    const update: UpdatableValues<typeof tMessageAudioData> = pick<
                        Partial<DbAudioMessageFragment>
                    >(message, [
                        'blobId',
                        'thumbnailBlobId',
                        'blobDownloadState',
                        'thumbnailBlobDownloadState',
                        'encryptionKey',
                        'mediaType',
                        'thumbnailMediaType',
                        'fileName',
                        'fileSize',
                        'caption',
                        'correlationId',
                        'duration',
                    ]);

                    // Add, update or remove associated file data entries
                    const removedFileDataUids = this._processFileDataChanges(message, update);

                    // Update message file data
                    sync(
                        this._db
                            .update(tMessageAudioData)
                            .set(update)
                            .where(tMessageAudioData.messageUid.equals(message.uid))
                            .executeUpdate(),
                    );

                    // Delete file data rows that are now unreferenced
                    //
                    // NOTE: This must be called after the db update query! Otherwise rows are still
                    //       referenced and aren't removed.
                    const deletedFileIds =
                        this._deleteFromMessageDataIfUnreferenced(removedFileDataUids);

                    return {deletedFileIds};
                }
                default:
                    return unreachable(message);
            }
        }, this._log);
    }

    /** @inheritdoc */
    public updateDeletedMessageTimestamps(
        messageUid: DbMessageUid,
        timestamps: {deliveredAt?: Date} | {readAt: Date},
    ): boolean {
        const rowsUpdated = sync(
            this._db
                .update(tMessage)
                .set(timestamps)
                .where(tMessage.uid.equals(messageUid))
                .and(tMessage.messageType.equals(MessageType.DELETED))
                .executeUpdate(),
        );

        return rowsUpdated > 0;
    }

    private _processFileDataChanges<TDbMediaMessage extends DbAnyMediaMessage>(
        message: Partial<TDbMediaMessage> & Pick<DbAnyMediaMessage, 'type' | 'uid'>,
        update: UpdateSetsForDbMessage<TDbMediaMessage>,
    ): DbFileDataUid[] {
        // To keep the file data table clean and remove entries that aren't referenced
        // anymore, we first need to query the current UIDs.
        let table, query;
        if (message.type === MessageType.AUDIO) {
            table = tMessageAudioData;
            query = {
                fileDataUid: tMessageAudioData.fileDataUid,
                thumbnailFileDataUid: this._db.optionalConst<DbFileDataUid>(
                    null,
                    'custom',
                    CUSTOM_TYPES.FILE_DATA_UID,
                ),
            };
        } else {
            switch (message.type) {
                case MessageType.VIDEO:
                    table = tMessageVideoData;
                    break;
                case MessageType.FILE:
                    table = tMessageFileData;
                    break;
                case MessageType.IMAGE:
                    table = tMessageImageData;
                    break;

                default:
                    unreachable(message.type);
            }
            query = {
                fileDataUid: table.fileDataUid,
                thumbnailFileDataUid: table.thumbnailFileDataUid,
            };
        }
        const previousFileDataUids = sync(
            this._db
                .selectFrom(table)
                .select(query)
                .where(table.messageUid.equalsIfValue(message.uid))
                .executeSelectNoneOrOne(),
        );

        // If necessary, insert new file data rows
        if (message.fileData !== undefined && previousFileDataUids?.fileDataUid === undefined) {
            update.fileDataUid = this._insertFileData(message.fileData);
        }
        if (
            message.thumbnailFileData !== undefined &&
            previousFileDataUids?.thumbnailFileDataUid === undefined
        ) {
            (update as UpdateSetWithThumbnail).thumbnailFileDataUid = this._insertFileData(
                message.thumbnailFileData,
            );
        }

        // If necessary, remove existing file data rows
        const removedFileDataUids: DbFileDataUid[] = [];
        if (
            hasProperty(message, 'fileData') &&
            message.fileData === undefined &&
            previousFileDataUids?.fileDataUid !== undefined
        ) {
            // File data was removed
            removedFileDataUids.push(previousFileDataUids.fileDataUid);
            update.fileDataUid = undefined;
        }
        if (
            hasProperty(message, 'thumbnailFileData') &&
            message.thumbnailFileData === undefined &&
            previousFileDataUids?.thumbnailFileDataUid !== undefined
        ) {
            // Thumbnail file data was removed
            removedFileDataUids.push(previousFileDataUids.thumbnailFileDataUid);
            (update as UpdateSetWithThumbnail).thumbnailFileDataUid = undefined;
        }

        // If necessary, update existing file data rows
        if (message.fileData !== undefined && previousFileDataUids?.fileDataUid !== undefined) {
            const updateInfo = this._updateFileData(
                message.fileData,
                previousFileDataUids.fileDataUid,
            );
            if (updateInfo !== undefined) {
                update.fileDataUid = updateInfo.newUid;
                removedFileDataUids.push(updateInfo.previousUid);
            }
        }
        if (
            message.thumbnailFileData !== undefined &&
            previousFileDataUids?.thumbnailFileDataUid !== undefined
        ) {
            const updateInfo = this._updateFileData(
                message.thumbnailFileData,
                previousFileDataUids.thumbnailFileDataUid,
            );
            if (updateInfo !== undefined) {
                (update as UpdateSetWithThumbnail).thumbnailFileDataUid = updateInfo.newUid;
                removedFileDataUids.push(updateInfo.previousUid);
            }
        }

        return removedFileDataUids;
    }

    /**
     * Return list of all associated file UIDs for the specified {@link message}.
     */
    private _getReferencedFileUidsByMessage(
        message: Pick<DbAnyMessage, 'uid' | 'conversationUid' | 'type'>,
    ): {
        fileDataUid?: DbFileDataUid;
        thumbnailFileDataUid?: DbFileDataUid;
    }[] {
        // Text messages or deleted messages don't have associated file data
        if (message.type === MessageType.TEXT || message.type === MessageType.DELETED) {
            return [];
        }

        // Audio messages don't have a thumbnail, so they need to be queried separately
        if (message.type === MessageType.AUDIO) {
            return sync(
                this._db
                    .selectFrom(tMessageAudioData)
                    .innerJoin(tMessage)
                    .on(tMessage.uid.equals(tMessageAudioData.messageUid))
                    .select({
                        fileDataUid: tMessageAudioData.fileDataUid,
                    })
                    .where(tMessageAudioData.messageUid.equals(message.uid))
                    .and(tMessage.conversationUid.equals(message.conversationUid))
                    .and(tMessageAudioData.fileDataUid.isNotNull())
                    .executeSelectMany(),
            );
        }

        // Note: The query in the following branches is always identical (only the table is
        // different)! If we want to extract it, we need a solution for
        // https://github.com/juanluispaz/ts-sql-query/issues/127
        switch (message.type) {
            case MessageType.FILE: {
                const table = tMessageFileData;
                return sync(
                    this._db
                        .selectFrom(table)
                        .innerJoin(tMessage)
                        .on(tMessage.uid.equals(table.messageUid))
                        .select({
                            fileDataUid: table.fileDataUid,
                            thumbnailFileDataUid: table.thumbnailFileDataUid,
                        })
                        .where(table.messageUid.equals(message.uid))
                        .and(tMessage.conversationUid.equals(message.conversationUid))
                        .and(
                            table.fileDataUid
                                .isNotNull()
                                .or(table.thumbnailFileDataUid.isNotNull()),
                        )
                        .executeSelectMany(),
                );
            }
            case MessageType.IMAGE: {
                const table = tMessageImageData;
                return sync(
                    this._db
                        .selectFrom(table)
                        .innerJoin(tMessage)
                        .on(tMessage.uid.equals(table.messageUid))
                        .select({
                            fileDataUid: table.fileDataUid,
                            thumbnailFileDataUid: table.thumbnailFileDataUid,
                        })
                        .where(table.messageUid.equals(message.uid))
                        .and(tMessage.conversationUid.equals(message.conversationUid))
                        .and(
                            table.fileDataUid
                                .isNotNull()
                                .or(table.thumbnailFileDataUid.isNotNull()),
                        )
                        .executeSelectMany(),
                );
            }
            case MessageType.VIDEO: {
                const table = tMessageVideoData;
                return sync(
                    this._db
                        .selectFrom(table)
                        .innerJoin(tMessage)
                        .on(tMessage.uid.equals(table.messageUid))
                        .select({
                            fileDataUid: table.fileDataUid,
                            thumbnailFileDataUid: table.thumbnailFileDataUid,
                        })
                        .where(table.messageUid.equals(message.uid))
                        .and(tMessage.conversationUid.equals(message.conversationUid))
                        .and(
                            table.fileDataUid
                                .isNotNull()
                                .or(table.thumbnailFileDataUid.isNotNull()),
                        )
                        .executeSelectMany(),
                );
            }
            default:
                return unreachable(message.type);
        }
    }

    /**
     * Return list of all file UIDs associated with any message in the specified conversation.
     */
    private _getReferencedFileUidsByConversation(
        conversationUid: DbConversationUid,
    ): DbFileDataUid[] {
        const audio = sync(
            this._db
                .selectFrom(tMessageAudioData)
                .innerJoin(tMessage)
                .on(tMessage.uid.equals(tMessageAudioData.messageUid))
                .select({
                    fileDataUid: tMessageAudioData.fileDataUid,
                })
                .where(tMessage.conversationUid.equals(conversationUid))
                .and(tMessageAudioData.fileDataUid.isNotNull())
                .executeSelectMany(),
        ).map((val) => ({
            fileDataUid: val.fileDataUid,
            thumbnailFileDataUid: undefined,
        }));

        const files = sync(
            this._db
                .selectFrom(tMessageFileData)
                .innerJoin(tMessage)
                .on(tMessage.uid.equals(tMessageFileData.messageUid))
                .select({
                    fileDataUid: tMessageFileData.fileDataUid,
                    thumbnailFileDataUid: tMessageFileData.thumbnailFileDataUid,
                })
                .where(tMessage.conversationUid.equals(conversationUid))
                .and(
                    tMessageFileData.fileDataUid
                        .isNotNull()
                        .or(tMessageFileData.thumbnailFileDataUid.isNotNull()),
                )
                .union(
                    this._db
                        .selectFrom(tMessageVideoData)
                        .innerJoin(tMessage)
                        .on(tMessage.uid.equals(tMessageVideoData.messageUid))
                        .select({
                            fileDataUid: tMessageVideoData.fileDataUid,
                            thumbnailFileDataUid: tMessageVideoData.thumbnailFileDataUid,
                        })
                        .where(tMessage.conversationUid.equals(conversationUid))
                        .and(
                            tMessageVideoData.fileDataUid
                                .isNotNull()
                                .or(tMessageVideoData.thumbnailFileDataUid.isNotNull()),
                        ),
                )
                .union(
                    this._db
                        .selectFrom(tMessageImageData)
                        .innerJoin(tMessage)
                        .on(tMessage.uid.equals(tMessageImageData.messageUid))
                        .select({
                            fileDataUid: tMessageImageData.fileDataUid,
                            thumbnailFileDataUid: tMessageImageData.thumbnailFileDataUid,
                        })
                        .where(tMessage.conversationUid.equals(conversationUid))
                        .and(
                            tMessageImageData.fileDataUid
                                .isNotNull()
                                .or(tMessageImageData.thumbnailFileDataUid.isNotNull()),
                        ),
                )
                .executeSelectMany(),
        );

        return [...audio, ...files]
            .flatMap((row) => [row.fileDataUid, row.thumbnailFileDataUid])
            .filter(isNotUndefined);
    }

    /**
     * For each of the file data UIDs that is passed in, delete it from the "fileData" table if it
     * is unreferenced.
     *
     * Return the list of {@link FileId}s that were removed from the database.
     */
    private _deleteFromMessageDataIfUnreferenced(fileDataUids: DbFileDataUid[]): FileId[] {
        if (fileDataUids.length === 0) {
            return [];
        }
        const tMessageFileDataJoinable = tMessageFileData.forUseInLeftJoin();
        const tMessageAudioDataJoinable = tMessageAudioData.forUseInLeftJoin();
        const tMessageVideoDataJoinable = tMessageVideoData.forUseInLeftJoin();
        const tMessageImageDataJoinable = tMessageImageData.forUseInLeftJoin();

        const unreferencedFileDataUids = this._db
            .selectFrom(tFileData)
            .leftJoin(tMessageFileDataJoinable)
            .on(
                tFileData.uid
                    .equals(tMessageFileDataJoinable.fileDataUid)
                    .or(tFileData.uid.equals(tMessageFileDataJoinable.thumbnailFileDataUid)),
            )
            .leftJoin(tMessageAudioDataJoinable)
            .on(tFileData.uid.equals(tMessageAudioDataJoinable.fileDataUid))
            .leftJoin(tMessageVideoDataJoinable)
            .on(
                tFileData.uid
                    .equals(tMessageVideoDataJoinable.fileDataUid)
                    .or(tFileData.uid.equals(tMessageVideoDataJoinable.thumbnailFileDataUid)),
            )
            .leftJoin(tMessageImageDataJoinable)
            .on(
                tFileData.uid
                    .equals(tMessageImageDataJoinable.fileDataUid)
                    .or(tFileData.uid.equals(tMessageImageDataJoinable.thumbnailFileDataUid)),
            )
            .where(tFileData.uid.in(fileDataUids))
            .and(tMessageFileDataJoinable.uid.isNull())
            .and(tMessageAudioDataJoinable.uid.isNull())
            .and(tMessageVideoDataJoinable.uid.isNull())
            .and(tMessageImageDataJoinable.uid.isNull())
            .selectOneColumn(tFileData.uid);

        const unreferencedFileIds = sync(
            this._db
                .deleteFrom(tFileData)
                .where(tFileData.uid.in(unreferencedFileDataUids))
                .returningOneColumn(tFileData.fileId)
                .executeDeleteMany(),
        );
        return unreferencedFileIds;
    }

    /** @inheritdoc */
    public removeMessage(
        conversationUid: DbConversationUid,
        uid: DbRemove<DbAnyMessage>,
    ): {removed: boolean; deletedFileIds: FileId[]} {
        const [deletedCount, deletedFileIds] = this._db.syncTransaction(() => {
            // Ensure that target message exists, retrieve message type
            const messageType = sync(
                this._db
                    .selectFrom(tMessage)
                    .selectOneColumn(tMessage.messageType)
                    .where(tMessage.uid.equals(uid))
                    .executeSelectNoneOrOne(),
            );
            if (messageType === null) {
                this._log.error('Tried to remove a message that does not exist in the db');
                return [0, []];
            }

            // In order to clean up unreferenced file data entries, we need to get a list of the
            // file data UIDs that will be deleted.
            const fileDataUidRows = this._getReferencedFileUidsByMessage({
                uid,
                conversationUid,
                type: messageType,
            });

            const fileDataUids = fileDataUidRows
                .flatMap((row) => [row.fileDataUid, row.thumbnailFileDataUid])
                .filter(isNotUndefined);

            // Delete message from database.
            //
            // Note: We only need to delete the row from the `messages` table.
            //       The associated type-specific data will be dropped automatically
            //       because we used ON DELETE CASCADE on all the foreign keys.
            const rowsDeleted = sync(
                this._db
                    .deleteFrom(tMessage)
                    .where(tMessage.uid.equals(uid))
                    .and(tMessage.conversationUid.equals(conversationUid))
                    .executeDelete(),
            );
            assert(
                rowsDeleted < 2,
                `Expected to remove at most one message but removed ${rowsDeleted}`,
            );

            // After deleting the message file data, we can now determine whether there are now
            // unreferenced file data entries that should be cleaned up.
            //
            // Note: Deleting the files from the file storage is the responsibility of the caller.
            const unreferencedFileIds = this._deleteFromMessageDataIfUnreferenced(fileDataUids);

            return [rowsDeleted, unreferencedFileIds];
        }, this._log);

        return {
            removed: deletedCount === 1,
            deletedFileIds,
        };
    }

    /** @inheritdoc */
    public markMessageAsDeleted(
        conversationUid: DbConversationUid,
        uid: DbMessageUid,
        deletedAt: Date,
    ): {deletedMessage: DbDeletedMessage | undefined; deletedFileIds: FileId[]} {
        const [deletedMessage, deletedFileIds] = this._db.syncTransaction(() => {
            const typeQueryResult = sync(
                this._db
                    .selectFrom(tMessage)
                    .select({
                        type: tMessage.messageType,
                    })
                    .where(tMessage.uid.equals(uid))
                    .executeSelectNoneOrOne(),
            );

            if (typeQueryResult === null) {
                this._log.warn('The message to be deleted was not found');
                return [null, []];
            }
            const type = typeQueryResult.type;
            if (type === MessageType.DELETED) {
                this._log.warn('Cannot delete a message of type deleted');
                return [null, []];
            }
            // In order to clean up unreferenced file data entries, we need to get a list of the
            // file data UIDs that will be deleted.
            const fileDataUidRows = this._getReferencedFileUidsByMessage({
                uid,
                conversationUid,
                type,
            });

            const fileDataUids = fileDataUidRows
                .flatMap((row) => [row.fileDataUid, row.thumbnailFileDataUid])
                .filter(isNotUndefined);

            // Delete the corresponding entry in the message subtable.
            const table =
                type === MessageType.TEXT ? tMessageTextData : this._getTableForFileType(type);
            sync(
                this._db
                    .deleteFrom(table)
                    .where(table.messageUid.equalsIfValue(uid))
                    .executeDelete(),
            );
            // Delete all message reactions.
            sync(
                this._db
                    .deleteFrom(tMessageReaction)
                    .where(tMessageReaction.messageUid.equalsIfValue(uid))
                    .executeDelete(),
            );

            // Delete the message history.
            sync(
                this._db
                    .deleteFrom(tMessageHistory)
                    .where(tMessageHistory.messageUid.equalsIfValue(uid))
                    .executeDelete(),
            );

            // After deleting the message file data, we can now determine whether there are now
            // unreferenced file data entries that should be cleaned up.
            //
            // Note: Deleting the files from the file storage is the responsibility of the caller.
            const unreferencedFileIds = this._deleteFromMessageDataIfUnreferenced(fileDataUids);

            // Now change the message type and all associated data in the main table of the deleted message.
            const dbDeletedMessage = sync(
                this._db
                    .update(tMessage)
                    .set({
                        lastEditedAt: undefined,
                        raw: undefined,
                        messageType: MessageType.DELETED,
                        deletedAt,
                    })
                    .where(tMessage.uid.equalsIfValue(uid))
                    .returning({
                        uid: tMessage.uid,
                        id: tMessage.messageId,
                        senderContactUid: tMessage.senderContactUid,
                        conversationUid: tMessage.conversationUid,
                        createdAt: tMessage.createdAt,
                        processedAt: tMessage.processedAt,
                        deliveredAt: tMessage.deliveredAt,
                        readAt: tMessage.readAt,
                        threadId: tMessage.threadId,
                        deletedAt: tMessage.deletedAt,
                        ordinal: tMessage.processedAt.valueWhenNull(tMessage.createdAt).getTime(),
                    })
                    .executeUpdateNoneOrOne(),
            );
            return [dbDeletedMessage, unreferencedFileIds];
        }, this._log);
        if (deletedMessage === null) {
            return {deletedMessage: undefined, deletedFileIds: []};
        }
        return {
            deletedMessage: {
                ...deletedMessage,
                type: MessageType.DELETED,
                deletedAt: unwrap(
                    deletedMessage.deletedAt,
                    'A message of type deleted must havea deletedAt timestamp',
                ),
            },
            deletedFileIds,
        };
    }

    /** @inheritdoc */
    public removeAllMessages(
        conversationUid: DbConversationUid,
        resetLastUpdate: boolean,
    ): {removed: u53; deletedFileIds: FileId[]} {
        return this._db.syncTransaction(() => {
            // In order to clean up unreferenced file data entries, we need to get a list of the file
            // data UIDs that will be deleted.
            const fileDataUids = this._getReferencedFileUidsByConversation(conversationUid);

            // Remove all messages
            const removed = sync(
                this._db
                    .deleteFrom(tMessage)
                    .where(tMessage.conversationUid.equals(conversationUid))
                    .executeDelete(),
            );

            // Reset `lastUpdate` if requested
            if (resetLastUpdate) {
                sync(
                    this._db
                        .update(tConversation)
                        .set({lastUpdate: undefined})
                        .where(tConversation.uid.equals(conversationUid))
                        .executeUpdate(),
                );
            }

            // After deleting the message file data, we can now determine whether there are now
            // unreferenced file data entries that should be cleaned up.
            //
            // Note: Deleting the files from the file storage is the responsibility of the caller.
            const deletedFileIds = this._deleteFromMessageDataIfUnreferenced(fileDataUids);

            return {removed, deletedFileIds};
        }, this._log);
    }

    /** @inheritdoc */
    public removeStatusMessage(uid: DbRemove<DbStatusMessage>): boolean {
        const removed = sync(
            this._db
                .deleteFrom(tStatusMessage)
                .where(tStatusMessage.uid.equals(uid))
                .executeDelete(),
        );
        return removed > 0;
    }

    /** @inheritdoc */
    public removeAllStatusMessagesOfConversation(uid: DbConversationUid): u53 {
        return sync(
            this._db
                .deleteFrom(tStatusMessage)
                .where(tStatusMessage.conversationUid.equals(uid))
                .executeDelete(),
        );
    }

    public markConversationAsRead(
        conversationUid: DbConversationUid,
        readAt: Date,
    ): DbList<DbAnyMessage, 'uid' | 'id'> {
        return sync(
            this._db
                .update(tMessage)
                .set({readAt})
                .where(
                    tMessage.conversationUid
                        .equals(conversationUid)
                        .and(tMessage.senderContactUid.isNotNull())
                        .and(tMessage.readAt.isNull()),
                )
                .returning({uid: tMessage.uid, id: tMessage.messageId})
                .executeUpdateMany(),
        );
    }

    private _getMessagesByOrdinal(
        conversationUid: DbConversationUid,
        ordinal: u53,
        direction: MessageQueryDirection,
        limit?: u53,
    ): DbList<DbAnyMessage, 'uid'> {
        // Determine ordering and dynamic WHERE clause: Filter by conversation
        // and by processedAt timestamp.
        let processedAtCondition;
        let orderByMode: 'asc' | 'desc';
        switch (direction) {
            case MessageQueryDirection.OLDER:
                orderByMode = 'desc';
                processedAtCondition = tMessage.processedAtTimestamp.lessOrEquals(ordinal).or(
                    // Handle case that processedAt was not (yet) set (outbound messages)
                    tMessage.processedAtTimestamp
                        .isNull()
                        .and(tMessage.createdAtTimestamp.lessOrEquals(ordinal)),
                );
                break;

            case MessageQueryDirection.NEWER:
                orderByMode = 'asc';
                processedAtCondition = tMessage.processedAtTimestamp.greaterOrEquals(ordinal).or(
                    // Handle case that processedAt was not (yet) set (outbound messages)
                    tMessage.processedAtTimestamp
                        .isNull()
                        .and(tMessage.createdAtTimestamp.greaterOrEquals(ordinal)),
                );
                break;

            default:
                unreachable(direction);
        }

        return sync(
            this._db
                .selectFrom(tMessage)
                .select({
                    uid: tMessage.uid,
                    // TODO(DESK-1445): Implement ordinal using virtual columns
                    ordinal: tMessage.processedAtTimestamp.valueWhenNull(
                        tMessage.createdAtTimestamp,
                    ),
                })
                .where(tMessage.conversationUid.equals(conversationUid).and(processedAtCondition))
                // TODO(DESK-296): Order correctly
                .orderBy('ordinal', orderByMode)
                .limitIfValue(limit)
                .executeSelectMany(),
        );
    }

    private _getStatusMessagesByOrdinal(
        conversationUid: DbConversationUid,
        ordinal: u53,
        direction: MessageQueryDirection,
        limit?: u53,
    ): DbList<DbStatusMessage, 'uid'> {
        // Determine ordering and dynamic WHERE clause: Filter by conversation
        // and by processedAt timestamp.
        let createdAtCondition;
        let orderByMode: 'asc' | 'desc';
        switch (direction) {
            case MessageQueryDirection.OLDER:
                orderByMode = 'desc';
                createdAtCondition = tStatusMessage.createdAtTimestamp.lessOrEquals(ordinal);
                break;
            case MessageQueryDirection.NEWER:
                orderByMode = 'asc';
                createdAtCondition = tStatusMessage.createdAtTimestamp.greaterOrEquals(ordinal);

                break;
            default:
                unreachable(direction);
        }

        return sync(
            this._db
                .selectFrom(tStatusMessage)
                .select({
                    uid: tStatusMessage.uid,
                    ordinal: tStatusMessage.createdAtTimestamp,
                })
                .where(
                    tStatusMessage.conversationUid.equals(conversationUid).and(createdAtCondition),
                )
                .orderBy('ordinal', orderByMode)
                .limitIfValue(limit)
                .executeSelectMany(),
        );
    }

    /** @inheritdoc */
    public getMessageUids(
        conversationUid: DbConversationUid,
        limit?: u53,
        reference?: {
            readonly ordinal: u53;
            readonly direction: MessageQueryDirection;
        },
    ): DbList<DbAnyMessage, 'uid'> {
        // Fields to select
        const selectFields = {
            uid: tMessage.uid,
            ordinal: tMessage.processedAtTimestamp.valueWhenNull(tMessage.createdAtTimestamp),
        };

        // If the reference UID is undefined, we start at the newest message.
        if (reference === undefined) {
            return sync(
                this._db
                    .selectFrom(tMessage)
                    .select(selectFields)
                    .where(tMessage.conversationUid.equals(conversationUid))
                    // TODO(DESK-296): Order correctly
                    .orderBy('ordinal', 'desc')
                    .limitIfValue(limit)
                    .executeSelectMany(),
            );
        }

        return this._getMessagesByOrdinal(
            conversationUid,
            reference.ordinal,
            reference.direction,
            limit,
        );
    }

    /** @inheritdoc */
    public getStatusMessageUids(
        conversationUid: DbConversationUid,
        limit?: u53,
        reference?: {
            readonly ordinal: u53;
            readonly direction: MessageQueryDirection;
        },
    ): DbList<DbStatusMessage, 'uid'> {
        // Fields to select
        const selectFields = {
            uid: tStatusMessage.uid,
            ordinal: tStatusMessage.createdAtTimestamp,
        };

        // If the reference UID is undefined, we start at the newest message.
        if (reference === undefined) {
            return sync(
                this._db
                    .selectFrom(tStatusMessage)
                    .select(selectFields)
                    .where(tStatusMessage.conversationUid.equals(conversationUid))
                    .orderBy('ordinal', 'desc')
                    .limitIfValue(limit)
                    .executeSelectMany(),
            );
        }

        return this._getStatusMessagesByOrdinal(
            conversationUid,
            reference.ordinal,
            reference.direction,
            limit,
        );
    }

    /** @inheritdoc */
    public getConversationMessageCount(conversationUid: DbConversationUid): u53 {
        return sync(
            this._db
                .selectFrom(tMessage)
                .where(tMessage.conversationUid.equals(conversationUid))
                .selectCountAll()
                .executeSelectOne(),
        );
    }

    /** @inheritdoc */
    public getConversationStatusMessageCount(conversationUid: DbConversationUid): u53 {
        return sync(
            this._db
                .selectFrom(tStatusMessage)
                .where(tStatusMessage.conversationUid.equals(conversationUid))
                .selectCountAll()
                .executeSelectOne(),
        );
    }

    /** @inheritdoc */
    public setSettings<TKey extends keyof Settings>(
        category: TKey,
        settings: Settings[TKey],
    ): Settings[TKey] {
        const settingsBytes: Uint8Array = SETTINGS_CODEC[category].encode(settings);

        sync(
            this._db
                .insertInto(tSettings)
                .set({category, settingsBytes})
                .onConflictOn(tSettings.category)
                .doUpdateSet({settingsBytes})
                .executeInsert(),
        );

        return settings;
    }

    /** @inheritdoc */
    public getSettings<TKey extends keyof Settings>(category: TKey): Settings[TKey] | undefined {
        const settingsBytes = sync(
            this._db
                .selectFrom(tSettings)
                .where(tSettings.category.equals(category))
                .selectOneColumn(tSettings.settingsBytes)
                .executeSelectNoneOrOne(),
        );

        if (settingsBytes === null) {
            return undefined;
        }

        return SETTINGS_CODEC[category].decode(settingsBytes);
    }

    /** @inheritdoc */
    public createStatusMessage(
        statusMessage: DbCreateStatusMessage<DbStatusMessage>,
    ): DbCreated<DbStatusMessage> {
        const uid = sync(
            this._db
                .insertInto(tStatusMessage)
                .set({
                    conversationUid: statusMessage.conversationUid,
                    type: statusMessage.type,
                    statusBytes: statusMessage.statusBytes,
                    createdAt: statusMessage.createdAt,
                })
                .returningLastInsertedId()
                .executeInsert(),
        );
        return uid;
    }

    /** @inheritdoc */
    public getStatusMessagesOfConversation(
        conversationUid: DbConversationUid,
    ): Omit<DbStatusMessage, 'conversationUid' | 'id' | 'ordinal'>[] {
        return sync(
            this._db
                .selectFrom(tStatusMessage)
                .where(tStatusMessage.conversationUid.equals(conversationUid))
                .select({
                    uid: tStatusMessage.uid,
                    type: tStatusMessage.type,
                    createdAt: tStatusMessage.createdAt,
                    createdAtTimestamp: tStatusMessage.createdAtTimestamp,
                    statusBytes: tStatusMessage.statusBytes,
                })
                .executeSelectMany(),
        );
    }

    /** @inheritdoc */
    public updateGlobalProperty<TKey extends GlobalPropertyKey>(
        key: TKey,
        value: Uint8Array,
    ): void {
        sync(
            this._db
                .update(tGlobalProperty)
                .set({value})
                .where(tGlobalProperty.key.equals(key))
                .executeUpdate(),
        );
    }
    /** @inheritdoc */
    public createGlobalProperty<TKey extends GlobalPropertyKey>(
        key: TKey,
        value: Uint8Array,
    ): DbCreated<DbGlobalProperty<TKey>> {
        const uid = sync(
            this._db
                .insertInto(tGlobalProperty)
                .set({key, value})
                .returningLastInsertedId()
                .executeInsert(),
        );

        return uid;
    }
    /** @inheritdoc */
    public getGlobalProperty<TKey extends GlobalPropertyKey>(
        key: TKey,
    ): DbGet<DbGlobalProperty<TKey>> {
        const queryResult = sync(
            this._db
                .selectFrom(tGlobalProperty)
                .where(tGlobalProperty.key.equals(key))
                .select({
                    uid: tGlobalProperty.uid,
                    value: tGlobalProperty.value,
                })
                .executeSelectNoneOrOne(),
        );
        if (queryResult === null) {
            return undefined;
        }
        return {...queryResult, key};
    }

    /** @inheritdoc */
    public addNonce(scope: NonceScope, nonce: NonceHash): DbNonceUid {
        const uid = sync(
            this._db
                .insertInto(tNonce)
                .set({scope, nonce})
                .returningLastInsertedId()
                .executeInsert(),
        );

        return uid;
    }

    /** @inheritdoc */
    public addNonces(scope: NonceScope, nonces: NonceHash[]): void {
        const values: {
            readonly scope: NonceScope;
            readonly nonce: NonceHash;
        }[] = nonces.map((nonce) => ({
            scope,
            nonce,
        }));

        // Insert nonces in chunks of 5000 to avoid running into the limit imposed by SQLite's
        // SQLITE_MAX_VARIABLE_NUMBER parameter.
        const chunks = chunk(values, 5000);

        for (const [index, valuesChunk] of chunks.entries()) {
            this._log.debug(
                `Inserting chunk ${index} with ${valuesChunk.length} entries into the nonce database`,
            );

            sync(this._db.insertInto(tNonce).values(valuesChunk).executeInsert());
        }
    }

    /** @inheritdoc */
    public hasNonce(scope: NonceScope, nonce: NonceHash): DbHas<DbNonce> {
        return (
            sync(
                this._db
                    .selectFrom(tNonce)
                    .selectOneColumn(tNonce.uid)
                    .where(tNonce.scope.equals(scope).and(tNonce.nonce.equals(nonce)))
                    .executeSelectNoneOrOne(),
            ) ?? undefined
        );
    }

    /** @inheritdoc */
    public getAllNonces(scope: NonceScope): NonceHash[] {
        return sync(
            this._db
                .selectFrom(tNonce)
                .selectOneColumn(tNonce.nonce)
                .where(tNonce.scope.equals(scope))
                .executeSelectMany(),
        );
    }

    /* eslint-enable @typescript-eslint/member-ordering */
}
