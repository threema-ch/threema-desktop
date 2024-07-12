import type {ServicesForBackend} from '~/common/backend';
import type {Config} from '~/common/config';
import type {
    DatabaseBackend,
    DbContactUid,
    DbConversationUid,
    DbMessageHistory,
    DbMessageReaction,
    DbMessageUid,
    DbReceiverLookup,
    RawDatabaseKey,
} from '~/common/db';
import type {FactoriesForBackend} from '~/common/dom/backend';
import {MessageType, ReceiverType, StatusMessageType} from '~/common/enum';
import {canCopyFiles, copyFiles, type FileId} from '~/common/file-storage';
import type {ServicesForKeyStorage} from '~/common/key-storage';
import type {Logger} from '~/common/logging';
import type {IdentityString} from '~/common/network/types';
import type {LocalSettings} from '~/common/settings';
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

            const uidOfConversationInNewDb = getNewConversationUid(
                oldDb,
                db,
                message.receiverLookup,
                oldDbUidToIdentityMap,
            );

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

                /* eslint-disable max-depth */
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
                /* eslint-enable max-depth */

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
            let newConversationUid = oldToNewConversationUidMap.get(
                statusMessage.message.conversationUid,
            );
            // The conversation does not have a standard message.
            if (newConversationUid === undefined) {
                newConversationUid = getNewConversationUid(
                    oldDb,
                    db,
                    statusMessage.receiverLookup,
                    oldDbUidToIdentityMap,
                );

                if (newConversationUid === undefined) {
                    continue;
                }

                oldToNewConversationUidMap.set(
                    statusMessage.message.conversationUid,
                    newConversationUid,
                );
            }
            db.createStatusMessage({...statusMessage.message, conversationUid: newConversationUid});
        }
    } while (statusMessages.length !== 0);

    // For all conversations that are non-empty, add a status message.
    new Set(oldToNewConversationUidMap.values()).forEach((conversationUid) => {
        const conversation = model.conversations.getByUid(conversationUid);
        conversation?.get().controller.createStatusMessage({
            type: StatusMessageType.CHAT_RESTORED,
            createdAt: new Date(),
            value: {},
        });
    });
    await restoreSettings(services, oldDb);

    // Refresh the cache to directly display the conversations again.
    model.conversations.refreshCache();
}

async function restoreSettings(
    services: Pick<ServicesForBackend, 'model'>,
    oldDb: DatabaseBackend,
): Promise<void> {
    const settings: LocalSettings = {
        appearance:
            oldDb.getSettings('appearance') ?? services.model.user.appearanceSettings.get().view,
        devices: oldDb.getSettings('devices') ?? services.model.user.devicesSettings.get().view,
        media: oldDb.getSettings('media') ?? services.model.user.mediaSettings.get().view,
    };

    // We can directly update the settings through the model to directly see the effects.
    await services.model.user.appearanceSettings.get().controller.update(settings.appearance);
    await services.model.user.devicesSettings.get().controller.update(settings.devices);
    await services.model.user.mediaSettings.get().controller.update(settings.media);
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
 * Find the {@link DbConversationUid} in `db` that corresponds to a lookup in `oldDb`.
 *
 * The parameter oldDbUidToIdentityMap provides a direct lookup from {@link DbContactUid} to
 * {@link IdentityString} in `oldDb` to simplify the lookup in single chats.
 *
 * Returns the corresponding {@link DbConversationUid} in `db` or undefined if the corresponding
 * conversation could not be found.
 */
function getNewConversationUid(
    oldDb: DatabaseBackend,
    db: DatabaseBackend,
    receiverLookup: DbReceiverLookup,
    oldDbUidToIdentityMap: Map<DbContactUid, IdentityString>,
): DbConversationUid | undefined {
    switch (receiverLookup.type) {
        case ReceiverType.CONTACT: {
            // The message was sent in a single chat.
            const identity = oldDbUidToIdentityMap.get(receiverLookup.uid);
            if (identity === undefined) {
                return undefined;
            }

            return db.getContactConversationUidByIdentity(identity);
        }

        case ReceiverType.DISTRIBUTION_LIST:
            // TODO(DESK-236): Implement distribution list.
            throw new Error('TODO(DESK-236): Implement distribution list');

        case ReceiverType.GROUP: {
            // The message was sent in a group chat
            const group = oldDb.getGroupByUid(receiverLookup.uid);
            if (group === undefined) {
                return undefined;
            }
            let creatorIdentity = undefined;
            if (group.creatorUid !== undefined) {
                creatorIdentity = oldDb.getContactByUid(group.creatorUid)?.identity;
                assert(
                    creatorIdentity !== undefined,
                    'Cannot have a group in old database with an unknown creator',
                );
            }

            return db.getGroupConversationUidByCreatorIdentity(creatorIdentity, group.groupId);
        }

        default:
            return unreachable(receiverLookup);
    }
}
