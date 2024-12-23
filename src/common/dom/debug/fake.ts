import type {I18nLocales} from '~/app/ui/i18n-types';
import type {ServicesForBackend} from '~/common/backend';
import {type CryptoBackend, ensurePublicKey} from '~/common/crypto';
import {randomChoice, randomString, randomU8, randomU64} from '~/common/crypto/random';
import {randomBytes} from '~/common/dom/crypto/random';
import {
    getTranslatedValue,
    SCREENSHOT_DATA_JSON_SCHEMA,
    type ScreenshotDataJsonGroup,
    type ScreenshotDataJson,
    type ScreenshotDataJsonContact,
} from '~/common/dom/debug/screenshot-data';
import {TEST_IMAGE, TEST_THUMBNAIL} from '~/common/dom/debug/testdata';
import {
    AcquaintanceLevel,
    ActivityState,
    ConversationCategory,
    ConversationVisibility,
    GroupUserState,
    IdentityType,
    IdentityTypeUtils,
    ImageRenderingType,
    MessageDirection,
    type MessageReaction,
    MessageReactionUtils,
    ReceiverType,
    SyncState,
    VerificationLevelUtils,
    WorkVerificationLevel,
    WorkVerificationLevelUtils,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact} from '~/common/model';
import type {ContactModelStore} from '~/common/model/contact';
import type {GroupModelStore} from '~/common/model/group';
import type {ModelStore} from '~/common/model/utils/model-store';
import {BLOB_ID_LENGTH, ensureBlobId} from '~/common/network/protocol/blob';
import {parsePossibleTextQuote} from '~/common/network/protocol/task/common/quotes';
import {randomMessageId} from '~/common/network/protocol/utils';
import {
    ensureFeatureMask,
    ensureIdentityString,
    ensureMessageId,
    FEATURE_MASK_FLAG,
    type IdentityString,
    type GroupId,
} from '~/common/network/types';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import type {u53} from '~/common/types';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import {idColorIndex} from '~/common/utils/id-color';
import {hasProperty} from '~/common/utils/object';

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
export async function generateFakeContactConversation({
    crypto,
    device,
    file,
    model,
}: Pick<ServicesForBackend, 'crypto' | 'device' | 'file' | 'model'>): Promise<void> {
    // Add contact
    const identity = ensureIdentityString(`Q${randomString(crypto, 7).toUpperCase()}`);
    const contact = model.contacts.add.direct({
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
            FEATURE_MASK_FLAG.VOICE_MESSAGE_SUPPORT | FEATURE_MASK_FLAG.FILE_MESSAGE_SUPPORT,
        ),
        syncState: SyncState.INITIAL,
        category: ConversationCategory.DEFAULT,
        visibility: ConversationVisibility.SHOW,
    });

    // Add message(s)
    const nowMs = new Date().getTime();
    const messageCount = randomChoice(crypto, [1, 3, 7, 32, 100]);
    let minutesAgo = 240;
    for (let i = 0; i < messageCount; i++) {
        const conversation = contact.get().controller.conversation().get();
        const messageId = ensureMessageId(randomU64(crypto));
        const direction = randomChoice<MessageDirection>(crypto, [
            MessageDirection.INBOUND,
            MessageDirection.OUTBOUND,
        ]);
        const reaction = generateFakeReaction(crypto, new Date(nowMs - minutesAgo-- * 1000 * 60));

        switch (direction) {
            case MessageDirection.INBOUND:
                {
                    const modelStore = conversation.controller.addMessage.direct({
                        id: messageId,
                        direction,
                        sender: contact.ctx,
                        createdAt: new Date(nowMs - minutesAgo-- * 1000 * 60),
                        receivedAt: new Date(nowMs - minutesAgo-- * 1000 * 60),
                        type: 'text',
                        text: generateFakeText(crypto, randomU8(crypto) / 2 + 1),
                        raw: new Uint8Array(0),
                    });
                    if (reaction !== undefined) {
                        modelStore
                            .get()
                            .controller.reaction.direct(
                                reaction.type,
                                reaction.at,
                                device.identity.string,
                            );
                    }
                }
                break;
            case MessageDirection.OUTBOUND:
                if (Math.random() < 0.1) {
                    const fileData = await file.store(TEST_IMAGE);
                    const thumbnailFileData = await file.store(TEST_THUMBNAIL);
                    const modelStore = conversation.controller.addMessage.direct({
                        id: messageId,
                        direction,
                        createdAt: new Date(nowMs - minutesAgo-- * 1000 * 60),
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
                        fileData,
                        thumbnailFileData,
                    });
                    if (reaction !== undefined) {
                        modelStore
                            .get()
                            .controller.reaction.direct(
                                reaction.type,
                                reaction.at,
                                contact.get().view.identity,
                            );
                    }
                } else {
                    const modelStore = conversation.controller.addMessage.direct({
                        id: messageId,
                        direction,
                        createdAt: new Date(nowMs - minutesAgo-- * 1000 * 60),
                        type: 'text',
                        text: generateFakeText(crypto, randomU8(crypto) / 2 + 1),
                    });
                    if (reaction !== undefined) {
                        modelStore
                            .get()
                            .controller.reaction.direct(
                                reaction.type,
                                reaction.at,
                                contact.get().view.identity,
                            );
                    }
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
export async function generateFakeGroupConversation({
    crypto,
    file,
    model,
}: Pick<ServicesForBackend, 'crypto' | 'file' | 'model'>): Promise<void> {
    const contacts = model.contacts.getAll();

    if (contacts.get().size === 0) {
        throw new Error('To generate a group, please add some contacts');
    }

    const contactObjects: ModelStore<Contact>[] = [];

    contacts.get().forEach((contact) => {
        contactObjects.push(contact);
    });

    const group = model.groups.add.direct(
        {
            groupId: randomU64(crypto) as GroupId,
            creator: 'me',
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
        contactObjects,
    );

    // Add message(s)
    const messageCount = randomChoice(crypto, [3, 7, 32, 42]);
    const nowMs = new Date().getTime();
    let minutesAgo = 240;

    for (let i = 0; i < messageCount; i++) {
        const reactions: {
            reaction: {
                readonly at: Date;
                readonly type: MessageReaction;
            };
            senderIdentity: IdentityString;
        }[] = [];
        for (const contact of contacts.get()) {
            const reaction = generateFakeReaction(
                crypto,
                new Date(nowMs - minutesAgo-- * 1000 * 60),
            );
            if (reaction !== undefined) {
                reactions.push({
                    reaction,
                    senderIdentity: contact.get().view.identity,
                });
            }
        }
        // Set a random group contact
        const senderContact = randomChoice(crypto, contactObjects);

        const conversation = group.get().controller.conversation().get();
        const messageId = ensureMessageId(randomU64(crypto));
        const direction = randomChoice<MessageDirection>(crypto, [
            MessageDirection.INBOUND,
            MessageDirection.OUTBOUND,
        ]);

        switch (direction) {
            case MessageDirection.INBOUND: {
                const modelStore = conversation.controller.addMessage.direct({
                    id: messageId,
                    direction,
                    sender: senderContact.ctx,
                    createdAt: new Date(nowMs - minutesAgo-- * 1000 * 60),
                    receivedAt: new Date(nowMs - minutesAgo-- * 1000 * 60),
                    type: 'text',
                    text: generateFakeText(crypto, randomU8(crypto) / 2 + 1),
                    raw: new Uint8Array(0),
                });
                for (const reaction of reactions) {
                    modelStore
                        .get()
                        .controller.reaction.direct(
                            reaction.reaction.type,
                            reaction.reaction.at,
                            reaction.senderIdentity,
                        );
                }
                break;
            }
            case MessageDirection.OUTBOUND:
                if (Math.random() < 0.1) {
                    const fileData = await file.store(TEST_IMAGE);
                    const thumbnailFileData = await file.store(TEST_THUMBNAIL);
                    const modelStore = conversation.controller.addMessage.direct({
                        id: messageId,
                        direction,
                        createdAt: new Date(nowMs - minutesAgo-- * 1000 * 60),
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
                        fileData,
                        thumbnailFileData,
                    });
                    for (const reaction of reactions) {
                        modelStore
                            .get()
                            .controller.reaction.direct(
                                reaction.reaction.type,
                                reaction.reaction.at,
                                reaction.senderIdentity,
                            );
                    }
                } else {
                    const modelStore = conversation.controller.addMessage.direct({
                        id: messageId,
                        direction,
                        createdAt: new Date(nowMs - minutesAgo-- * 1000 * 60),
                        type: 'text',
                        text: generateFakeText(crypto, randomU8(crypto) / 2 + 1),
                    });
                    for (const reaction of reactions) {
                        modelStore
                            .get()
                            .controller.reaction.direct(
                                reaction.reaction.type,
                                reaction.reaction.at,
                                reaction.senderIdentity,
                            );
                    }
                }
                break;
            default:
                unreachable(direction);
        }
    }
}

/**
 * Return the screenshot reference timestamp (today 08:15).
 */
function getReferenceTimestamp(): Date {
    const date = new Date();
    date.setHours(8);
    date.setMinutes(15);
    return date;
}

/**
 * Import data for screenshots from JSON file.
 */
export async function importScreenshotData(
    services: Pick<ServicesForBackend, 'crypto' | 'device' | 'file' | 'model'>,
    log: Logger,
    locale: I18nLocales,
): Promise<void> {
    log.info('importScreenshotData: Starting');
    const {device, model} = services;

    // Import JSON data if present
    let data: ScreenshotDataJson = {
        contacts: [],
        groups: [],
    };
    const jsonFiles = import.meta.glob('./screenshot-data-*.json', {eager: true});
    const filename = `./screenshot-data-${import.meta.env.BUILD_VARIANT}.json`;
    if (hasProperty(jsonFiles, filename)) {
        const json = jsonFiles[filename];
        data = SCREENSHOT_DATA_JSON_SCHEMA.parse(json);
    }

    // Set own profile
    if (data.profile !== undefined) {
        model.user.profileSettings.get().controller.update({
            nickname: data.profile.nickname,
            profilePicture: {
                blob: data.profile.profilePicture,
            },
            profilePictureShareWith: {group: 'everyone'},
        });
    }

    // Add contacts
    for (const contact of data.contacts) {
        // Create contact
        const identity = ensureIdentityString(contact.identity);
        if (model.contacts.getByIdentity(identity) !== undefined) {
            // Contact already exists
            log.warn(`Skipping contact ${identity}, already exists`);
            continue;
        }
        log.info(`Adding contact with ID ${identity}`);
        const contactModel = model.contacts.add.direct({
            identity,
            publicKey: contact.publicKey,
            createdAt: getReferenceTimestamp(),
            firstName: getTranslatedValue(contact.name, locale).first,
            lastName: getTranslatedValue(contact.name, locale).last,
            nickname: undefined,
            colorIndex: idColorIndex({type: ReceiverType.CONTACT, identity}),
            identityType: contact.identityType,
            verificationLevel: VerificationLevelUtils.fromNumber(contact.verificationLevel),
            workVerificationLevel:
                contact.identityType === IdentityType.WORK
                    ? WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED
                    : WorkVerificationLevel.NONE,
            acquaintanceLevel: contact.acquaintanceLevel,
            activityState: ActivityState.ACTIVE,
            featureMask: ensureFeatureMask(
                // eslint-disable-next-line no-bitwise
                FEATURE_MASK_FLAG.VOICE_MESSAGE_SUPPORT | FEATURE_MASK_FLAG.FILE_MESSAGE_SUPPORT,
            ),
            syncState: SyncState.INITIAL,
            category: ConversationCategory.DEFAULT,
            visibility: ConversationVisibility.SHOW,
        });

        // Set profile picture
        if (contact.avatar !== undefined) {
            contactModel
                .get()
                .controller.profilePicture.get()
                .controller.setPicture.direct(contact.avatar, 'user-defined');
        }

        // Create conversation
        if (contact.conversation.length > 0) {
            await addConversationMessages(
                contactModel,
                contact.conversation,
                services,
                log,
                locale,
            );
        }
    }

    // Add groups
    for (const group of data.groups) {
        // Look up group contacts
        const groupMemberUids = [];
        let isMember = false;
        for (const member of group.members) {
            if (member === 'me') {
                isMember = true;
                continue;
            }
            const contact = model.contacts.getByIdentity(member);
            assert(contact !== undefined, `Group contact not found for identity ${member}`);
            groupMemberUids.push(contact);
        }

        // Create group
        const groupName = getTranslatedValue(group.name, locale);
        if (
            model.groups.getByGroupIdAndCreator(
                group.id,
                group.creator === 'me' ? device.identity.string : group.creator,
            )
        ) {
            // Group already exists
            log.warn(`Skipping group ${groupName}, already exists`);
            continue;
        }
        log.info(`Adding group with name ${groupName}`);
        const createdAt = new Date(
            getReferenceTimestamp().getTime() - group.createdMinutesAgo * 60 * 1000,
        );
        const groupModel = model.groups.add.direct(
            {
                groupId: group.id,
                creator: 'me',
                name: groupName,
                createdAt,
                lastUpdate: createdAt,
                colorIndex: idColorIndex({
                    type: ReceiverType.GROUP,
                    groupId: group.id,
                    creatorIdentity:
                        group.creator === 'me' ? device.identity.string : group.creator,
                }),
                userState:
                    isMember || group.creator === 'me'
                        ? GroupUserState.MEMBER
                        : GroupUserState.LEFT,
                category: ConversationCategory.DEFAULT,
                visibility: ConversationVisibility.SHOW,
            },
            groupMemberUids,
        );

        // Set profile picture
        if (group.avatar !== undefined) {
            groupModel
                .get()
                .controller.profilePicture.get()
                .controller.setPicture.direct(group.avatar, 'admin-defined');
        }

        // Create conversation
        if (group.conversation.length > 0) {
            await addConversationMessages(groupModel, group.conversation, services, log, locale);
        }
    }

    log.info('importScreenshotData: Done');
}

/**
 * Add conversation messages from screenshot data.
 */
async function addConversationMessages(
    receiver: ContactModelStore | GroupModelStore,
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
    messages: ScreenshotDataJsonContact['conversation'] | ScreenshotDataJsonGroup['conversation'],
    {crypto, device, file, model}: Pick<ServicesForBackend, 'crypto' | 'device' | 'file' | 'model'>,
    log: Logger,
    locale: I18nLocales,
): Promise<void> {
    const conversation = receiver.get().controller.conversation().get();
    for (const message of messages) {
        let content;

        const messageId = message.messageId ?? randomMessageId(crypto);
        const messageDate = new Date(
            getReferenceTimestamp().getTime() - message.minutesAgo * 60 * 1000,
        );
        const reactions: {
            readonly at: Date;
            readonly type: MessageReaction;
            readonly senderIdentity: IdentityString;
        }[] = (message.reactions ?? []).map((reaction, idx) => {
            const randomOffset = randomU8(crypto);
            return {
                at: new Date(messageDate.getTime() + idx * 60 * 1000 * randomOffset),
                type: reaction.reaction,
                senderIdentity:
                    reaction.senderIdentity === 'me'
                        ? device.identity.string
                        : reaction.senderIdentity,
            };
        });

        switch (message.type) {
            case 'TEXT': {
                const messageText =
                    message.contentQuoteV2 !== undefined
                        ? getTranslatedValue(message.contentQuoteV2, locale)
                        : getTranslatedValue(message.content, locale);
                const quoteInfo = parsePossibleTextQuote(messageText, log, messageId);
                content = {
                    type: 'text',
                    text: quoteInfo?.comment ?? messageText,
                    quotedMessageId: quoteInfo?.quotedMessageId,
                } as const;
                break;
            }
            case 'FILE': {
                const fileData = await file.store(message.content.fileBytes);
                content = {
                    type: 'file',
                    fileData,
                    fileName: message.content.fileName,
                    mediaType: message.content.mediaType,
                    fileSize: message.content.fileBytes.byteLength,
                    blobId: ensureBlobId(randomBytes(new Uint8Array(BLOB_ID_LENGTH))),
                    encryptionKey: wrapRawBlobKey(randomBytes(new Uint8Array(32))),
                    caption:
                        message.content.caption !== undefined
                            ? getTranslatedValue(message.content.caption, locale)
                            : undefined,
                } as const;
                break;
            }
            case 'IMAGE': {
                const fileData = await file.store(message.content.imageBytes);
                const thumbnailFileData = await file.store(message.content.imageBytes);
                content = {
                    type: 'image',
                    fileData,
                    thumbnailFileData,
                    mediaType: message.content.mediaType,
                    thumbnailMediaType: message.content.mediaType,
                    fileSize: message.content.imageBytes.byteLength,
                    blobId: ensureBlobId(randomBytes(new Uint8Array(BLOB_ID_LENGTH))),
                    thumbnailBlobId: ensureBlobId(randomBytes(new Uint8Array(BLOB_ID_LENGTH))),
                    encryptionKey: wrapRawBlobKey(randomBytes(new Uint8Array(32))),
                    renderingType: ImageRenderingType.REGULAR,
                    caption:
                        message.content.caption !== undefined
                            ? getTranslatedValue(message.content.caption, locale)
                            : undefined,
                    dimensions: undefined,
                    animated: false,
                } as const;
                break;
            }
            default:
                log.warn(`Ignoring message of type ${message.type}`);
                continue;
        }

        switch (message.direction) {
            case MessageDirection.INBOUND: {
                let senderUid;
                switch (receiver.type) {
                    case ReceiverType.CONTACT:
                        senderUid = receiver.ctx;
                        break;
                    case ReceiverType.GROUP: {
                        const senderContact = model.contacts.getByIdentity(
                            unwrap(message.identity, 'Group message sender not found'),
                        );
                        senderUid = unwrap(senderContact).ctx;
                        break;
                    }
                    default:
                        unreachable(receiver);
                }
                const modelStore = conversation.controller.addMessage.direct({
                    id: messageId,
                    direction: message.direction,
                    sender: senderUid,
                    createdAt: messageDate,
                    receivedAt: messageDate,
                    readAt: unwrap(message.isRead) ? messageDate : undefined,
                    raw: new Uint8Array(0),
                    ...content,
                });
                for (const reaction of reactions) {
                    modelStore
                        .get()
                        .controller.reaction.direct(
                            reaction.type,
                            reaction.at,
                            reaction.senderIdentity,
                        );
                }
                break;
            }
            case MessageDirection.OUTBOUND: {
                const modelStore = conversation.controller.addMessage.direct({
                    id: messageId,
                    direction: message.direction,
                    createdAt: messageDate,
                    readAt: messageDate,
                    ...content,
                });
                for (const reaction of reactions) {
                    modelStore
                        .get()
                        .controller.reaction.direct(
                            reaction.type,
                            reaction.at,
                            reaction.senderIdentity,
                        );
                }
                break;
            }
            default:
                throw new Error(`Invalid message direction: ${message.direction}`);
        }
    }
}
