import DatabaseConstructor, {type Database} from 'better-sqlcipher';
import {SynchronousPromise} from 'synchronous-promise';
import {type DynamicCondition} from 'ts-sql-query/expressions/dynamicConditionUsingFilters';
import {ConsoleLogQueryRunner} from 'ts-sql-query/queryRunners/ConsoleLogQueryRunner';
import {type QueryRunner} from 'ts-sql-query/queryRunners/QueryRunner';
import {type ColumnsForSetOf} from 'ts-sql-query/utils/tableOrViewUtils';

import {
    type DatabaseBackend,
    type DbAnyMessage,
    type DbContact,
    type DbContactUid,
    type DbConversation,
    type DbConversationUid,
    type DbCreate,
    type DbCreateConversationMixin,
    type DbCreated,
    type DbDistributionListUid,
    type DbFileMessage,
    type DbGet,
    type DbGlobalProperty,
    type DbGroup,
    type DbGroupUid,
    type DbHas,
    type DbList,
    type DbMessageCommon,
    type DbMessageUid,
    type DbReceiverLookup,
    type DbRemove,
    type DbTextMessage,
    type DbUnreadMessageCountMixin,
    type DbUpdate,
    type RawDatabaseKey,
} from '~/common/db';
import {
    type GlobalPropertyKey,
    type MessageReaction,
    GroupUserState,
    MessageQueryDirection,
    MessageType,
    ReceiverType,
} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type GroupId, type IdentityString, type MessageId} from '~/common/network/types';
import {type Settings, SETTINGS_CODEC} from '~/common/settings';
import {type u53, type u64} from '~/common/types';
import {assert, assertUnreachable, unreachable} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {hasProperty} from '~/common/utils/object';

