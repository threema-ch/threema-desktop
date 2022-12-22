import {expect} from 'chai';

import {type PublicKey, NACL_CONSTANTS} from '~/common/crypto';
import {randomString} from '~/common/crypto/random';
import {
    type DatabaseBackend,
    type DbAnyMessage,
    type DbContactUid,
    type DbConversationUid,
    type DbCreate,
    type DbCreateConversationMixin,
    type DbGroup,
    type DbGroupUid,
    type DbMessageCommon,
    type DbMessageUid,
    type DbReceiverLookup,
} from '~/common/db';
import {
    type NotificationSoundPolicy,
    AcquaintanceLevel,
    ActivityState,
    ContactNotificationTriggerPolicy,
    ConversationCategory,
    ConversationVisibility,
    FeatureMaskFlag,
    GroupNotificationTriggerPolicy,
    GroupUserState,
    IdentityType,
    MessageQueryDirection,
    MessageReaction,
    MessageType,
    ReceiverType,
    SyncState,
    VerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import {type FileId, FILE_ID_LENGTH_BYTES} from '~/common/file-storage';
import {type BlobId, BLOB_ID_LENGTH} from '~/common/network/protocol/blob';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import {
    type FeatureMask,
    type GroupId,
    type IdentityString,
    type MessageId,
    ensureIdentityString,
    ensurePublicNickname,
} from '~/common/network/types';
import {type RawBlobKey, wrapRawBlobKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array, type u53, type u64} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {pseudoRandomBytes} from '~/test/mocha/common/utils';

/**
 * Available features of the database backend.
 */
export interface DatabaseBackendFeatures {
    readonly supportsForeignKeyConstraints: boolean;
    // TODO(WEBMD-296): Add thread handling to in-memory db, then remove this
    readonly doesNotImplementThreadIdTodoRemoveThis?: true;
}

// Minimal crypto backend
const crypto = {randomBytes: pseudoRandomBytes};

/**
 * Create a contact with optional default data.
 */
export function makeContact(
    db: DatabaseBackend,
    init: {
        type?: ReceiverType;
        identity?: string;
        publicKey?: ReadonlyUint8Array;
        createdAt?: Date;
        firstName?: string;
        lastName?: string;
        nickname?: string;
        verificationLevel?: VerificationLevel;
        workVerificationLevel?: WorkVerificationLevel;
        identityType?: IdentityType;
        acquaintanceLevel?: AcquaintanceLevel;
        activityState?: ActivityState;
        featureMask?: FeatureMask;
        syncState?: SyncState;
        notificationTriggerPolicyOverride?: {
            readonly policy: ContactNotificationTriggerPolicy;
            readonly expiresAt?: Date;
        };
        notificationSoundPolicyOverride?: NotificationSoundPolicy;
        category?: ConversationCategory;
        visibility?: ConversationVisibility;
    },
): DbContactUid {
    return db.createContact({
        type: ReceiverType.CONTACT,
        identity: (init.identity ?? 'TESTTEST') as IdentityString,
        publicKey: (init.publicKey ??
            crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH))) as PublicKey,
        createdAt: init.createdAt ?? new Date(),
        firstName: init.firstName ?? 'Tom',
        lastName: init.lastName ?? 'Haverford',
        nickname: init.nickname ?? 'Tommy',
        colorIndex: 0,
        verificationLevel: init.verificationLevel ?? VerificationLevel.UNVERIFIED,
        workVerificationLevel: init.workVerificationLevel ?? WorkVerificationLevel.NONE,
        identityType: init.identityType ?? IdentityType.REGULAR,
        acquaintanceLevel: init.acquaintanceLevel ?? AcquaintanceLevel.DIRECT,
        activityState: init.activityState ?? ActivityState.ACTIVE,
        featureMask: init.featureMask ?? (FeatureMaskFlag.NONE as FeatureMask),
        syncState: init.syncState ?? SyncState.INITIAL,
        notificationTriggerPolicyOverride: init.notificationTriggerPolicyOverride,
        notificationSoundPolicyOverride: init.notificationSoundPolicyOverride,
        category: init.category ?? ConversationCategory.DEFAULT,
        visibility: init.visibility ?? ConversationVisibility.SHOW,
    });
}

/**
 * Create a group with optional default data.
 */
export function makeGroup(
    db: DatabaseBackend,
    init: {
        groupId?: DbGroup['groupId'];
        creatorIdentity: DbGroup['creatorIdentity'];
        createdAt?: DbGroup['createdAt'];
        name?: DbGroup['name'];
        userState?: DbGroup['userState'];
        notificationTriggerPolicyOverride?: DbGroup['notificationTriggerPolicyOverride'];
        notificationSoundPolicyOverride?: DbGroup['notificationSoundPolicyOverride'];
        lastUpdate?: DbCreateConversationMixin['lastUpdate'];
        category?: DbCreateConversationMixin['category'];
        visibility?: DbCreateConversationMixin['visibility'];
    },
    members?: DbContactUid[],
): DbGroupUid {
    const groupUid = db.createGroup({
        type: ReceiverType.GROUP,
        groupId: init.groupId ?? randomGroupId(crypto),
        creatorIdentity: init.creatorIdentity,
        createdAt: init.createdAt ?? new Date(),
        name: init.name ?? randomString(crypto, 8),
        colorIndex: 0,
        userState: init.userState ?? GroupUserState.MEMBER,
        notificationTriggerPolicyOverride: init.notificationTriggerPolicyOverride,
        notificationSoundPolicyOverride: init.notificationSoundPolicyOverride,
        lastUpdate: init.lastUpdate,
        category: init.category ?? ConversationCategory.DEFAULT,
        visibility: init.visibility ?? ConversationVisibility.SHOW,
    });
    if (members !== undefined && members.length > 0) {
        for (const memberUid of members) {
            db.createGroupMember(groupUid, memberUid);
        }
    }
    return groupUid;
}

interface CommonMessageInit<T extends MessageType> {
    id?: u64;
    type: T;
    senderContactUid?: DbContactUid;
    conversationUid: DbConversationUid;
    createdAt?: Date;
    processedAt?: Date;
    readAt?: Date;
    lastReaction?: {
        readonly at: Date;
        readonly type: MessageReaction;
    };
    raw?: Uint8Array;
    threadId?: u64;
}

