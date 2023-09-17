import {expect} from 'chai';

import {ensureNonce, NACL_CONSTANTS, type NonceHash, type PublicKey} from '~/common/crypto';
import {hashNonce} from '~/common/crypto/nonce';
import {randomString} from '~/common/crypto/random';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import type {
    DatabaseBackend,
    DbAnyMessage,
    DbContactUid,
    DbConversation,
    DbConversationUid,
    DbCreate,
    DbCreateConversationMixin,
    DbFileData,
    DbGroup,
    DbGroupUid,
    DbMessageCommon,
    DbMessageUid,
    DbNonceUid,
    DbReceiverLookup,
    DbUnreadMessageCountMixin,
} from '~/common/db';
import {
    AcquaintanceLevel,
    ActivityState,
    type BlobDownloadState,
    ContactNotificationTriggerPolicy,
    ConversationCategory,
    ConversationVisibility,
    GroupNotificationTriggerPolicy,
    GroupUserState,
    IdentityType,
    ImageRenderingType,
    MessageQueryDirection,
    MessageReaction,
    MessageType,
    NonceScopeUtils,
    type NotificationSoundPolicy,
    ReceiverType,
    SyncState,
    VerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import {
    ensureFileId,
    FILE_ENCRYPTION_KEY_LENGTH,
    FILE_ID_LENGTH_BYTES,
    InMemoryFileStorage,
    wrapFileEncryptionKey,
} from '~/common/file-storage';
import {BLOB_ID_LENGTH, type BlobId} from '~/common/network/protocol/blob';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import {
    ensureIdentityString,
    ensureNickname,
    FEATURE_MASK_FLAG,
    type FeatureMask,
    type GroupId,
    type IdentityString,
    type MessageId,
    type Nickname,
} from '~/common/network/types';
import {type RawBlobKey, wrapRawBlobKey} from '~/common/network/types/keys';
import type {Dimensions, ReadonlyUint8Array, u53, u64} from '~/common/types';
import {assert, unwrap} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {Identity} from '~/common/utils/identity';
import {hasProperty} from '~/common/utils/object';
import {pseudoRandomBytes} from '~/test/mocha/common/utils';

import {makeTestServices} from './backend-mocks';
import {expectSameNonceHashes} from './crypto/nonce.spec';

/**
 * Available features of the database backend.
 */
export interface DatabaseBackendFeatures {
    readonly supportsForeignKeyConstraints: boolean;
    // TODO(DESK-296): Add thread handling to in-memory db, then remove this
    readonly doesNotImplementThreadIdTodoRemoveThis?: true;
    // TODO(DESK-530): Replace with sql.js?
    readonly doesNotImplementFileDataCleanup?: true;
}

// Minimal crypto backend
const crypto = new TweetNaClBackend(pseudoRandomBytes);

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
        nickname?: Nickname;
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
        nickname: init.nickname ?? ('Tommy' as Nickname),
        colorIndex: 0,
        verificationLevel: init.verificationLevel ?? VerificationLevel.UNVERIFIED,
        workVerificationLevel: init.workVerificationLevel ?? WorkVerificationLevel.NONE,
        identityType: init.identityType ?? IdentityType.REGULAR,
        acquaintanceLevel: init.acquaintanceLevel ?? AcquaintanceLevel.DIRECT,
        activityState: init.activityState ?? ActivityState.ACTIVE,
        featureMask: init.featureMask ?? (FEATURE_MASK_FLAG.NONE as FeatureMask),
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

function makeFileData(): DbFileData {
    return {
        fileId: ensureFileId(bytesToHex(crypto.randomBytes(new Uint8Array(FILE_ID_LENGTH_BYTES)))),
        encryptionKey: wrapFileEncryptionKey(
            crypto.randomBytes(new Uint8Array(FILE_ENCRYPTION_KEY_LENGTH)),
        ),
        unencryptedByteCount: 123,
        storageFormatVersion: 1,
    };
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
        threadId: init.threadId ?? 1n, // TODO(DESK-296)
    };
}

export type TestTextMessageInit = Omit<CommonMessageInit<MessageType.TEXT>, 'type'> & {
    text?: string;
};

/**
 * Create a text message with optional default data.
 */
export function createTextMessage(db: DatabaseBackend, init: TestTextMessageInit): DbMessageUid {
    return db.createTextMessage({
        ...getCommonMessage({...init, type: MessageType.TEXT}),
        text: init.text ?? 'Hey!',
    });
}

