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
import {MessageType} from '~/common/enum';
import {canCopyFiles, copyFilesInBackground, type FileId} from '~/common/file-storage';
import type {ServicesForKeyStorage} from '~/common/key-storage';
import type {Logger} from '~/common/logging';
import type {IdentityString} from '~/common/network/types';
import type {u53} from '~/common/types';
import {assertUnreachable, unreachable} from '~/common/utils/assert';

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
export function transferOldMessages(
    services: Pick<ServicesForBackend, 'config' | 'crypto' | 'file' | 'model'>,
    oldDbKey: RawDatabaseKey,
    db: DatabaseBackend,
    config: Config,
    log: Logger,
    factories: Pick<FactoriesForBackend, 'db' | 'fileStorage'>,
    chunkSize: u53,
): void {
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

            // The message was sent in a single chat
            if (message.lookup.contactReceiverLookup !== undefined) {
                const identity = oldDbUidToIdentityMap.get(message.lookup.contactReceiverLookup);
                if (identity === undefined) {
                    continue;
                }
                uidOfConversationInNewDb = db.getContactConversationUidByIdentity(identity);
                // The message was sent in a group chat
            } else if (message.lookup.groupReceiverLookup !== undefined) {
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
            copyFilesInBackground(oldFileStorage, file, log, messageFileIds).catch(
                assertUnreachable,
            );
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