function getCommonMessage<T extends MessageType>(
    init: CommonMessageInit<T>,
): DbCreate<DbMessageCommon<T>> {
    return {
        id: (init.id ?? randomMessageId(crypto)) as MessageId,
        type: init.type,
        senderContactUid: init.senderContactUid,
        conversationUid: init.conversationUid,
        createdAt: init.createdAt ?? new Date(),
        processedAt: init.processedAt,
        readAt: init.readAt,
        lastReaction: init.lastReaction,
        raw: init.raw,
        threadId: init.threadId ?? 1n, // TODO(WEBMD-296)
    };
}

/**
 * Create a text message with optional default data.
 */
export function createTextMessage(
    db: DatabaseBackend,
    init: Omit<CommonMessageInit<MessageType.TEXT>, 'type'> & {
        text?: string;
    },
): DbMessageUid {
    return db.createTextMessage({
        ...getCommonMessage({...init, type: MessageType.TEXT}),
        text: init.text ?? 'Hey!',
    });
}

/**
 * Create a file message with optional default data.
 */
export function createFileMessage(
    db: DatabaseBackend,
    init: Omit<CommonMessageInit<MessageType.FILE>, 'type'> & {
        blobId?: Uint8Array;
        thumbnailBlobId?: Uint8Array;
        encryptionKey?: RawBlobKey;
        fileId?: string;
        thumbnailFileId?: string;
        mediaType?: string;
        thumbnailMediaType?: string;
        fileName?: string;
        fileSize?: u53;
        caption?: string;
        correlationId?: string;
    },
): DbMessageUid {
    return db.createFileMessage({
        ...getCommonMessage({...init, type: MessageType.FILE}),
        blobId: (init.blobId ??
            crypto.randomBytes(new Uint8Array(BLOB_ID_LENGTH))) as ReadonlyUint8Array as BlobId,
        thumbnailBlobId: init.thumbnailBlobId as ReadonlyUint8Array as BlobId | undefined,
        encryptionKey:
            init.encryptionKey ??
            wrapRawBlobKey(crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH))),
        fileId: init.fileId as FileId | undefined,
        thumbnailFileId: init.thumbnailFileId as FileId | undefined,
        mediaType: init.mediaType ?? 'application/jpeg',
        thumbnailMediaType: init.thumbnailMediaType ?? 'application/jpeg',
        fileName: init.fileName,
        fileSize: init.fileSize ?? 43008,
        caption: init.caption,
        correlationId: init.correlationId,
    });
}

/**
 * Return database test suites that are backend-agnostic.
 */