export type TestFileMessageInit = Omit<CommonMessageInit<MessageType.FILE>, 'type'> & {
    readonly blobId?: Uint8Array | ReadonlyUint8Array | BlobId;
    readonly thumbnailBlobId?: Uint8Array;
    readonly encryptionKey?: RawBlobKey;
    readonly blobDownloadState?: BlobDownloadState;
    readonly thumbnailBlobDownloadState?: BlobDownloadState;
    readonly fileData?: DbFileData;
    readonly thumbnailFileData?: DbFileData;
    readonly mediaType?: string;
    readonly thumbnailMediaType?: string;
    readonly fileName?: string;
    readonly fileSize?: u53;
    readonly caption?: string;
    readonly correlationId?: string;
};

export type TestImageMessageInit = TestFileMessageInit & {
    readonly renderingType?: ImageRenderingType;
    readonly animated?: boolean;
    readonly dimensions?: Dimensions;
};

export function randomBlobId(): BlobId {
    return crypto.randomBytes(new Uint8Array(BLOB_ID_LENGTH)) as ReadonlyUint8Array as BlobId;
}

export function randomBlobKey(): RawBlobKey {
    return wrapRawBlobKey(crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)));
}

/**
 * Create a file message with optional default data.
 */
export function createFileMessage(db: DatabaseBackend, init: TestFileMessageInit): DbMessageUid {
    let blobId: BlobId | undefined;
    if (!hasProperty(init, 'blobId')) {
        blobId = randomBlobId();
    } else if (init.blobId !== undefined) {
        blobId = init.blobId as BlobId;
    }

    return db.createFileMessage({
        ...getCommonMessage({...init, type: MessageType.FILE}),
        blobId,
        thumbnailBlobId: init.thumbnailBlobId as ReadonlyUint8Array as BlobId | undefined,
        encryptionKey: init.encryptionKey ?? randomBlobKey(),
        blobDownloadState: init.blobDownloadState,
        thumbnailBlobDownloadState: init.thumbnailBlobDownloadState,
        fileData: init.fileData,
        thumbnailFileData: init.thumbnailFileData,
        mediaType: init.mediaType ?? 'application/jpeg',
        thumbnailMediaType: init.thumbnailMediaType,
        fileName: init.fileName,
        fileSize: init.fileSize ?? 43008,
        caption: init.caption,
        correlationId: init.correlationId,
    });
}

/**
 * Create a file message with optional default data.
 */
export function createImageMessage(db: DatabaseBackend, init: TestImageMessageInit): DbMessageUid {
    let blobId: BlobId | undefined;
    if (!hasProperty(init, 'blobId')) {
        blobId = randomBlobId();
    } else if (init.blobId !== undefined) {
        blobId = init.blobId as BlobId;
    }

    return db.createImageMessage({
        ...getCommonMessage({...init, type: MessageType.IMAGE}),
        blobId,
        thumbnailBlobId: init.thumbnailBlobId as ReadonlyUint8Array as BlobId | undefined,
        encryptionKey: init.encryptionKey ?? randomBlobKey(),
        blobDownloadState: init.blobDownloadState,
        thumbnailBlobDownloadState: init.thumbnailBlobDownloadState,
        fileData: init.fileData,
        thumbnailFileData: init.thumbnailFileData,
        mediaType: init.mediaType ?? 'application/jpeg',
        thumbnailMediaType: init.thumbnailMediaType,
        fileName: init.fileName,
        fileSize: init.fileSize ?? 43008,
        caption: init.caption,
        correlationId: init.correlationId,
        renderingType: init.renderingType ?? ImageRenderingType.REGULAR,
        animated: init.animated ?? false,
        dimensions: init.dimensions,
    });
}

/**
 * Return database test suites that are backend-agnostic.
 */