import {DBConnection} from './connection';
import {MigrationHelper} from './migrations';
import {BetterSqlCipherQueryRunner} from './query-runner';
import {sync} from './sync';
import {
    tContact,
    tConversation,
    tGlobalProperty,
    tGroup,
    tGroupMember,
    tMessage,
    tMessageFileData,
    tMessageTextData,
    tSettings,
} from './tables';

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

    private constructor(
        private readonly _log: Logger,
        private readonly _migrationHelper: MigrationHelper,
        dbPath: string,
        dbKey: RawDatabaseKey,
    ) {
        // Determine verbose logging adapter for (mostly) echoed SQL commands
        let verbose;
        if (import.meta.env.DEBUG && import.meta.env.VERBOSE_LOGGING.DB) {
            verbose = (message: string, ...args: readonly unknown[]) => {
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
        const provider = this._rawDb.pragma('cipher_provider', {simple: true});
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
        if (this._rawDb.prepare('SELECT count(*) FROM sqlite_master').all().length !== 1) {
            throw new Error('Database file corrupt or invalid key');
        }

        // Ensure we're using safe integers (bigint) by default
        this._rawDb.defaultSafeIntegers();

        // Whether to enable SQL query logging
        // TODO(WEBMD-434): This should be part of a config flag!
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
    public selftest(): void {
        const tableName = 'contacts';
        const contactsTableFound: Record<string, u64> = this._rawDb
            .prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='table' AND name=?;")
            .get(tableName);
        if (contactsTableFound.count !== 1n) {
            throw new Error(`Database self-test failed: Table ${tableName} not found`);
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
                    notificationTriggerPolicyOverrideValue:
                        tContact.notificationTriggerPolicyOverride,
                    notificationTriggerPolicyOverrideExpiresAt:
                        tContact.notificationTriggerPolicyOverrideExpiresAt,
                    notificationSoundPolicyOverride: tContact.notificationSoundPolicyOverride,
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
            // TODO(WEBMD-770): Ensure that group messages don't get silently deleted when removing a contact
            sync(
                this._db
                    .deleteFrom(tMessage)
                    .where(tMessage.senderContactUid.equals(uid))
                    .executeDelete(),
            );

            // Delete all inactive groups where the contact to be deleted is the creator. Note: This
            // will not update the corresponding stores, so that the UI might be inconsistent until
            // reload.
            // TODO(WEBMD-770): Do not automatically delete this groups.
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
                    // TODO(WEBMD-770): Do not take into account only active groups
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
        message: DbCreate<DbMessageCommon<T>>,
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
                    lastReaction: message.lastReaction?.type,
                    lastReactionAt: message.lastReaction?.at,
                    raw: message.raw,
                    messageType: message.type,
                    threadId: message.threadId,
                })
                .returningLastInsertedId()
                .executeInsert(),
        );
    }

    /** @inheritdoc */
    public createTextMessage(message: DbCreate<DbTextMessage>): DbCreated<DbTextMessage> {
        return this._db.syncTransaction(() => {
            // Common message
            const messageUid: DbMessageUid = this._insertCommonMessageData(message);

            // Text data
            sync(
                this._db
                    .insertInto(tMessageTextData)
                    .set({messageUid, text: message.text})
                    .executeInsert(),
            );

            // Note: Returning the UID of the main message, not of the messageTextData
            return messageUid;
        }, this._log);
    }

    /** @inheritdoc */
    public createFileMessage(message: DbCreate<DbFileMessage>): DbCreated<DbFileMessage> {
        return this._db.syncTransaction(() => {
            // Common message
            const messageUid: DbMessageUid = this._insertCommonMessageData(message);

            // File data
            sync(
                this._db
                    .insertInto(tMessageFileData)
                    .set({
                        messageUid,
                        blobId: message.blobId,
                        thumbnailBlobId: message.thumbnailBlobId,
                        encryptionKey: message.encryptionKey,
                        fileId: message.fileId,
                        thumbnailFileId: message.thumbnailFileId,
                        mediaType: message.mediaType,
                        thumbnailMediaType: message.thumbnailMediaType,
                        fileName: message.fileName,
                        fileSize: message.fileSize,
                        caption: message.caption,
                        correlationId: message.correlationId,
                    })
                    .executeInsert(),
            );

            // Note: Returning the UID of the main message, not of the messageFileData
            return messageUid;
        }, this._log);
    }

    /** @inheritdoc */
    public hasMessageByUid(uid: DbMessageUid): boolean {
        return (
            sync(
                this._db
                    .selectFrom(tMessage)
                    .select({uid: tMessage.uid})
                    .where(tMessage.uid.equals(uid))
                    .executeSelectNoneOrOne(),
            ) !== null
        );
    }

    /** @inheritdoc */
    /**
     * If the message ID exists in the conversation, return its UID.
     */
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

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private _getCommonMessageSelector() {
        return this._db.selectFrom(tMessage).select({
            uid: tMessage.uid,
            id: tMessage.messageId,
            senderContactUid: tMessage.senderContactUid,
            conversationUid: tMessage.conversationUid,
            createdAt: tMessage.createdAt,
            processedAt: tMessage.processedAt,
            deliveredAt: tMessage.deliveredAt,
            readAt: tMessage.readAt,
            lastReaction: tMessage.lastReaction,
            lastReactionAt: tMessage.lastReactionAt,
            raw: tMessage.raw,
            type: tMessage.messageType,
            threadId: tMessage.threadId,
        });
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private _getMessage<TType extends MessageType>(
        common: Omit<DbMessageCommon<TType>, 'lastReaction'> & {
            lastReaction?: MessageReaction | undefined;
            lastReactionAt?: Date | undefined;
        },
    ): DbGet<DbAnyMessage> {
        // Convert last reaction
        let lastReaction: DbMessageCommon<TType>['lastReaction'] = undefined;
        if (common.lastReaction !== undefined && common.lastReactionAt !== undefined) {
            lastReaction = {
                type: common.lastReaction,
                at: common.lastReactionAt,
            };
        }

        // Depending on type, fetch appropriate data
        switch (common.type) {
            case MessageType.TEXT: {
                const text = sync(
                    this._db
                        .selectFrom(tMessageTextData)
                        .selectOneColumn(tMessageTextData.text)
                        .where(tMessageTextData.messageUid.equals(common.uid))
                        .executeSelectOne(),
                );
                return {
                    ...common,
                    lastReaction,
                    type: MessageType.TEXT,
                    text,
                };
            }
            case MessageType.FILE: {
                const file = sync(
                    this._db
                        .selectFrom(tMessageFileData)
                        .select({
                            blobId: tMessageFileData.blobId,
                            thumbnailBlobId: tMessageFileData.thumbnailBlobId,
                            encryptionKey: tMessageFileData.encryptionKey,
                            fileId: tMessageFileData.fileId,
                            thumbnailFileId: tMessageFileData.thumbnailFileId,
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
                    lastReaction,
                    type: MessageType.FILE,
                    ...file,
                };
            }
            default:
                return unreachable(common.type, new Error(`Unknown message type ${common.type}`));
        }
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
    public getLastMessage(conversationUid: DbConversationUid): DbGet<DbAnyMessage> {
        const common = sync(
            this._getCommonMessageSelector()
                .where(tMessage.conversationUid.equals(conversationUid))
                // TODO(WEBMD-296): Order correctly
                .orderBy('uid', 'desc')
                .limit(1)
                .executeSelectNoneOrOne(),
        );
        if (common === null) {
            return undefined;
        }
        return this._getMessage(common);
    }

    /** @inheritdoc */
    public updateMessage(
        conversationUid: DbConversationUid,
        message: DbUpdate<DbAnyMessage, 'type'>,
    ): void {
        return this._db.syncTransaction(() => {
            // Update common data
            //
            // Note: This makes a sanity-check on the message type by filtering on it.
            const updated = sync(
                this._db
                    .update(tMessage)
                    .set({
                        ...message,
                        lastReaction: message.lastReaction?.type,
                        lastReactionAt: message.lastReaction?.at,
                    })
                    .ignoreIfSet(
                        ...(!hasProperty(message, 'lastReaction')
                            ? (['lastReaction', 'lastReactionAt'] as const)
                            : ([] as const)),
                    )
                    .where(tMessage.uid.equals(message.uid))
                    .and(tMessage.messageType.equals(message.type))
                    .executeUpdate(),
            );
            assert(
                updated < 2,
                `Expected to update exactly one message with UID ${message.uid} and type ` +
                    `${message.type}, but we updated ${updated} rows.`,
            );

            // Update associated data as well
            //
            // Note: At this point, we can be certain that the message type is correct!
            let table: typeof tMessageTextData | typeof tMessageFileData;
            switch (message.type) {
                case MessageType.TEXT:
                    table = tMessageTextData;
                    break;
                case MessageType.FILE:
                    table = tMessageFileData;
                    break;
                default:
                    unreachable(message);
            }
            sync(
                this._db
                    .update(table)
                    .set(message)
                    .where(table.messageUid.equals(message.uid))
                    .executeUpdate(),
            );
        }, this._log);
    }

    /** @inheritdoc */
    public removeMessage(conversationUid: DbConversationUid, uid: DbRemove<DbAnyMessage>): boolean {
        // Note: We only need to delete the row from the `messages` table.
        //       The associated type-specific data will be dropped automatically
        //       because we used ON DELETE CASCADE on all the foreign keys.
        const deletedCount = sync(
            this._db.deleteFrom(tMessage).where(tMessage.uid.equals(uid)).executeDelete(),
        );

        // Sanity check
        assert(
            deletedCount < 2,
            `Expected to remove at most one message but removed ${deletedCount}`,
        );
        return deletedCount === 1;
    }

    public removeAllMessages(conversationUid: DbConversationUid, resetLastUpdate: boolean): void {
        // Remove all messages
        sync(
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
    }

    /** @inheritdoc */
    public getMessageUids(
        conversationUid: DbConversationUid,
        limit?: u53,
        reference?: {
            readonly uid: DbMessageUid;
            readonly direction: MessageQueryDirection;
        },
    ): DbList<DbAnyMessage, 'uid'> {
        // Fields to select
        const selectFields = {
            uid: tMessage.uid,
            conversationUid: tMessage.conversationUid,
            processedAt: tMessage.processedAt,
        };

        // If the reference UID is undefined, we start at the newest message.
        if (reference === undefined) {
            return sync(
                this._db
                    .selectFrom(tMessage)
                    .select(selectFields)
                    .where(tMessage.conversationUid.equals(conversationUid))
                    // TODO(WEBMD-296): Order correctly
                    .orderBy('uid', 'desc')
                    .limitIfValue(limit)
                    .executeSelectMany(),
            );
        }

        // Get second reference on messages table, so we can join on the table itself
        const tMessage2 = tMessage.as('messages2');

        // Determine ordering and dynamic WHERE clause: Filter by conversation
        // and by processedAt timestamp.
        const filter: DynamicCondition<{
            conversationUid: [type: 'custom', filter: DbConversationUid];
            processedAt: 'localDateTime';
        }> = {
            conversationUid: {equals: conversationUid},
        };
        let orderByMode: 'asc' | 'desc';
        switch (reference.direction) {
            case MessageQueryDirection.OLDER:
                orderByMode = 'desc';
                // @ts-expect-error TODO!
                filter.processedAt = {lessOrEquals: tMessage2.processedAt};
                break;
            case MessageQueryDirection.NEWER:
                orderByMode = 'asc';
                // @ts-expect-error TODO!
                filter.processedAt = {greaterOrEquals: tMessage2.processedAt};
                break;
            default:
                unreachable(reference.direction);
        }
        const dynamicWhere = this._db.dynamicConditionFor(selectFields).withValues(filter);

        // Run query: Join the messages table on itself. This way, every row
        // has access to the information of the reference row.
        return sync(
            this._db
                .selectFrom(tMessage)
                .join(tMessage2)
                .on(
                    tMessage2.conversationUid
                        .equals(tMessage.conversationUid)
                        .and(tMessage2.uid.equals(reference.uid)),
                )
                .select(selectFields)
                .where(dynamicWhere)
                // TODO(WEBMD-296): Order correctly
                .orderBy('uid', orderByMode)
                .limitIfValue(limit)
                .executeSelectMany(),
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
    public getSettingsWithDefaults<TKey extends keyof Settings>(
        category: TKey,
        defaults: Settings[TKey],
    ): Settings[TKey] {
        return {
            ...defaults,
            ...this.getSettings(category),
        };
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

    /* eslint-enable @typescript-eslint/member-ordering */
}
