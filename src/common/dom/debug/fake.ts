import {type ServicesForBackend} from '~/common/backend';
import {type CryptoBackend, ensurePublicKey} from '~/common/crypto';
import {randomChoice, randomString, randomU8, randomU64} from '~/common/crypto/random';
import {type DbContactUid} from '~/common/db';
import {type BackendHandle} from '~/common/dom/backend';
import {randomBytes} from '~/common/dom/crypto/random';
import {TEST_IMAGE, TEST_THUMBNAIL} from '~/common/dom/debug/testdata';
import {
    AcquaintanceLevel,
    ActivityState,
    ConversationCategory,
    ConversationVisibility,
    FeatureMaskFlag,
    GroupUserState,
    IdentityTypeUtils,
    MessageDirection,
    type MessageReaction,
    MessageReactionUtils,
    SyncState,
    VerificationLevelUtils,
    WorkVerificationLevelUtils,
} from '~/common/enum';
import {type Contact} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {BLOB_ID_LENGTH, ensureBlobId} from '~/common/network/protocol/blob';
import {
    ensureFeatureMask,
    ensureIdentityString,
    ensureMessageId,
    type GroupId,
} from '~/common/network/types';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import {type u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

const CONSONANTS = Array.from('bcdfghjklmnpqrstvwxyz');
const VOCALS = Array.from('aeiou');
const EMOJIS = ['😂', '💩', '🌳', '🤯', '😵', '🤩', '⛰️', '😎', '❤️', '🧔'];
const PUNCTUATION_MARKS = Array.from('.!?…');

// Sources: https://www.bfs.admin.ch/bfs/de/home/statistiken/bevoelkerung/geburten-todesfaelle/vornamen-schweiz.html
// prettier-ignore
const FIRST_NAMES = [
    'Hans', 'Peter', 'Walter', 'Werner', 'Rudolf', 'Kurt', 'Bruno', 'Josef', 'Urs', 'Heinz',
    'René', 'Ernst', 'Paul', 'Jean', 'Rolf', 'Martin', 'Alfred', 'Roland', 'Anton', 'Maria',
    'Ruth', 'Elisabeth', 'Ursula', 'Verena', 'Margrit', 'Marianne', 'Silvia', 'Anna', 'Erika',
    'Rosmarie', 'Marie', 'Katharina', 'Rita', 'Monika', 'Heidi', 'Christine', 'Esther', 'Gertrud',
    'Edith',
];
// Sources: https://nachnamen.net/schweiz
// prettier-ignore
const LAST_NAMES = [
    'Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Schneider', 'Huber', 'Meyer', 'Steiner',
    'Fischer', 'Baumann', 'Frei', 'Brunner', 'Gerber', 'Widmer', 'Zimmermann', 'Moser', 'Graf',
    'Wyss', 'Roth',
];

/**
 * Generate a fake text with a specific amount of syllables.
 */
export function generateFakeText(
    crypto: Pick<CryptoBackend, 'randomBytes'>,
    syllableCount: u53,
): string {
    let text = '';
    let capitalize = true;
    for (let i = 0; i < syllableCount; i++) {
        const c = randomChoice(crypto, CONSONANTS);
        const v = randomChoice(crypto, VOCALS);
        text += `${capitalize ? c.toUpperCase() : c}${v}`;
        const randomValue = Math.random();
        if (randomValue < 0.01) {
            text += ` ${randomChoice(crypto, EMOJIS)} `;
            capitalize = true;
        } else if (randomValue < 0.1) {
            text += `${randomChoice(crypto, PUNCTUATION_MARKS)} `;
            capitalize = true;
        } else if (randomValue < 0.3) {
            text += ' ';
            capitalize = false;
        } else {
            capitalize = false;
        }
    }
    return text.trimEnd();
}

function generateFakeReaction(
    crypto: Pick<CryptoBackend, 'randomBytes'>,
    date: Date,
):
    | {
          readonly at: Date;
          readonly type: MessageReaction;
      }
    | undefined {
    if (Math.random() < 0.2) {
        return {
            at: date,
            type: randomChoice(crypto, [...MessageReactionUtils.ALL]),
        };
    }
    return undefined;
}

/**
 * Generate a fake conversation with fake data. The generated conversation is persistent but not
 * reflected.
 */
export async function generateFakeContactConversation(
    {crypto, file}: Pick<ServicesForBackend, 'crypto' | 'file'>,
    backend: BackendHandle,
): Promise<void> {
    // Add contact
    const identity = ensureIdentityString(`Q${randomString(crypto, 7).toUpperCase()}`);
    const contact = backend.model.contacts.add.fromSync({
        identity,
        publicKey: ensurePublicKey(randomBytes(new Uint8Array(32))),
        createdAt: new Date(),
        firstName: randomChoice(crypto, FIRST_NAMES),
        lastName: randomChoice(crypto, LAST_NAMES),
        nickname: undefined,
        colorIndex: randomU8(crypto),
        verificationLevel: randomChoice(crypto, Array.from(VerificationLevelUtils.ALL)),
        workVerificationLevel: randomChoice(crypto, Array.from(WorkVerificationLevelUtils.ALL)),
        identityType: randomChoice(crypto, Array.from(IdentityTypeUtils.ALL)),
        acquaintanceLevel: AcquaintanceLevel.DIRECT,
        activityState: ActivityState.ACTIVE,
        featureMask: ensureFeatureMask(
            // eslint-disable-next-line no-bitwise
            FeatureMaskFlag.AUDIO_MESSAGE_SUPPORT | FeatureMaskFlag.FILE_MESSAGE_SUPPORT,
        ),
        syncState: SyncState.INITIAL,
        category: ConversationCategory.DEFAULT,
        visibility: ConversationVisibility.SHOW,
    });

    // Add message(s)
    const messageCount = randomChoice(crypto, [1, 3, 7, 32, 100]);
    let minutesAgo = 240;
    for (let i = 0; i < messageCount; i++) {
        const conversation = contact.get().controller.conversation().get();
        const messageId = ensureMessageId(randomU64(crypto));
        const direction = randomChoice<MessageDirection>(crypto, [
            MessageDirection.INBOUND,
            MessageDirection.OUTBOUND,
        ]);
        switch (direction) {
            case MessageDirection.INBOUND:
                conversation.controller.addMessage.fromSync({
                    id: messageId,
                    direction,
                    sender: contact.ctx,
                    createdAt: new Date(+new Date() - minutesAgo-- * 1000 * 60),
                    receivedAt: new Date(+new Date() - minutesAgo-- * 1000 * 60),
                    type: 'text',
                    text: generateFakeText(crypto, randomU8(crypto) / 2 + 1),
                    raw: new Uint8Array(0),
                    lastReaction: generateFakeReaction(
                        crypto,
                        new Date(+new Date() - minutesAgo-- * 1000 * 60),
                    ),
                });
                break;
            case MessageDirection.OUTBOUND:
                if (Math.random() < 0.1) {
                    const {fileId} = await file.store(TEST_IMAGE);
                    const {fileId: thumbnailFileId} = await file.store(TEST_THUMBNAIL);
                    conversation.controller.addMessage.fromSync({
                        id: messageId,
                        direction,
                        createdAt: new Date(+new Date() - minutesAgo-- * 1000 * 60),
                        type: 'file',
                        fileName: 'fire.jpg',
                        fileSize: TEST_IMAGE.byteLength,
                        caption: generateFakeText(crypto, randomU8(crypto) / 8 + 1),
                        mediaType: 'image/jpeg',
                        thumbnailMediaType: 'image/jpeg',
                        correlationId: undefined,
                        blobId: ensureBlobId(randomBytes(new Uint8Array(BLOB_ID_LENGTH))),
                        thumbnailBlobId: ensureBlobId(randomBytes(new Uint8Array(BLOB_ID_LENGTH))),
                        encryptionKey: wrapRawBlobKey(randomBytes(new Uint8Array(32))),
                        fileId,
                        thumbnailFileId,
                        lastReaction: generateFakeReaction(
                            crypto,
                            new Date(+new Date() - minutesAgo-- * 1000 * 60),
                        ),
                    });
                } else {
                    conversation.controller.addMessage.fromSync({
                        id: messageId,
                        direction,
                        createdAt: new Date(+new Date() - minutesAgo-- * 1000 * 60),
                        type: 'text',
                        text: generateFakeText(crypto, randomU8(crypto) / 2 + 1),
                        lastReaction: generateFakeReaction(
                            crypto,
                            new Date(+new Date() - minutesAgo-- * 1000 * 60),
                        ),
                    });
                }
                break;
            default:
                unreachable(direction);
        }
    }
}

/**
 * Generate a fake conversation with fake data. The generated conversation is persistent but not
 * reflected.
 */
export async function generateFakeGroupConversation(
    {crypto, file}: Pick<ServicesForBackend, 'crypto' | 'file'>,
    backend: BackendHandle,
): Promise<void> {
    const contacts = backend.model.contacts.getAll();

    if (contacts.get().size === 0) {
        throw new Error('To generate a group, please add some contacts');
    }

    const contactUids: DbContactUid[] = [];
    const contactObjects: LocalModelStore<Contact>[] = [];
    contacts.get().forEach((contact) => {
        contactUids.push(contact.get().ctx);
        contactObjects.push(contact);
    });

    const group = await backend.model.groups.add.fromLocal(
        {
            groupId: randomU64(crypto) as GroupId,
            creatorIdentity: backend.model.user.identity,
            createdAt: new Date(),
            name: randomChoice<string>(crypto, ['groupsoup', 'OMG a group!', 'Grubb3']),
            colorIndex: randomU8(crypto),
            userState: randomChoice<GroupUserState>(crypto, [
                GroupUserState.MEMBER,
                GroupUserState.KICKED,
                GroupUserState.LEFT,
            ]),
            category: ConversationCategory.DEFAULT,
            visibility: ConversationVisibility.SHOW,
        },
        contactUids,
    );

    // Add message(s)
    const messageCount = randomChoice(crypto, [3, 7, 32, 42]);
    let minutesAgo = 240;

    for (let i = 0; i < messageCount; i++) {
        // Set an random group contact
        const contact = contactObjects[Math.floor(Math.random() * contactObjects.length)];

        const conversation = group.get().controller.conversation().get();
        const messageId = ensureMessageId(randomU64(crypto));
        const direction = randomChoice<MessageDirection>(crypto, [
            MessageDirection.INBOUND,
            MessageDirection.OUTBOUND,
        ]);
        switch (direction) {
            case MessageDirection.INBOUND:
                conversation.controller.addMessage.fromSync({
                    id: messageId,
                    direction,
                    sender: contact.ctx,
                    createdAt: new Date(+new Date() - minutesAgo-- * 1000 * 60),
                    receivedAt: new Date(+new Date() - minutesAgo-- * 1000 * 60),
                    type: 'text',
                    text: generateFakeText(crypto, randomU8(crypto) / 2 + 1),
                    raw: new Uint8Array(0),
                    lastReaction: generateFakeReaction(
                        crypto,
                        new Date(+new Date() - minutesAgo-- * 1000 * 60),
                    ),
                });
                break;
            case MessageDirection.OUTBOUND:
                if (Math.random() < 0.1) {
                    const {fileId} = await file.store(TEST_IMAGE);
                    const {fileId: thumbnailFileId} = await file.store(TEST_THUMBNAIL);
                    conversation.controller.addMessage.fromSync({
                        id: messageId,
                        direction,
                        createdAt: new Date(+new Date() - minutesAgo-- * 1000 * 60),
                        type: 'file',
                        fileName: 'fire.jpg',
                        fileSize: TEST_IMAGE.byteLength,
                        caption: generateFakeText(crypto, randomU8(crypto) / 8 + 1),
                        mediaType: 'image/jpeg',
                        thumbnailMediaType: 'image/jpeg',
                        correlationId: undefined,
                        blobId: ensureBlobId(randomBytes(new Uint8Array(BLOB_ID_LENGTH))),
                        thumbnailBlobId: ensureBlobId(randomBytes(new Uint8Array(BLOB_ID_LENGTH))),
                        encryptionKey: wrapRawBlobKey(randomBytes(new Uint8Array(32))),
                        fileId,
                        thumbnailFileId,
                        lastReaction: generateFakeReaction(
                            crypto,
                            new Date(+new Date() - minutesAgo-- * 1000 * 60),
                        ),
                    });
                } else {
                    conversation.controller.addMessage.fromSync({
                        id: messageId,
                        direction,
                        createdAt: new Date(+new Date() - minutesAgo-- * 1000 * 60),
                        type: 'text',
                        text: generateFakeText(crypto, randomU8(crypto) / 2 + 1),
                        lastReaction: generateFakeReaction(
                            crypto,
                            new Date(+new Date() - minutesAgo-- * 1000 * 60),
                        ),
                    });
                }
                break;
            default:
                unreachable(direction);
        }
    }
}