export function backendTests(
    this: Mocha.Suite,
    features: DatabaseBackendFeatures,
    initBackend: () => DatabaseBackend,
): void {
    let db: DatabaseBackend;
    this.beforeEach(() => {
        db = initBackend();
    });

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
            assert(uid1 !== undefined && uid2 !== undefined);

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
            // TODO(DESK-296): Test proper ordering
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
            const blobId = randomBlobId();
            const fileData = makeFileData();
            const thumbnailFileData = makeFileData();
            const messageUid = createFileMessage(db, {
                id: 1000n,
                conversationUid: conversation.uid,
                blobId,
                fileData,
                thumbnailFileData,
            });

            // Query message
            const msg = db.getMessageByUid(messageUid);
            expect(msg?.type).to.equal(MessageType.FILE);
            assert(msg?.type === MessageType.FILE);
            expect(msg.id).to.equal(1000n);
            expect(msg.blobId).to.deep.equal(blobId);
            assert(msg.fileData !== undefined, 'File data should not be undefined');
            expect(msg.fileData, 'Mismatch in fileData').to.deep.equal(fileData);
            assert(
                msg.thumbnailFileData !== undefined,
                'Thumbnail file data should not be undefined',
            );
            expect(msg.thumbnailFileData, 'Mismatch in thumbnailFileData').to.deep.equal(
                thumbnailFileData,
            );
        });

        it('createImageMessage / getMessageByUid', function () {
            // And contact and get conversation
            const contactUid = makeContact(db, {identity: 'TESTTEST'});
            const conversation = db.getConversationOfReceiver({
                type: ReceiverType.CONTACT,
                uid: contactUid,
            });
            assert(conversation !== undefined);

            // Create image message
            const blobId = randomBlobId();
            const fileData = makeFileData();
            const thumbnailFileData = makeFileData();
            const messageUid = createImageMessage(db, {
                id: 1000n,
                conversationUid: conversation.uid,
                blobId,
                fileData,
                thumbnailFileData,
                renderingType: ImageRenderingType.STICKER,
                animated: false,
                dimensions: {height: 30, width: 600},
            });

            // Query message
            const msg = db.getMessageByUid(messageUid);
            expect(msg?.type).to.equal(MessageType.IMAGE);
            assert(msg?.type === MessageType.IMAGE);
            expect(msg.id).to.equal(1000n);
            expect(msg.blobId).to.deep.equal(blobId);
            assert(msg.fileData !== undefined, 'File data should not be undefined');
            expect(msg.fileData, 'Mismatch in fileData').to.deep.equal(fileData);
            assert(
                msg.thumbnailFileData !== undefined,
                'Thumbnail file data should not be undefined',
            );
            expect(msg.thumbnailFileData, 'Mismatch in thumbnailFileData').to.deep.equal(
                thumbnailFileData,
            );
            expect(msg.renderingType).to.equal(ImageRenderingType.STICKER);
            expect(msg.animated).to.be.false;
            expect(msg.dimensions).to.deep.equal({height: 30, width: 600});
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
                blobId: randomBlobId(),
                encryptionKey: randomBlobKey(),
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
            expect(message2.raw).to.deep.equal(raw);
            expect(message3.fileData).to.be.undefined;

            // Update text of first message
            const updateInfo1 = db.updateMessage(conversation.uid, {
                uid: message1.uid,
                type: MessageType.TEXT,
                text: 'Ccc',
            });
            expect(updateInfo1.deletedFileIds).to.be.empty;

            // Update `readAt` and `lastReaction` of the second message
            const readAt = new Date(1981);
            const lastReaction: DbAnyMessage['lastReaction'] = {
                type: MessageReaction.ACKNOWLEDGE,
                at: new Date(1980),
            };
            const updateInfo2 = db.updateMessage(conversation.uid, {
                uid: message2.uid,
                type: MessageType.TEXT,
                readAt,
                lastReaction,
            });
            expect(updateInfo2.deletedFileIds).to.be.empty;

            // Update file data of the third message
            const fileData = makeFileData();
            const thumbnailFileData = makeFileData();
            const updateInfo3 = db.updateMessage(conversation.uid, {
                uid: message3.uid,
                type: MessageType.FILE,
                fileData,
                thumbnailFileData,
            });
            expect(updateInfo3.deletedFileIds).to.be.empty;

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
            expect(message2.raw).to.deep.equal(raw);
            expect(message3.fileData).to.deep.equal(fileData);
            expect(message3.thumbnailFileData).to.deep.equal(thumbnailFileData);

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

            // Ensure that an update of the file data is processed
            const fileData2 = makeFileData();
            const updateInfoAfterFileDataUpdate = db.updateMessage(conversation.uid, {
                uid: message3.uid,
                type: MessageType.FILE,
                fileData: fileData2,
            });
            if (!features.doesNotImplementFileDataCleanup) {
                expect(
                    updateInfoAfterFileDataUpdate.deletedFileIds,
                    'after file data update',
                ).to.have.members([fileData.fileId]);
            }
            message3 = db.getMessageByUid(messageUid3);
            assert(message3?.type === MessageType.FILE);
            expect(message3.fileData?.fileId).to.equal(fileData2.fileId);
            expect(message3.thumbnailFileData?.fileId).to.equal(thumbnailFileData.fileId);

            // Ensure that a removal of the file data is processed
            const updateInfoAfterFileDataRemoval = db.updateMessage(conversation.uid, {
                uid: message3.uid,
                type: MessageType.FILE,
                fileData: undefined,
                thumbnailFileData: undefined,
            });
            message3 = db.getMessageByUid(message3.uid);
            assert(message3?.type === MessageType.FILE);
            expect(message3.fileData).to.be.undefined;
            expect(message3.thumbnailFileData).to.be.undefined;
            if (!features.doesNotImplementFileDataCleanup) {
                expect(
                    updateInfoAfterFileDataRemoval.deletedFileIds,
                    'after file data removal',
                ).to.have.members([fileData2.fileId, thumbnailFileData.fileId]);
            }
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
            const removeInfo1 = db.removeMessage(conversation.uid, messageUid1);
            expect(removeInfo1.removed, 'Message not deleted').to.be.true;
            expect(removeInfo1.deletedFileIds, 'deletedFileIds not empty').to.be.empty;

            // First message is gone.
            expect(db.getMessageByUid(messageUid1), 'Message 1 still exists').to.be.undefined;
            expect(db.getMessageByUid(messageUid2), 'Message 2 does not exist').not.to.be.undefined;
            expect(db.getLastMessage(conversation.uid)?.id).to.equal(2000n);

            // Deleting again will not do anything
            const removeInfo2 = db.removeMessage(conversation.uid, messageUid1);
            expect(removeInfo2.removed, 'Message reported as deleted, but it should be gone').to.be
                .false;
            expect(removeInfo2.deletedFileIds, 'deletedFileIds not empty').to.be.empty;
        });

        it('removeMessage with file data', async function () {
            // Add contact and get conversation
            const contactUid = makeContact(db, {identity: 'TESTTEST'});
            const conversation = db.getConversationOfReceiver({
                type: ReceiverType.CONTACT,
                uid: contactUid,
            });
            assert(conversation !== undefined);

            const storage = new InMemoryFileStorage(crypto);

            // Create files
            const file1Data = await storage.store(Uint8Array.of(1, 2, 3));
            const file2Data = await storage.store(Uint8Array.of(2, 3, 4));
            const file3Data = await storage.store(Uint8Array.of(3, 4, 5));
            const file4Data = await storage.store(Uint8Array.of(4, 5, 6));

            // Create file messages
            const messageUid1 = createFileMessage(db, {
                id: 1000n,
                conversationUid: conversation.uid,
                fileData: {
                    ...file1Data,
                    unencryptedByteCount: 3,
                },
                thumbnailFileData: {
                    ...file2Data,
                    unencryptedByteCount: 3,
                },
            });
            const messageUid2 = createFileMessage(db, {
                id: 2000n,
                conversationUid: conversation.uid,
                fileData: {
                    ...file3Data,
                    unencryptedByteCount: 3,
                },
                thumbnailFileData: {
                    ...file4Data,
                    unencryptedByteCount: 3,
                },
            });
            const messageUid3 = createFileMessage(db, {
                id: 3000n,
                conversationUid: conversation.uid,
                fileData: {
                    ...file3Data,
                    unencryptedByteCount: 3,
                },
                thumbnailFileData: undefined,
            });

            // Ensure messages exist
            expect(db.getMessageByUid(messageUid1), 'Message 1 does not exist').not.to.be.undefined;
            expect(db.getMessageByUid(messageUid2), 'Message 2 does not exist').not.to.be.undefined;
            expect(db.getMessageByUid(messageUid3), 'Message 3 does not exist').not.to.be.undefined;

            // Delete first message, this should return two file IDs
            const removeInfo1 = db.removeMessage(conversation.uid, messageUid1);
            expect(removeInfo1.removed, 'Message 1 not deleted').to.be.true;
            if (!features.doesNotImplementFileDataCleanup) {
                expect(removeInfo1.deletedFileIds).to.have.members([
                    file1Data.fileId,
                    file2Data.fileId,
                ]);
            }

            // First message is gone
            expect(db.getMessageByUid(messageUid1), 'Message 1 still exists').to.be.undefined;

            // Deleting again will not do anything
            const removeInfo1Again = db.removeMessage(conversation.uid, messageUid1);
            expect(removeInfo1Again.removed, 'Message reported as deleted, but it should be gone')
                .to.be.false;
            expect(removeInfo1Again.deletedFileIds, 'deletedFileIds not empty').to.be.empty;

            // Delete second message, this should return only return the thumbnail file ID, because
            // the file data itself is still referenced in third message
            const removeInfo2 = db.removeMessage(conversation.uid, messageUid2);
            expect(removeInfo2.removed, 'Message 2 not deleted').to.be.true;
            if (!features.doesNotImplementFileDataCleanup) {
                expect(removeInfo2.deletedFileIds).to.have.members([file4Data.fileId]);
            }

            // Delete third message, now the data file ID will be returned as well
            const removeInfo3 = db.removeMessage(conversation.uid, messageUid3);
            expect(removeInfo3.removed, 'Message 3 not deleted').to.be.true;
            if (!features.doesNotImplementFileDataCleanup) {
                expect(removeInfo3.deletedFileIds).to.have.members([file3Data.fileId]);
            }
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
            const fileData1 = makeFileData();
            const fileData2 = makeFileData();
            const thumbnailFileData = makeFileData();
            createFileMessage(db, {
                conversationUid: conversation.uid,
                fileData: fileData1,
                thumbnailFileData,
            });
            createFileMessage(db, {conversationUid: conversation.uid, fileData: fileData2});
            const lastUpdate = new Date(1973);
            db.updateConversation({
                uid: conversation.uid,
                lastUpdate,
            });
            expect(db.getMessageUids(conversation.uid, 20)).to.have.length(12);

            // Now, remove all messages and ensure that they're gone
            const removeInfo1 = db.removeAllMessages(conversation.uid, false);
            expect(db.getMessageUids(conversation.uid, 20)).to.have.length(0);
            expect(removeInfo1.removed).to.equal(12);

            // Ensure that the conversation still exists and that `lastUpdate` remains untouched
            conversation = db.getConversationOfReceiver(receiver);
            expect(conversation).to.not.be.undefined;
            assert(conversation !== undefined);
            expect(conversation.lastUpdate).to.deep.equal(lastUpdate);

            // Ensure that the removed file IDs are returned
            if (!features.doesNotImplementFileDataCleanup) {
                expect(removeInfo1.deletedFileIds).have.members([
                    fileData1.fileId,
                    thumbnailFileData.fileId,
                    fileData2.fileId,
                ]);
            }

            // Add a bunch of messages again
            for (let i = 0; i < 10; ++i) {
                createTextMessage(db, {conversationUid: conversation.uid, text: `${i}`});
            }

            // Now, remove all messages and ensure that they're gone
            const removeInfo2 = db.removeAllMessages(conversation.uid, true);
            expect(db.getMessageUids(conversation.uid, 20)).to.have.length(0);
            expect(removeInfo2.removed).to.equal(10);
            expect(removeInfo2.deletedFileIds).to.be.empty;

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

        describe('getMessageUids', function () {
            function setupConversations(): {
                conversation: readonly [
                    conversation1: DbConversation & DbUnreadMessageCountMixin,
                    conversation2: DbConversation & DbUnreadMessageCountMixin,
                ];
                message: readonly [
                    messageUid1: DbMessageUid,
                    messageUid2: DbMessageUid,
                    messageUid3: DbMessageUid,
                    messageUid4: DbMessageUid,
                    messageUid5: DbMessageUid,
                ];
            } {
                // Add contacts and get conversations.
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

                // Add messages.
                // Conversation 1
                const messageUid1 = createTextMessage(db, {
                    id: 1000n,
                    conversationUid: conversation1.uid,
                    text: 'A',
                    processedAt: new Date(1),
                });
                const messageUid2 = createTextMessage(db, {
                    id: 1001n,
                    conversationUid: conversation1.uid,
                    text: 'B',
                    processedAt: new Date(2),
                });
                const messageUid3 = createTextMessage(db, {
                    id: 1002n,
                    conversationUid: conversation1.uid,
                    text: 'C',
                    processedAt: new Date(3),
                });
                const messageUid4 = createTextMessage(db, {
                    id: 1003n,
                    conversationUid: conversation1.uid,
                    text: 'D',
                    processedAt: new Date(4),
                });

                // Conversation 2
                const messageUid5 = createTextMessage(db, {
                    id: 2000n,
                    conversationUid: conversation2.uid,
                    text: 'E',
                    processedAt: new Date(5),
                });

                return {
                    conversation: [conversation1, conversation2],
                    message: [messageUid1, messageUid2, messageUid3, messageUid4, messageUid5],
                };
            }

            function testGetMessageUidsQuery(
                tests: readonly {
                    readonly description: string;
                    readonly params: Parameters<DatabaseBackend['getMessageUids']>;
                    readonly result: readonly DbMessageUid[];
                }[],
            ): void {
                for (const {params, result, description} of tests) {
                    const result1 = db.getMessageUids(...params).map((m) => m.uid);
                    expect(result1, description).to.have.all.members(result);
                    expect(result1, description).to.have.length(result.length);
                }
            }

            it('respects the limit parameters', function () {
                const {conversation, message} = setupConversations();

                testGetMessageUidsQuery([
                    {
                        description: 'Get max 10 latest messages from conversation 1',
                        params: [conversation[0].uid, 10],
                        result: [message[0], message[1], message[2], message[3]],
                    },
                    {
                        description: 'Get max 2 latest messages from conversation 1',
                        params: [conversation[0].uid, 2],
                        result: [message[2], message[3]],
                    },
                ]);
            });

            it('returns only results from the same conversation', function () {
                const {conversation, message} = setupConversations();

                testGetMessageUidsQuery([
                    {
                        description:
                            'Get messages from conversation 1 with a reference UID that does not belong to this conversation',
                        params: [
                            conversation[0].uid,
                            10,
                            {
                                // UID from `conversation2`.
                                uid: message[4],
                                direction: MessageQueryDirection.OLDER,
                            },
                        ],
                        result: [],
                    },
                    {
                        description:
                            'Get messages from conversation 1 with a non-existing reference UID',
                        params: [
                            conversation[0].uid,
                            10,
                            {
                                // Non-existing UID.
                                uid: 9234234n as DbMessageUid,
                                direction: MessageQueryDirection.OLDER,
                            },
                        ],
                        result: [],
                    },
                ]);
            });

            it('respects the reference filter', function () {
                const {conversation, message} = setupConversations();

                testGetMessageUidsQuery([
                    {
                        description:
                            'Get 10 messages from conversation 1 that are older than `messageUid1` (as this is the oldest, it should be the only one returned)',
                        params: [
                            conversation[0].uid,
                            10,
                            {
                                uid: message[0],
                                direction: MessageQueryDirection.OLDER,
                            },
                        ],
                        result: [message[0]],
                    },
                    {
                        description:
                            'Get 10 messages from conversation 1 that are newer than `messageUid2` (as this is the second-oldest, it should be the only one not returned in the result)',
                        params: [
                            conversation[0].uid,
                            10,
                            {
                                uid: message[1],
                                direction: MessageQueryDirection.NEWER,
                            },
                        ],
                        result: [message[1], message[2], message[3]],
                    },
                    {
                        description:
                            'Get 2 messages from conversation 1 that are older than `messageUid2`',
                        params: [
                            conversation[0].uid,
                            2,
                            {
                                uid: message[1],
                                direction: MessageQueryDirection.OLDER,
                            },
                        ],
                        result: [message[0], message[1]],
                    },
                    {
                        description:
                            'Get 2 messages from conversation 1 that are newer than `messageUid2`',
                        params: [
                            conversation[0].uid,
                            2,
                            {
                                uid: message[1],
                                direction: MessageQueryDirection.NEWER,
                            },
                        ],
                        result: [message[1], message[2]],
                    },
                ]);
            });
        });
    });

    describe('Settings', function () {
        const settingsWithFooNickname = {
            nickname: ensureNickname('foo'),
            profilePicture: undefined,
            profilePictureShareWith: {group: 'nobody'} as const,
        };
        const settingsWithBarNickname = {
            nickname: ensureNickname('bar'),
            profilePicture: new Uint8Array([1, 2, 3, 4]),
            profilePictureShareWith: {group: 'everyone'} as const,
        };

        it('returns undefined when the category does not exist in the underlying storage', function () {
            expect(db.getSettings('profile')).to.be.undefined;
        });

        it('allows setting and getting a value for a key', function () {
            expect(db.getSettings('profile')).to.be.undefined;
            db.setSettings('profile', settingsWithFooNickname);
            expect(db.getSettings('profile')).to.be.eql(settingsWithFooNickname);
        });

        it('allows a settings value to be updated', function () {
            db.setSettings('profile', settingsWithFooNickname);
            expect(db.getSettings('profile')).to.be.eql(settingsWithFooNickname);
            db.setSettings('profile', settingsWithBarNickname);
            expect(db.getSettings('profile')).to.be.eql(settingsWithBarNickname);
        });
    });

    describe('NonceDatabaseBackend', function () {
        function makeRandomNonceHash(): NonceHash {
            const identity = new Identity(ensureIdentityString('MEMEMEME'));
            const services = makeTestServices(identity.string);
            const randomNonce = ensureNonce(
                services.crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH)),
            );
            return hashNonce(identity, randomNonce);
        }
        describe('hasNonce', function () {
            it('returns undefined if the nonce was not persisted before', function () {
                for (const scope of NonceScopeUtils.ALL) {
                    const result = db.hasNonce(scope, makeRandomNonceHash());
                    expect(result).to.be.undefined;
                }
            });
            it("returns the nonce's uid if the nonce was persisted before", function () {
                for (const scope of NonceScopeUtils.ALL) {
                    const randomNonce = makeRandomNonceHash();
                    const uid = db.addNonce(scope, randomNonce);
                    const result = db.hasNonce(scope, randomNonce);
                    expect(result).to.equal(uid);
                }
            });
        });

        describe('addNonce', function () {
            it('persists a nonce that was not persisted before', function () {
                for (const scope of NonceScopeUtils.ALL) {
                    const randomNonce = makeRandomNonceHash();
                    const uid = db.addNonce(scope, randomNonce);
                    expect(uid >= 0n, 'Nonce UID should be a database uid');
                    const result = db.hasNonce(scope, randomNonce);
                    expect(result).to.equal(uid);
                }
            });
            it('persists the same nonce correctly for different scopes', function () {
                const randomNonce = makeRandomNonceHash();
                let lastNonceUid: DbNonceUid | undefined = undefined;
                for (const scope of NonceScopeUtils.ALL) {
                    const uid = db.addNonce(scope, randomNonce);
                    expect(uid).to.not.equal(lastNonceUid);
                    lastNonceUid = uid;
                    const result = db.hasNonce(scope, randomNonce);
                    expect(result).to.equal(uid);
                }
            });
            it('throws an error if nonce was persisted before', function () {
                for (const scope of NonceScopeUtils.ALL) {
                    const randomNonce = makeRandomNonceHash();
                    const uid = db.addNonce(scope, randomNonce);
                    expect(uid >= 0n, 'Nonce UID should be a database uid');

                    // eslint-disable-next-line @typescript-eslint/no-loop-func
                    expect(() => db.addNonce(scope, randomNonce)).to.throw();
                }
            });
        });

        describe('getAllNonces', function () {
            it('returns all persisted nonces for a scope.', function () {
                for (const scope of NonceScopeUtils.ALL) {
                    const randomNonces = Array(5)
                        .fill(undefined)
                        .map(() => makeRandomNonceHash());
                    for (const randomNonce of randomNonces) {
                        db.addNonce(scope, randomNonce);
                    }

                    const persistedNonces = db.getAllNonces(scope);
                    expectSameNonceHashes(persistedNonces, randomNonces);
                }
            });
        });

        describe('addNonces', function () {
            it('persists all passed nonces', function () {
                for (const scope of NonceScopeUtils.ALL) {
                    const noncesLength = 5;
                    const randomNonces = Array(noncesLength)
                        .fill(undefined)
                        .map(() => makeRandomNonceHash());
                    db.addNonces(scope, randomNonces);

                    const persistedNonces = db.getAllNonces(scope);
                    expectSameNonceHashes(persistedNonces, randomNonces);
                }
            });
            it('throws if some nonces were stored before', function () {
                for (const scope of NonceScopeUtils.ALL) {
                    const randomNonces = Array(6)
                        .fill(undefined)
                        .map(() => makeRandomNonceHash());
                    db.addNonce(scope, unwrap(randomNonces[0]));

                    // eslint-disable-next-line @typescript-eslint/no-loop-func
                    expect(() => db.addNonces(scope, randomNonces)).to.throw();
                }
            });
        });
    });
}
