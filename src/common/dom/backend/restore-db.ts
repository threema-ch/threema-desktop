import type {ServicesForBackend} from '~/common/backend';
import type {Config} from '~/common/config';
import type {
    DatabaseBackend,
    DbContactUid,
    DbConversationUid,
    DbMessageHistory,
    DbMessageReaction,
    DbMessageUid,
    RawDatabaseKey,
} from '~/common/db';
import type {FactoriesForBackend} from '~/common/dom/backend';
import {MessageType, ReceiverType, StatusMessageType} from '~/common/enum';
import {canCopyFiles, copyFiles, type FileId} from '~/common/file-storage';
import type {ServicesForKeyStorage} from '~/common/key-storage';
import type {Logger} from '~/common/logging';
import type {IdentityString} from '~/common/network/types';
import type {u53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';

/**
 * Checks the password entered by the user against an old profile.
 *
 * Returns the database key if the password was correct
 *
 * @throws If the password was wrong or some other error ocurred during reading of the key storage.
 */
export async function unlockDatabaseKey(
    services: ServicesForKeyStorage,
    password: string,
    log: Logger,
    factories: Pick<FactoriesForBackend, 'keyStorage'>,
): Promise<{dbKey: RawDatabaseKey; oldUserIdentity: IdentityString}> {
    const keyStorage = factories.keyStorage(services, log, true);
    const storageContent = await keyStorage.read(password);
    return {
        dbKey: storageContent.databaseKey,
        oldUserIdentity: storageContent.identityData.identity,
    };
}

/**
 * Transfers the (status) messages from an old profile to the current database.
 *
 * This function takes a database key and unlocks the latest profile's database using that key. It
 * then transfers the (status) messages of the old database to the new database where possible.
 *
 * Additionally, this function copies the files from the system file storage of the old profile to
 * the new profile.
 *
 * Note: If for some reason, the conversation or the contact does not exist in the new database
 * (e.g. the contact was deleted between the creation and the resotration of the old profile), these
 * messages are ignored.
 *
 * @throws If the transfer to the new database failed for some reason.
 */
export async function transferOldMessages(
    services: Pick<ServicesForBackend, 'config' | 'crypto' | 'file' | 'model'>,
    oldDbKey: RawDatabaseKey,
    db: DatabaseBackend,
    config: Config,
    log: Logger,
    factories: Pick<FactoriesForBackend, 'db' | 'fileStorage'>,
    chunkSize: u53,
): Promise<void> {
    const {model, file} = services;

    // Decrypt old database
    const oldDb = factories.db(
        {config},
        log,
        {userIdentity: services.model.user.identity},
        oldDbKey,
        true,
        true,
    );

    // Load the old file storage
    const oldFileStorage = factories.fileStorage(services, log, true);

    const newContacts = db.getAllContactIdentities();

    // A map of conversationUids from the old to the new database
    const oldToNewConversationUidMap = new Map<DbConversationUid, DbConversationUid>();

    // Map the identities in the new db to the uids
    const newDbIdentityToUidMap = new Map<IdentityString, DbContactUid>();
    for (const contact of newContacts) {
        newDbIdentityToUidMap.set(contact.identity, contact.uid);
    }

    // Map the uids of the old databases to the identities
    const oldDbUidToIdentityMap = new Map<DbContactUid, IdentityString>();
    const oldContacts = oldDb.getAllContactIdentities();
    for (const contact of oldContacts) {
        oldDbUidToIdentityMap.set(contact.uid, contact.identity);
    }

    // Check if the new and the old file system support a copying functionality
    const restoreFiles = canCopyFiles(oldFileStorage) && canCopyFiles(file);
    if (!restoreFiles) {
        log.debug(
            'The file storages do not have the functionality to copy, skipping all media files when restoring messages',
        );
    }

    let messages = [];
    let offset = 0;
    do {
        // Get the messages out of the old database
        messages = oldDb.getMessagesByContactIdentities(Array.from(newDbIdentityToUidMap.keys()), {
            limit: chunkSize,
            offset,
        });
        offset += chunkSize;

        const messageFileIds: FileId[] = [];

        for (const message of messages) {
            let uidOfContactInNewDb: DbContactUid | 'me' | undefined = undefined;
            let uidOfConversationInNewDb: DbConversationUid | undefined = undefined;
            if (message.message?.senderContactUid !== undefined) {
                const messageSenderIdentity = oldDbUidToIdentityMap.get(
                    message.message.senderContactUid,
                );
                // Get the uid of the contact with this identity in the new db.
                if (messageSenderIdentity !== undefined) {
                    uidOfContactInNewDb = newDbIdentityToUidMap.get(messageSenderIdentity);
                }

                // If the message sender in the old db was undefined, the sender must be the user.
            } else {
                uidOfContactInNewDb = 'me';
            }

            if (message.lookup.contactReceiverLookup !== undefined) {
                // The message was sent in a single chat
                const identity = oldDbUidToIdentityMap.get(message.lookup.contactReceiverLookup);
                if (identity === undefined) {
                    continue;
                }
                uidOfConversationInNewDb = db.getContactConversationUidByIdentity(identity);
            } else if (message.lookup.groupReceiverLookup !== undefined) {
                // The message was sent in a group chat
                const group = oldDb.getGroupByUid(message.lookup.groupReceiverLookup);
                if (group === undefined) {
                    continue;
                }
                let creatorIdentity = undefined;
                if (group.creatorUid !== undefined) {
                    creatorIdentity = oldDb.getContactByUid(group.creatorUid)?.identity;
                    assert(
                        creatorIdentity !== undefined,
                        'Cannot have a group in old database with an unknown creator',
                    );
                }
                uidOfConversationInNewDb = db.getGroupConversationUidByCreatorIdentity(
                    creatorIdentity,
                    group.groupId,
                );
            } else {
                // TODO(DESK-236)
                continue;
            }

            // If we were not able to find the conversation or the contact in the new db, don't
            // restore the message.
            if (uidOfContactInNewDb === undefined || uidOfConversationInNewDb === undefined) {
                continue;
            }

            // Restore the message
            if (message.message !== undefined) {
                oldToNewConversationUidMap.set(
                    message.message.conversationUid,
                    uidOfConversationInNewDb,
                );

                const innerMessage = message.message;
                const dbMessage = {
                    ...innerMessage,
                    senderContactUid:
                        uidOfContactInNewDb === 'me' ? undefined : uidOfContactInNewDb,
                    conversationUid: uidOfConversationInNewDb,
                };

                let messageUid: DbMessageUid;
                switch (dbMessage.type) {
                    case 'text':
                        messageUid = db.createTextMessage(dbMessage);
                        break;
                    case 'file': {
                        if (dbMessage.fileData?.fileId !== undefined) {
                            messageFileIds.push(dbMessage.fileData.fileId);
                        }
                        if (dbMessage.thumbnailFileData?.fileId !== undefined) {
                            messageFileIds.push(dbMessage.thumbnailFileData.fileId);
                        }

                        messageUid = db.createFileMessage(dbMessage);
                        break;
                    }
                    case 'image': {
                        if (dbMessage.fileData?.fileId !== undefined) {
                            messageFileIds.push(dbMessage.fileData.fileId);
                        }
                        if (dbMessage.thumbnailFileData?.fileId !== undefined) {
                            messageFileIds.push(dbMessage.thumbnailFileData.fileId);
                        }

                        messageUid = db.createImageMessage(dbMessage);
                        break;
                    }
                    case 'video': {
                        if (dbMessage.fileData?.fileId !== undefined) {
                            messageFileIds.push(dbMessage.fileData.fileId);
                        }
                        if (dbMessage.thumbnailFileData?.fileId !== undefined) {
                            messageFileIds.push(dbMessage.thumbnailFileData.fileId);
                        }
                        messageUid = db.createVideoMessage(dbMessage);
                        break;
                    }
                    case 'audio':
                        if (dbMessage.fileData?.fileId !== undefined) {
                            messageFileIds.push(dbMessage.fileData.fileId);
                        }
                        if (dbMessage.thumbnailFileData?.fileId !== undefined) {
                            messageFileIds.push(dbMessage.thumbnailFileData.fileId);
                        }

                        messageUid = db.createAudioMessage(dbMessage);
                        break;
                    case 'deleted':
                        messageUid = db.createDeletedMessage(dbMessage);
                        break;
                    default:
                        unreachable(dbMessage);
                }

                if (innerMessage.type !== MessageType.DELETED) {
                    restoreReactionsAndHistory(
                        db,
                        messageUid,
                        innerMessage.reactions,
                        innerMessage.history,
                    );
                }
            }
        }
        if (restoreFiles) {
            await copyFiles(oldFileStorage, file, log, messageFileIds);
        }
    } while (messages.length !== 0);

    // Now we want to move the status messages;
    offset = 0;
    let statusMessages = [];
    do {
        statusMessages = oldDb.getStatusMessages({limit: chunkSize, offset});
        offset += chunkSize;
        for (const statusMessage of statusMessages) {
            const newConversationUid = oldToNewConversationUidMap.get(
                statusMessage.conversationUid,
            );
            // The conversation does not exist anymore
            if (newConversationUid === undefined) {
                continue;
            }
            db.createStatusMessage({...statusMessage, conversationUid: newConversationUid});
        }
    } while (statusMessages.length !== 0);

    // TODO(DESK-1503) Revert the commit that added this comment.
    if (import.meta.env.BUILD_ENVIRONMENT === 'sandbox') {
        log.debug('Testing database consistency');
        testConsistency(db, oldDb);
    }

    // For all conversations that are non-empty, add a status message.
    new Set(oldToNewConversationUidMap.values()).forEach((conversationUid) => {
        const conversation = model.conversations.getByUid(conversationUid);
        conversation?.get().controller.createStatusMessage({
            type: StatusMessageType.CHAT_RESTORED,
            createdAt: new Date(),
            value: {},
        });
    });

    // Refresh the cache to directly display the conversations again.
    model.conversations.refreshCache();
}

function restoreReactionsAndHistory(
    db: DatabaseBackend,
    messageUid: DbMessageUid,
    reactions: Omit<DbMessageReaction, 'messageUid' | 'uid'>[],
    history: Omit<DbMessageHistory, 'messageUid' | 'uid'>[],
): void {
    reactions.forEach((reaction) => {
        db.createOrUpdateMessageReaction({...reaction, messageUid});
    });

    history.forEach((historyEntry) => {
        db.createMessageHistoryEntry(messageUid, {
            text: historyEntry.text,
            editedAt: historyEntry.editedAt,
        });
    });
}

/**
 * This function compares two databases against each other, checking that the messages have the same
 * content, createdAt timestamp and that they are in the same conversation.
 *
 * TODO(DESK-1503) Revert the commit that added this comment.
 *
 */
function testConsistency(newDatabase: DatabaseBackend, oldDatabase: DatabaseBackend): void {
    const chunkSize = 1000;
    let offset = 0;
    let messages = [];
    do {
        messages = newDatabase.getMessages({limit: chunkSize, offset});
        offset += chunkSize;

        for (const message of messages) {
            // We need to check that we are in the same conversation. The conversation must
            // exist in the old database as well since we base it on messages, and all messages at
            // this point must have come from the backup.
            const conversation = newDatabase.getConversationByUid(message.conversationUid);
            assert(conversation !== undefined, 'Conversation must exist in new database');
            let conversationUidInOldDb;
            switch (conversation.receiver.type) {
                case ReceiverType.CONTACT: {
                    const receiverUid = conversation.receiver.uid;
                    const contactIdentity = newDatabase.getContactByUid(receiverUid)?.identity;
                    assert(contactIdentity !== undefined, 'Contact must exist in new database');
                    conversationUidInOldDb =
                        oldDatabase.getContactConversationUidByIdentity(contactIdentity);
                    assert(
                        conversationUidInOldDb !== undefined,
                        'Single Conversation must exist in old database',
                    );
                    const conversationInOldDb =
                        oldDatabase.getConversationByUid(conversationUidInOldDb);
                    assert(
                        conversationInOldDb !== undefined,
                        'Conversation must exist in old database',
                    );
                    assert(
                        conversationInOldDb.receiver.type === ReceiverType.CONTACT,
                        'Receiver type must be consistent in both databases',
                    );
                    assert(
                        contactIdentity ===
                            oldDatabase.getContactByUid(conversationInOldDb.receiver.uid)?.identity,
                        'Contact identity must be consistent in both databases',
                    );
                    break;
                }
                case ReceiverType.GROUP: {
                    const receiverUid = conversation.receiver.uid;
                    const group = newDatabase.getGroupByUid(receiverUid);
                    assert(group !== undefined, 'Group must exist in new database');
                    const {groupId, creatorUid} = group;
                    let creatorIdentity = undefined;
                    if (creatorUid !== undefined) {
                        creatorIdentity = newDatabase.getContactByUid(creatorUid)?.identity;
                        assert(
                            creatorIdentity !== undefined,
                            'Cannot have a group in old database with an unknown creator',
                        );
                    }
                    conversationUidInOldDb = oldDatabase.getGroupConversationUidByCreatorIdentity(
                        creatorIdentity,
                        groupId,
                    );
                    assert(
                        conversationUidInOldDb !== undefined,
                        'Group Conversation must exist in old database',
                    );
                    const conversationInOldDb =
                        oldDatabase.getConversationByUid(conversationUidInOldDb);
                    assert(
                        conversationInOldDb !== undefined,
                        'Conversation must exist in old database',
                    );
                    assert(conversationInOldDb.receiver.type === ReceiverType.GROUP);
                    const groupInOldDb = oldDatabase.getGroupByUid(
                        conversationInOldDb.receiver.uid,
                    );
                    assert(
                        groupInOldDb !== undefined,
                        'Group with messages must exist in old database',
                    );

                    let oldDbCreatorIdentity = undefined;
                    if (groupInOldDb.creatorUid !== undefined) {
                        oldDbCreatorIdentity = oldDatabase.getContactByUid(
                            groupInOldDb.creatorUid,
                        )?.identity;
                        assert(
                            oldDbCreatorIdentity !== undefined,
                            'Contact of creator must exist in old database',
                        );
                    }

                    assert(
                        creatorIdentity === oldDbCreatorIdentity,
                        'Group creator identity must be consistent in both databases',
                    );
                    assert(
                        groupId === groupInOldDb.groupId,
                        'Group Id identity must be consistent in both databases',
                    );

                    break;
                }
                case ReceiverType.DISTRIBUTION_LIST:
                    // TODO(DESK-236)
                    // Should never happen
                    continue;
                default:
                    unreachable(conversation.receiver);
            }

            const senderIdentity =
                message.senderContactUid === undefined
                    ? undefined
                    : newDatabase.getContactByUid(message.senderContactUid)?.identity;

            const messageUidInOldDatabase = oldDatabase.hasMessageById(
                conversationUidInOldDb,
                message.id,
            );
            assert(messageUidInOldDatabase !== undefined, 'Message must exist in the old database');

            const messageInOldDatabase = oldDatabase.getMessageByUid(messageUidInOldDatabase);
            assert(messageInOldDatabase !== undefined);
            // Now we assert that the message content has stayed the same
            assert(
                message.createdAt.getTime() === messageInOldDatabase.createdAt.getTime(),
                'CreatedAt must be consistent in both databases',
            );
            assert(
                message.deletedAt?.getTime() === messageInOldDatabase.deletedAt?.getTime(),
                'DeletedAt must be consistent in both databases',
            );
            assert(
                message.type === messageInOldDatabase.type,
                'Type must be consistent in both databases',
            );
            assert(
                message.lastEditedAt?.getTime() ===
                    (messageInOldDatabase.type === MessageType.DELETED
                        ? undefined
                        : messageInOldDatabase.lastEditedAt?.getTime()),
                'LastEditedAt must be consistent in both databases',
            );

            if (messageInOldDatabase.senderContactUid !== undefined) {
                const oldDbSenderIdentity = oldDatabase.getContactByUid(
                    messageInOldDatabase.senderContactUid,
                )?.identity;

                assert(
                    senderIdentity === oldDbSenderIdentity,
                    'Sender must be consistent in both databases',
                );
            } else {
                assert(
                    message.senderContactUid === undefined,
                    'Sender must be consistent in both databases, it should be the user',
                );
            }

            // Finally check that the text is the same
            assert(
                message.text === oldDatabase.getMessageText(messageInOldDatabase),
                'The text of the message must be identical',
            );
        }
    } while (messages.length !== 0);
}