export function backendTests(
    this: Mocha.Suite,
    features: DatabaseBackendFeatures,
    initBackend: () => [backend: DatabaseBackend, cleanup: () => void],
): void {
    let db: DatabaseBackend;
    let cleanup: () => void;

    this.beforeEach(function () {
        [db, cleanup] = initBackend();
    });
    this.afterEach(() => cleanup());

    describe('Date handling', function () {
        it('Roundtrip', function () {
            // Get current date
            const now = new Date();

            // Create a contact
            const publicKey = crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH));
            const uid = makeContact(db, {publicKey, createdAt: now});

            // Fetch contact
            const contact = db.getContactByUid(uid);
            expect(contact).not.to.be.undefined;
            assert(contact !== undefined); // Make TS happy
            expect(contact.uid).to.equal(uid);

            // Validate date
            expect(contact.createdAt.getTime()).to.equal(now.getTime());
        });
    });

    describe('Contacts', function () {
        it('createContact / getAllContactUids', function () {
            // Initially no contacts
            expect(db.getAllContactUids()).to.be.empty;

            // Add two contacts
            const uid1 = makeContact(db, {
                identity: 'TESTTEST',
            });
            const uid2 = makeContact(db, {
                identity: 'ABCDEFGH',
            });

            // Fetch contact UIDs again
            expect(db.getAllContactUids().map((contact) => contact.uid)).to.have.same.members([
                uid1,
                uid2,
            ]);

            // Ensure that UIDs returned by createContact are correct
            const contact1 = db.getContactByUid(uid1);
            const contact2 = db.getContactByUid(uid2);
            expect(contact1?.uid).to.equal(uid1);
            expect(contact2?.uid).to.equal(uid2);
        });

        it('removeContact / hasContactByIdentity', function () {
            // Add two contacts
            const uid = makeContact(db, {identity: 'TESTTEST'});
            makeContact(db, {identity: 'ABCDEFGH'});

            // Ensure that test contact and its conversation can be found
            expect(db.hasContactByIdentity('TESTTEST' as IdentityString)).not.to.be.undefined;
            expect(db.getConversationOfReceiver({type: ReceiverType.CONTACT, uid})).to.not.be
                .undefined;

            // Remove contact
            expect(db.removeContact(uid)).to.be.true;

            // Ensure that test contact and its conversation is gone
            expect(db.hasContactByIdentity('TESTTEST' as IdentityString)).to.be.undefined;
            expect(db.getConversationOfReceiver({type: ReceiverType.CONTACT, uid})).to.be.undefined;

            // Removing contact again does nothing
            expect(db.removeContact(uid)).to.be.false;
        });

        it('updateContact / getContactByUid', function () {
            // Add a contact with AcquaintanceLevel.DIRECT
            const identity = 'TESTTEST';
            const notificationTriggerPolicyOverride = {
                policy: ContactNotificationTriggerPolicy.NEVER,
                expiresAt: new Date(1999),
            } as const;
            const uid = makeContact(db, {
                identity,
                acquaintanceLevel: AcquaintanceLevel.DIRECT,
                notificationTriggerPolicyOverride,
            });

            // Fetch contact
            let contact = db.getContactByUid(uid);
            assert(contact !== undefined);
            expect(contact.identity).to.equal(identity);
            expect(contact.acquaintanceLevel).to.equal(AcquaintanceLevel.DIRECT);
            expect(contact.notificationTriggerPolicyOverride).to.deep.equal(
                notificationTriggerPolicyOverride,
            );

            // Update contact
            db.updateContact({uid, acquaintanceLevel: AcquaintanceLevel.GROUP});
            contact = db.getContactByUid(uid);
            assert(contact !== undefined);
            expect(contact.acquaintanceLevel).to.equal(AcquaintanceLevel.GROUP);
            expect(contact.notificationTriggerPolicyOverride).to.deep.equal(
                notificationTriggerPolicyOverride,
            );

            // Reset `notificationTriggerPolicyOverride` of the contact
            db.updateContact({uid, notificationTriggerPolicyOverride: undefined});
            contact = db.getContactByUid(uid);
            assert(contact !== undefined);
            expect(contact.acquaintanceLevel).to.equal(AcquaintanceLevel.GROUP);
            expect(contact.notificationTriggerPolicyOverride).to.equal(undefined);
        });

        it('removeContact / getAllContactUids', function () {
            // Add two contacts
            const identities = ['TESTTEST' as IdentityString, 'ABCDEFGH' as IdentityString];
            const [uid1, uid2] = identities.map((identity) => makeContact(db, {identity}));

            // Ensure contacts exist
            expect(db.getAllContactUids().map((contact) => contact.uid)).to.have.same.members([
                uid1,
                uid2,
            ]);

            // Remove first contact
            expect(db.removeContact(uid1)).to.be.true;

            // First contact is gone
            expect(db.getAllContactUids().map((contact) => contact.uid)).to.have.same.members([
                uid2,
            ]);

            // Removing again does nothing
            expect(db.removeContact(uid1)).to.be.false;
        });
    });

    describe('Conversations', function () {
        it('getConversationByUid / getConversationOfReceiver', function () {
            // Add two contacts
            const uid1 = makeContact(db, {
                identity: 'TESTTEST',
                visibility: ConversationVisibility.PINNED,
            });
            const uid2 = makeContact(db, {
                identity: 'ABCDEFGH',
                category: ConversationCategory.PROTECTED,
            });

            // Ensure that an associated conversation exists for each contact
            // and that the conversation properties landed there
            const conversation1 = db.getConversationOfReceiver({
                type: ReceiverType.CONTACT,
                uid: uid1,
            });
            expect(conversation1).not.to.be.undefined;
            expect(conversation1?.receiver.uid).to.equal(uid1);
            expect(conversation1?.visibility).to.equal(ConversationVisibility.PINNED);
            expect(conversation1?.unreadMessageCount, 'c1 unread').to.equal(0);
            const conversation2 = db.getConversationOfReceiver({
                type: ReceiverType.CONTACT,
                uid: uid2,
            });
            expect(conversation2).not.to.be.undefined;
            expect(conversation2?.receiver.uid).to.equal(uid2);
            expect(conversation2?.category).to.equal(ConversationCategory.PROTECTED);
            expect(conversation2?.unreadMessageCount, 'c2 unread').to.equal(0);

            // Ensure that the two conversations do not have the same UID
            expect(conversation1?.uid).to.not.equal(conversation2?.uid);

            // Ensure none of them would be visible in the conversation list
            expect(conversation1?.lastUpdate).to.be.undefined;
            expect(conversation2?.lastUpdate).to.be.undefined;

            // Ensure that the conversations can be fetched by UID
            assert(conversation1 !== undefined);
            assert(conversation2 !== undefined);
            const conversation1Fetched = db.getConversationByUid(conversation1.uid);
            const conversation2Fetched = db.getConversationByUid(conversation2.uid);
            const conversation3Fetched = db.getConversationByUid(999999999n as DbConversationUid);
            expect(conversation1Fetched?.uid).to.equal(conversation1.uid);
            expect(conversation1Fetched?.receiver.uid).to.equal(uid1);
            expect(conversation1Fetched?.unreadMessageCount, 'c1f unread').to.equal(0);
            expect(conversation2Fetched?.uid).to.equal(conversation2.uid);
            expect(conversation2Fetched?.receiver.uid).to.equal(uid2);
            expect(conversation2Fetched?.unreadMessageCount, 'c2f unread').to.equal(0);
            expect(conversation3Fetched?.uid).to.be.undefined;
        });

        it('updateConversation', function () {
            // Add contact and get conversation
            const uid = makeContact(db, {identity: 'TESTTEST'});
            const receiver: DbReceiverLookup = {type: ReceiverType.CONTACT, uid};
            const conversation = db.getConversationOfReceiver(receiver);

            // Ensure the conversation would not be visible in the conversation list, yet (has no
            // `lastUpdate` value).
            assert(conversation !== undefined);
            expect(conversation.lastUpdate).to.be.undefined;

            // Update the conversation and check updated fields
            const lastUpdate = new Date(1973);
            db.updateConversation({
                uid: conversation.uid,
                lastUpdate,
            });
            expect(db.getConversationOfReceiver(receiver)).to.be.deep.equal({
                ...conversation,
                lastUpdate,
            });
        });

        it('getAllConversationReceivers', function () {
            // Initially no conversation receivers
            expect(db.getAllConversationReceivers()).to.be.empty;

            // Add two contacts
            const uid1 = makeContact(db, {
                identity: 'TESTTEST',
            });
            const uid2 = makeContact(db, {
                identity: 'ABCDEFGH',
            });

            // Expect two conversation receivers
            expect(db.getAllConversationReceivers().map(({receiver}) => receiver)).to.deep.equal([
                {type: ReceiverType.CONTACT, uid: uid1},
                {type: ReceiverType.CONTACT, uid: uid2},
            ]);

            // Remove the first contact and expect only the second conversation receiver
            db.removeContact(uid1);
            expect(db.getAllConversationReceivers().map(({receiver}) => receiver)).to.deep.equal([
                {type: ReceiverType.CONTACT, uid: uid2},
            ]);
        });

        it('unread count', function () {
            // Add two contacts
            const contactUid1 = makeContact(db, {identity: 'TESTTEST'});
            const contactUid2 = makeContact(db, {
                identity: 'TESTTES2',
            });
            const receiver: DbReceiverLookup = {
                type: ReceiverType.CONTACT,
                uid: contactUid1,
            };

            // Get conversation uid
            const conversationUid = db.getConversationOfReceiver(receiver)?.uid;
            assert(conversationUid !== undefined, 'Expected conversation uid not to be undefined');

            // Initially, no messages, so 0 unread messages
            const count1 = db.getConversationByUid(conversationUid)?.unreadMessageCount;
            expect(count1, 'count1').to.equal(0);

            // Add an unread inbound message
            createTextMessage(db, {
                id: 1n,
                conversationUid,
                readAt: undefined,
                senderContactUid: contactUid2,
            });
            const count2 = db.getConversationByUid(conversationUid)?.unreadMessageCount;
            expect(count2, 'count2').to.equal(1);

            // Add two read inbound messages
            createTextMessage(db, {
                id: 2n,
                conversationUid,
                readAt: new Date(),
                senderContactUid: contactUid2,
            });
            createTextMessage(db, {
                id: 3n,
                conversationUid,
                readAt: new Date(),
                senderContactUid: contactUid2,
            });
            const count3 = db.getConversationByUid(conversationUid)?.unreadMessageCount;
            expect(count3, 'count3').to.equal(1);

            // Add another unread inbound message
            createTextMessage(db, {
                id: 4n,
                conversationUid,
                readAt: undefined,
                senderContactUid: contactUid2,
            });
            const count4 = db.getConversationByUid(conversationUid)?.unreadMessageCount;
            expect(count4, 'count4').to.equal(2);

            // Add a read and an unread outbound message, these should both be ignored
            createTextMessage(db, {
                id: 5n,
                conversationUid,
                readAt: new Date(),
                senderContactUid: undefined,
            });
            createTextMessage(db, {
                id: 6n,
                conversationUid,
                readAt: undefined,
                senderContactUid: undefined,
            });
            const count5 = db.getConversationByUid(conversationUid)?.unreadMessageCount;
            expect(count5, 'count5').to.equal(2);
        });

        it('latest message', function () {
            // Add two contacts
            const contactUid1 = makeContact(db, {identity: 'TESTTEST'});
            const contactUid2 = makeContact(db, {
                identity: 'TESTTES2',
            });
            const receiver1: DbReceiverLookup = {
                type: ReceiverType.CONTACT,
                uid: contactUid1,
            };
            const receiver2: DbReceiverLookup = {
                type: ReceiverType.CONTACT,
                uid: contactUid2,
            };

            // Get conversation uids
            const conversationUid1 = db.getConversationOfReceiver(receiver1)?.uid;
            assert(
                conversationUid1 !== undefined,
                'Expected conversation1 uid not to be undefined',
            );
            const conversationUid2 = db.getConversationOfReceiver(receiver2)?.uid;
            assert(
                conversationUid2 !== undefined,
                'Expected conversation2 uid not to be undefined',
            );

            // Initially, no messages
            expect(db.getLastMessage(conversationUid1), 'unread messages conv1').to.be.undefined;
            expect(db.getLastMessage(conversationUid2), 'unread messages conv2').to.be.undefined;

            // Add some messages
            createTextMessage(db, {
                id: 1n,
                conversationUid: conversationUid1,
                readAt: undefined,
                senderContactUid: contactUid1,
            });
            createTextMessage(db, {
                id: 2n,
                conversationUid: conversationUid2,
                readAt: new Date(),
                senderContactUid: contactUid2,
            });
            createTextMessage(db, {
                id: 3n,
                conversationUid: conversationUid1,
                readAt: undefined,
                senderContactUid: contactUid1,
            });

            // Latest message should be filtered per-conversation
            // TODO(WEBMD-296): Test proper ordering
            expect(db.getLastMessage(conversationUid1)?.id).to.equal(3n);
            expect(db.getLastMessage(conversationUid2)?.id).to.equal(2n);
        });
    });

    describe('Groups', function () {
        it('createGroup / getAllGroupUids', function () {
            // Initially no groups
            expect(db.getAllGroupUids()).to.be.empty;

            // Add two contacts
            const contactUid1 = makeContact(db, {
                identity: 'TESTTEST',
            });
            const contactUid2 = makeContact(db, {
                identity: 'ABCDEFGH',
            });

            // Add a group with no members
            const groupUid1 = makeGroup(db, {creatorIdentity: ensureIdentityString('MEMEMEME')});
            expect(
                db.getAllGroupUids().map((group) => group.uid),
                'with one group',
            ).to.have.same.members([groupUid1]);

            // Add another group
            const members = [contactUid1, contactUid2];
            const groupUid2 = makeGroup(
                db,
                {creatorIdentity: ensureIdentityString('MEMEMEME')},
                members,
            );
            expect(
                db.getAllGroupUids().map((group) => group.uid),
                'with two groups',
            ).to.have.same.members([groupUid1, groupUid2]);

            // Multiple "identical" groups are fine
            const groupUid3 = makeGroup(
                db,
                {creatorIdentity: ensureIdentityString('MEMEMEME')},
                members,
            );
            expect(
                db.getAllGroupUids().map((group) => group.uid),
                'with two groups',
            ).to.have.same.members([groupUid1, groupUid2, groupUid3]);
        });

        it('createGroupMember / removeGroupMember', function () {
            function getGroupMemberUids(groupUid: DbGroupUid): DbContactUid[] {
                return db.getAllGroupMemberContactUids(groupUid).map((group) => group.uid);
            }

            // Add two contacts
            const contactUid1 = makeContact(db, {
                identity: 'TESTTEST',
            });
            const contactUid2 = makeContact(db, {
                identity: 'ABCDEFGH',
            });

            // Add a group with no members
            const groupUid = makeGroup(db, {creatorIdentity: ensureIdentityString('MEMEMEME')}, []);
            expect(getGroupMemberUids(groupUid)).to.have.same.members([]);

            // Add a member
            db.createGroupMember(groupUid, contactUid1);
            expect(getGroupMemberUids(groupUid)).to.have.same.members([contactUid1]);

            // Add another member
            db.createGroupMember(groupUid, contactUid2);
            expect(getGroupMemberUids(groupUid)).to.have.same.members([contactUid1, contactUid2]);

            // Re-adding same member is disallowed
            expect(() => db.createGroupMember(groupUid, contactUid2)).to.throw;

            // Adding a non-existing contact as member is disallowed (foreign key checks)
            expect(() => db.createGroupMember(groupUid, 99999n as DbContactUid)).to.throw;

            // Remove an existing member
            expect(db.removeGroupMember(groupUid, contactUid1)).to.be.true;
            expect(getGroupMemberUids(groupUid)).to.have.same.members([contactUid2]);

            // Removing a non-existing member from an existing group, or a member from a
            // non-existing group, is OK but returns false
            expect(db.removeGroupMember(groupUid, 99999n as DbContactUid)).to.be.false;
            expect(db.removeGroupMember(99999n as DbGroupUid, contactUid1)).to.be.false;

            // Adding members to a non-existing group is disallowed
            expect(() => db.createGroupMember(99999n as DbGroupUid, contactUid1)).to.throw;
        });

        it('hasGroupByIdAndCreator / removeGroup', function () {
            const identity1 = ensureIdentityString('MEMEMEME');
            const identity2 = ensureIdentityString('ZZZZZZZZ');

            // Add a group with no members
            const uid = makeGroup(db, {creatorIdentity: identity1}, []);
            const group = db.getGroupByUid(uid);
            expect(group).not.to.be.undefined;
            assert(group !== undefined);

            // Existing group is found
            expect(db.hasGroupByIdAndCreator(group.groupId, identity1)).to.equal(uid);

            // Other combinations are not found
            expect(db.hasGroupByIdAndCreator(group.groupId, identity2)).to.be.undefined;
            expect(db.hasGroupByIdAndCreator(99999n as GroupId, identity1)).to.be.undefined;

            // Once group is gone, not found
            expect(db.removeGroup(uid)).to.be.true;
            expect(db.removeGroup(uid)).to.be.false;
            expect(db.hasGroupByIdAndCreator(group.groupId, identity1)).to.be.undefined;
        });

        it('getGroupByUid', function () {
            const identity1 = ensureIdentityString('MEMEMEME');
            const now = new Date();

            // Add a group with a notification trigger policy override.
            // We test this specially because in SQLite this nested object is flattened.
            const uid = makeGroup(db, {
                creatorIdentity: identity1,
                notificationTriggerPolicyOverride: {
                    policy: GroupNotificationTriggerPolicy.NEVER,
                    expiresAt: now,
                },
            });

            // Fetch this group
            const group = db.getGroupByUid(uid);
            expect(group).not.to.be.undefined;
            assert(group !== undefined);
            expect(group.notificationTriggerPolicyOverride?.policy).to.equal(
                GroupNotificationTriggerPolicy.NEVER,
            );
            expect(group.notificationTriggerPolicyOverride?.expiresAt?.toISOString()).to.equal(
                now.toISOString(),
            );
        });

        it('removeContact ensures that no group membership is active', function () {
            // Add contact
            const contactUid = makeContact(db, {identity: 'TESTTEST'});

            // Add group with this contact
            const groupUid = makeGroup(
                db,
                {
                    creatorIdentity: ensureIdentityString('MEMEMEME'),
                },
                [contactUid],
            );

            // Removing contact should fail
            expect(() => db.removeContact(contactUid)).to.throw;

            // Delete group
            expect(db.removeGroup(groupUid)).to.be.true;

            // Now removing contact should succeed
            expect(db.removeContact(contactUid)).to.be.true;
        });
    });

    describe('Messages', function () {
        it('createTextMessage / getMessageByUid', function () {
            // Add contacts and get conversations
            const contactUid1 = makeContact(db, {identity: 'TESTTEST'});
            const contactUid2 = makeContact(db, {identity: 'ZZZZZZZZ'});
            const conversation1 = db.getConversationOfReceiver({
                type: ReceiverType.CONTACT,
                uid: contactUid1,
            });
            const conversation2 = db.getConversationOfReceiver({
                type: ReceiverType.CONTACT,
                uid: contactUid2,
            });
            assert(conversation1 !== undefined && conversation2 !== undefined);

            // Create text messages
            const messageUid1 = createTextMessage(db, {
                id: 1000n,
                conversationUid: conversation1.uid,
                lastReaction: {
                    type: MessageReaction.ACKNOWLEDGE,
                    at: new Date(),
                },
            });
            const messageUid2 = createTextMessage(db, {
                id: 2000n,
                conversationUid: conversation1.uid,
            });
            const messageUid3 = createTextMessage(db, {
                id: 3000n,
                conversationUid: conversation2.uid,
            });

            // Query messages
            const msg1 = db.getMessageByUid(messageUid1);
            const msg2 = db.getMessageByUid(messageUid2);
            const msg3 = db.getMessageByUid(messageUid3);
            for (const msg of [msg1, msg2, msg3]) {
                expect(msg?.type).to.equal(MessageType.TEXT);
            }
            expect(msg1?.id).to.equal(1000n);
            expect(msg2?.id).to.equal(2000n);
            expect(msg3?.id).to.equal(3000n);

            // Ensure that lastReaction is properly split
            expect(msg1?.lastReaction?.type).to.equal(MessageReaction.ACKNOWLEDGE);
            expect(msg2?.lastReaction).to.be.undefined;
            expect(msg3?.lastReaction).to.be.undefined;

            // Unknown messages are undefined
            expect(db.getMessageByUid(9999n as DbMessageUid)).to.be.undefined;

            // Ensure that we cannot create two messages with the same ID in
            // the same conversation
            expect(() =>
                createTextMessage(db, {
                    id: 2000n, // Duplicate in conversation1
                    conversationUid: conversation1.uid,
                }),
            ).to.throw(
                Error,
                // eslint-disable-next-line prefer-named-capture-group
                /(UNIQUE constraint failed: messages\.messageId, messages\.conversationUid)|(Key for index 'id' is not unique)/u,
            );
            createTextMessage(db, {
                id: 2000n, // Not a duplicate in conversation2
                conversationUid: conversation2.uid,
            });
        });

        it('createFileMessage / getMessageByUid', function () {
            // And contact and get conversation
            const contactUid = makeContact(db, {identity: 'TESTTEST'});
            const conversation = db.getConversationOfReceiver({
                type: ReceiverType.CONTACT,
                uid: contactUid,
            });
            assert(conversation !== undefined);

            // Create file message
            const blobId = crypto.randomBytes(new Uint8Array(BLOB_ID_LENGTH));
            const thumbnailFileId = bytesToHex(
                crypto.randomBytes(new Uint8Array(FILE_ID_LENGTH_BYTES)),
            );
            const messageUid = createFileMessage(db, {
                id: 1000n,
                conversationUid: conversation.uid,
                blobId,
                thumbnailFileId,
            });

            // Query message
            const msg = db.getMessageByUid(messageUid);
            expect(msg?.type).to.equal(MessageType.FILE);
            assert(msg?.type === MessageType.FILE);
            expect(msg.id).to.equal(1000n);
            expect(msg.blobId).to.byteEqual(blobId);
            expect(msg.thumbnailFileId).to.equal(thumbnailFileId);
        });

        it('updateMessage', function () {
            // Add contact and get conversation
            const contactUid = makeContact(db, {identity: 'TESTTEST'});
            const conversation = db.getConversationOfReceiver({
                type: ReceiverType.CONTACT,
                uid: contactUid,
            });
            assert(conversation !== undefined);

            // Create text messages
            const messageUid1 = createTextMessage(db, {
                id: 1000n,
                conversationUid: conversation.uid,
                text: 'Aaa',
            });
            const raw = Uint8Array.of(1, 2, 3, 4);
            const messageUid2 = createTextMessage(db, {
                id: 2000n,
                conversationUid: conversation.uid,
                text: 'Bbb',
                raw,
            });

            // Create file message
            const messageUid3 = createFileMessage(db, {
                id: 3000n,
                conversationUid: conversation.uid,
                blobId: crypto.randomBytes(new Uint8Array(BLOB_ID_LENGTH)),
                encryptionKey: wrapRawBlobKey(
                    crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                ),
                mediaType: 'application/jpeg',
                thumbnailMediaType: 'application/jpeg',
                fileSize: 43008,
            });

            // Fetch message
            let message1 = db.getMessageByUid(messageUid1);
            let message2 = db.getMessageByUid(messageUid2);
            let message3 = db.getMessageByUid(messageUid3);

            // Verify message
            expect(message1?.type).to.equal(MessageType.TEXT);
            expect(message2?.type).to.equal(MessageType.TEXT);
            expect(message3?.type).to.equal(MessageType.FILE);
            assert(
                message1?.type === MessageType.TEXT &&
                    message2?.type === MessageType.TEXT &&
                    message3?.type === MessageType.FILE,
            );
            expect(message1.readAt).to.be.undefined;
            expect(message2.readAt).to.be.undefined;
            expect(message1.text).to.equal('Aaa');
            expect(message2.text).to.equal('Bbb');
            expect(message2.raw).to.byteEqual(raw);
            expect(message3.fileId).to.be.undefined;

            // Update text of first message
            db.updateMessage(conversation.uid, {
                uid: message1.uid,
                type: MessageType.TEXT,
                text: 'Ccc',
            });

            // Update `readAt` and `lastReaction` of the second message
            const readAt = new Date(1981);
            const lastReaction: DbAnyMessage['lastReaction'] = {
                type: MessageReaction.ACKNOWLEDGE,
                at: new Date(1980),
            };
            db.updateMessage(conversation.uid, {
                uid: message2.uid,
                type: MessageType.TEXT,
                readAt,
                lastReaction,
            });

            // Update fileId of the third message
            const fileId = bytesToHex(
                crypto.randomBytes(new Uint8Array(FILE_ID_LENGTH_BYTES)),
            ) as FileId;
            db.updateMessage(conversation.uid, {
                uid: message3.uid,
                type: MessageType.FILE,
                fileId,
            });

            // Refresh messages
            message1 = db.getMessageByUid(messageUid1);
            message2 = db.getMessageByUid(messageUid2);
            message3 = db.getMessageByUid(messageUid3);
            assert(
                message1?.type === MessageType.TEXT &&
                    message2?.type === MessageType.TEXT &&
                    message3?.type === MessageType.FILE,
            );

            // Verify updated data
            expect(message1.text).to.equal('Ccc');
            expect(message1.readAt).to.be.undefined;
            expect(message2.text).to.equal('Bbb');
            expect(message2.readAt).to.deep.equal(readAt);
            expect(message2.lastReaction).to.deep.equal(lastReaction);
            expect(message2.raw).to.byteEqual(raw);
            expect(message3.fileId).to.equal(fileId);

            // Ensure `lastReaction` does not implicitly reset
            db.updateMessage(conversation.uid, {
                uid: message2.uid,
                type: MessageType.TEXT,
                readAt: new Date(),
            });
            expect(db.getMessageByUid(message2.uid)?.lastReaction).to.deep.equal(lastReaction);

            // Reset `lastReaction` of the second message
            db.updateMessage(conversation.uid, {
                uid: message2.uid,
                type: MessageType.TEXT,
                lastReaction: undefined,
            });

            // Refresh second message and verify updated `lastReaction`
            message2 = db.getMessageByUid(messageUid2);
            assert(message2?.type === MessageType.TEXT);
            expect(message2.lastReaction).to.be.undefined;
        });

        it('removeMessage / getLastMessage', function () {
            // Add contact and get conversation
            const contactUid = makeContact(db, {identity: 'TESTTEST'});
            const conversation = db.getConversationOfReceiver({
                type: ReceiverType.CONTACT,
                uid: contactUid,
            });
            assert(conversation !== undefined);

            // Create text messages
            const messageUid1 = createTextMessage(db, {
                id: 1000n,
                conversationUid: conversation.uid,
                text: 'Aaa',
            });
            const messageUid2 = createTextMessage(db, {
                id: 2000n,
                conversationUid: conversation.uid,
                text: 'Aaa',
            });

            // Ensure messages exist
            expect(db.getMessageByUid(messageUid1), 'Message 1 does not exist').not.to.be.undefined;
            expect(db.getMessageByUid(messageUid2), 'Message 2 does not exist').not.to.be.undefined;
            expect(db.getLastMessage(conversation.uid)?.id).to.equal(2000n);

            // Delete first message
            expect(db.removeMessage(conversation.uid, messageUid1), 'Message not deleted').to.be
                .true;

            // First message is gone.
            expect(db.getMessageByUid(messageUid1), 'Message 1 still exists').to.be.undefined;
            expect(db.getMessageByUid(messageUid2), 'Message 2 does not exist').not.to.be.undefined;
            expect(db.getLastMessage(conversation.uid)?.id).to.equal(2000n);

            // Deleting again will not do anything
            expect(
                db.removeMessage(conversation.uid, messageUid1),
                'Message reported as deleted, but it should be gone',
            ).to.be.false;
        });

        it('removeAllMessages', function () {
            // Add contact and get conversation
            const uid = makeContact(db, {identity: 'TESTTEST'});
            const receiver: DbReceiverLookup = {type: ReceiverType.CONTACT, uid};
            let conversation = db.getConversationOfReceiver(receiver);
            assert(conversation !== undefined);
            expect(conversation.lastUpdate).to.be.undefined;

            // Add a bunch of messages and update the conversation
            for (let i = 0; i < 10; ++i) {
                createTextMessage(db, {conversationUid: conversation.uid, text: `${i}`});
            }
            const lastUpdate = new Date(1973);
            db.updateConversation({
                uid: conversation.uid,
                lastUpdate,
            });
            expect(db.getMessageUids(conversation.uid, 20)).to.have.length(10);

            // Now, remove all messages and ensure that they're gone
            db.removeAllMessages(conversation.uid, false);
            expect(db.getMessageUids(conversation.uid, 20)).to.have.length(0);

            // Ensure that the conversation still exists and that `lastUpdate` remains untouched
            conversation = db.getConversationOfReceiver(receiver);
            expect(conversation).to.not.be.undefined;
            assert(conversation !== undefined);
            expect(conversation.lastUpdate).to.deep.equal(lastUpdate);

            // Add a bunch of messages again
            for (let i = 0; i < 10; ++i) {
                createTextMessage(db, {conversationUid: conversation.uid, text: `${i}`});
            }

            // Now, remove all messages and ensure that they're gone
            db.removeAllMessages(conversation.uid, true);
            expect(db.getMessageUids(conversation.uid, 20)).to.have.length(0);

            // Ensure that the conversation still exists and that `lastUpdate` has been reset this
            // time.
            conversation = db.getConversationOfReceiver(receiver);
            expect(conversation).to.not.be.undefined;
            expect(conversation?.lastUpdate).to.be.undefined;
        });

        it('markConversationAsRead', function () {
            // Add contact and get conversation
            const uid = makeContact(db, {identity: 'TESTTEST'});
            const receiver: DbReceiverLookup = {type: ReceiverType.CONTACT, uid};
            let conversation = db.getConversationOfReceiver(receiver);
            assert(conversation !== undefined);
            expect(conversation.lastUpdate).to.be.undefined;

            const numberOfOutgoingMessages = 3;
            const outboundMessageUids: DbMessageUid[] = [];

            const initialConversationCreatedAt = new Date('1973');

            // Add a bunch of outgoing messages
            for (let i = 0; i < numberOfOutgoingMessages; ++i) {
                const newOutboundMessageUid = createTextMessage(db, {
                    conversationUid: conversation.uid,
                    senderContactUid: undefined,
                    createdAt: initialConversationCreatedAt,
                    readAt: undefined,
                    text: `outgoing ${i}`,
                });

                outboundMessageUids.push(newOutboundMessageUid);
            }

            const numberOfIncomingMessages = 10;
            const newUnreadMessageUids: DbMessageUid[] = [];

            // Add a bunch of unread incoming messages and update the conversation
            for (let i = 0; i < numberOfIncomingMessages; ++i) {
                const newUnreadMessageUid = createTextMessage(db, {
                    conversationUid: conversation.uid,
                    senderContactUid: receiver.uid,
                    createdAt: initialConversationCreatedAt,
                    readAt: undefined,
                    text: `incoming ${i}`,
                });

                newUnreadMessageUids.push(newUnreadMessageUid);
            }

            db.updateConversation({
                uid: conversation.uid,
                lastUpdate: initialConversationCreatedAt,
            });

            // Ensure that the conversation has the expected number of unread messages and lastUpdate date
            conversation = db.getConversationOfReceiver(receiver);
            expect(conversation).to.not.be.undefined;
            assert(conversation !== undefined);
            expect(conversation.lastUpdate).to.deep.equal(initialConversationCreatedAt);
            expect(conversation.unreadMessageCount).to.be.eq(numberOfIncomingMessages);
            expect(db.getMessageUids(conversation.uid, 200)).to.have.length(
                numberOfOutgoingMessages + numberOfIncomingMessages,
            );

            const readAt = new Date('1984');

            // Mark all messages as read
            const readMessageUids = db.markConversationAsRead(conversation.uid, readAt);

            // Ensure that all created messages have been effectively marked as read
            expect(readMessageUids.length).to.be.eq(newUnreadMessageUids.length);
            expect(readMessageUids.map((m) => m.uid)).contains.all.members(newUnreadMessageUids);
            for (const messageUid of newUnreadMessageUids) {
                expect(db.getMessageByUid(messageUid)?.readAt).to.deep.equal(readAt);
            }
            expect(readMessageUids.map((m) => m.uid)).does.not.contains.any.members(
                outboundMessageUids,
            );
            for (const messageUid of outboundMessageUids) {
                expect(db.getMessageByUid(messageUid)?.readAt).to.deep.equal(undefined);
            }

            // Ensure that the conversation has been updated accordingly
            conversation = db.getConversationOfReceiver(receiver);
            expect(conversation).to.not.be.undefined;
            assert(conversation !== undefined);
            expect(conversation.unreadMessageCount).to.be.eq(0);
            expect(db.getMessageUids(conversation.uid, 200)).to.have.length(
                numberOfOutgoingMessages + numberOfIncomingMessages,
            );

            // The `lastUpdate` date should not be affected by the the read action.
            expect(conversation.lastUpdate).to.deep.equal(initialConversationCreatedAt);

            // Ensure that the conversation is not modified if no messages are unread.
            const newReadAt = new Date('1985');

            // Try to mark all messages as read, even if there are none
            const noUnreadMessageUids = db.markConversationAsRead(conversation.uid, newReadAt);

            // Ensure that no messages have been effectively marked as read
            expect(noUnreadMessageUids.length).to.be.eq(0);

            // Ensure that the conversation has not been updated
            conversation = db.getConversationOfReceiver(receiver);
            expect(conversation).to.not.be.undefined;
            assert(conversation !== undefined);
            expect(conversation.lastUpdate).to.deep.equal(initialConversationCreatedAt);
            expect(conversation.unreadMessageCount).to.be.eq(0);
            expect(db.getMessageUids(conversation.uid, 200)).to.have.length(
                numberOfOutgoingMessages + numberOfIncomingMessages,
            );

            const numberOfNewIncomingMessages = 5;

            // Add a bunch of new unread incoming messages again
            for (let i = 0; i < numberOfNewIncomingMessages; ++i) {
                createTextMessage(db, {
                    conversationUid: conversation.uid,
                    senderContactUid: receiver.uid,
                    readAt: undefined,
                    text: `new incoming ${i}`,
                });
            }

            // Ensure that the conversation and its messages have updated accordingly
            conversation = db.getConversationOfReceiver(receiver);
            expect(conversation).to.not.be.undefined;
            assert(conversation !== undefined);
            expect(conversation.unreadMessageCount).to.be.eq(numberOfNewIncomingMessages);
            expect(db.getMessageUids(conversation.uid, 200)).to.have.length(
                numberOfOutgoingMessages + numberOfIncomingMessages + numberOfNewIncomingMessages,
            );
        });

        if (!(features.doesNotImplementThreadIdTodoRemoveThis ?? false)) {
            it('getMessageUids', function () {
                // Add contacts and get conversations
                const contactUid1 = makeContact(db, {identity: 'TESTTEST'});
                const contactUid2 = makeContact(db, {identity: 'FOOOBAAR'});
                const conversation1 = db.getConversationOfReceiver({
                    type: ReceiverType.CONTACT,
                    uid: contactUid1,
                });
                const conversation2 = db.getConversationOfReceiver({
                    type: ReceiverType.CONTACT,
                    uid: contactUid2,
                });
                assert(conversation1 !== undefined && conversation2 !== undefined);

                // Add messages
                createTextMessage(db, {
                    id: 1000n,
                    conversationUid: conversation1.uid,
                    threadId: 1n,
                    text: 'A',
                    processedAt: new Date(1),
                });
                const messageUidConversation1 = createTextMessage(db, {
                    id: 1001n,
                    conversationUid: conversation1.uid,
                    threadId: 2n,
                    text: 'B',
                    processedAt: new Date(2),
                });
                createTextMessage(db, {
                    id: 1002n,
                    conversationUid: conversation1.uid,
                    threadId: 3n,
                    text: 'C',
                    processedAt: new Date(3),
                });
                const messageUidConversation2 = createTextMessage(db, {
                    id: 2000n,
                    conversationUid: conversation2.uid,
                    threadId: 1n,
                    text: 'D',
                    processedAt: new Date(4),
                });

                // Get max 10 messages from conversation 1
                const olderMessagesNoReferenceLimit10 = db
                    .getMessageUids(conversation1.uid, 10)
                    .map((m) => m.uid);
                expect(olderMessagesNoReferenceLimit10).to.have.length(3);
                expect(olderMessagesNoReferenceLimit10).to.deep.equal([3n, 2n, 1n]);

                // Get max 2 messages from conversation 1
                const olderMessagesNoReferenceLimit2 = db
                    .getMessageUids(conversation1.uid, 2)
                    .map((m) => m.uid);
                expect(olderMessagesNoReferenceLimit2).to.have.length(2);
                expect(olderMessagesNoReferenceLimit2).to.deep.equal([3n, 2n]);

                // Get messages from conversation 1 with a reference UID
                const olderMessagesWithReference = db
                    .getMessageUids(conversation1.uid, 10, {
                        uid: messageUidConversation1,
                        direction: MessageQueryDirection.OLDER,
                    })
                    .map((m) => m.uid);
                expect(olderMessagesWithReference).to.have.length(2);
                expect(olderMessagesWithReference).to.deep.equal([2n, 1n]);
                const newerMessagesWithReference = db
                    .getMessageUids(conversation1.uid, 10, {
                        uid: messageUidConversation1,
                        direction: MessageQueryDirection.NEWER,
                    })
                    .map((m) => m.uid);
                expect(newerMessagesWithReference).to.have.length(2);
                expect(newerMessagesWithReference).to.deep.equal([2n, 3n]);

                // Get messages from conversation 1 with a reference UID
                // that does not belong to this conversation
                const messagesWrongReference = db
                    .getMessageUids(conversation1.uid, 10, {
                        uid: messageUidConversation2,
                        direction: MessageQueryDirection.OLDER,
                    })
                    .map((m) => m.uid);
                expect(messagesWrongReference).to.have.length(0);

                // Get messages from conversation 1 with a non-existing reference UID
                const messagesInvalidReference = db
                    .getMessageUids(conversation1.uid, 10, {
                        uid: 9234234n as DbMessageUid,
                        direction: MessageQueryDirection.OLDER,
                    })
                    .map((m) => m.uid);
                expect(messagesInvalidReference).to.have.length(0);
            });
        }
    });

    describe('Settings', function () {
        const settingsWithFooPublicNickname = {publicNickname: ensurePublicNickname('foo')};
        const settingsWithBarPublicNickname = {publicNickname: ensurePublicNickname('bar')};

        it('returns undefined when the category does not exist in the underlying storage', function () {
            expect(db.getSettings('profile')).to.be.undefined;
        });

        it('returns the defaults when the category does not exist in the underlying storage', function () {
            expect(db.getSettingsWithDefaults('profile', settingsWithFooPublicNickname)).to.be.eql(
                settingsWithFooPublicNickname,
            );
        });

        it('returns the value exiting in the underlying storage even if defaults are provided', function () {
            db.setSettings('profile', settingsWithFooPublicNickname);
            expect(db.getSettingsWithDefaults('profile', settingsWithBarPublicNickname)).to.be.eql(
                settingsWithFooPublicNickname,
            );
        });

        it('allows setting and getting a value for a key', function () {
            expect(db.getSettings('profile')).to.be.undefined;
            db.setSettings('profile', settingsWithFooPublicNickname);
            expect(db.getSettings('profile')).to.be.eql(settingsWithFooPublicNickname);
        });

        it('allows a settings value to be updated', function () {
            db.setSettings('profile', settingsWithFooPublicNickname);
            expect(db.getSettings('profile')).to.be.eql(settingsWithFooPublicNickname);
            db.setSettings('profile', settingsWithBarPublicNickname);
            expect(db.getSettings('profile')).to.be.eql(settingsWithBarPublicNickname);
        });
    });
}
