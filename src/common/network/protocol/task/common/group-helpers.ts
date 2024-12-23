import {
    AcquaintanceLevel,
    ActivityState,
    ConversationCategory,
    ConversationVisibility,
    CspE2eGroupControlType,
    GroupUserState,
    ReceiverType,
    SyncState,
    VerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, ContactInit, Group} from '~/common/model';
import {ModelStore} from '~/common/model/utils/model-store';
import {encryptAndUploadBlob} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import type {
    ActiveTaskCodecHandle,
    ActiveTaskPersistence,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {OutgoingCspMessagesTask} from '~/common/network/protocol/task/csp/outgoing-csp-messages';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import type {GroupId, GroupMessageReflectSetting, IdentityString} from '~/common/network/types';
import type {ReadonlyUint8Array} from '~/common/types';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {idColorIndex} from '~/common/utils/id-color';

/**
 * Run the common group receive steps as specified by the protocol.
 *
 * Returns the group model and the sender contact (if processing can continue) or undefined (if the
 * message should be discarded and processing should be aborted).
 *
 * TODO(SE-235): Review group receive steps for D2D
 */
export async function commonGroupReceiveSteps<TPersistence extends ActiveTaskPersistence>(
    groupId: GroupId,
    creatorIdentity: IdentityString,
    senderContactOrInit: ModelStore<Contact> | ContactInit,
    handle: ActiveTaskCodecHandle<TPersistence>,
    services: ServicesForTasks,
    log: Logger,
): Promise<
    {readonly group: ModelStore<Group>; readonly senderContact: ModelStore<Contact>} | undefined
> {
    const {model} = services;

    // TODO(DESK-1566): The group creator should not be added as a contact when responding with a
    // group-sync-request! Instead, only necessary information to send a group-sync-request must be
    // returned but no contact should be created.
    async function getCreatorModel(): Promise<Contact | undefined> {
        let creatorModel = services.model.contacts.getByIdentity(creatorIdentity)?.get();
        if (creatorModel === undefined) {
            // Creator contact not found. Note: If group message is wrapped in
            // `group-creator-container`, this situation should never happen. If the message is
            // wrapped in `group-member-container`, then this could be possible.
            const addedContacts = await addGroupContacts([creatorIdentity], handle, services, log);
            if (addedContacts.length < 1) {
                return undefined;
            }
            assert(addedContacts.length === 1, 'addedContacts contained more than one contact');
            creatorModel = unwrap(addedContacts[0]).get();
        }
        return creatorModel;
    }

    // 1. Look up the group
    const group = model.groups.getByGroupIdAndCreator(groupId, creatorIdentity);

    // 2. If the group could not be found:
    if (group === undefined) {
        // 2.1 If the user is the creator of the group (as alleged by the received message), discard
        //     the received message and abort these steps.
        if (creatorIdentity === services.device.identity.string) {
            log.debug(
                'Discarding group message in unknown group where we are supposedly the creator',
            );
            return undefined;
        }

        // 2.2 Send a group-sync-request to the group creator, discard the received message and
        //     abort these steps.
        const creatorModel = await getCreatorModel();
        if (creatorModel === undefined) {
            log.warn(
                `Discarding group message with unknown creator (${creatorIdentity}) that cannot be added to the contacts`,
            );
        } else {
            await sendGroupSyncRequest(groupId, creatorModel, handle, services);
        }
        return undefined;
    }

    // The group exists. Ensure that the sender contact exists as well.
    let senderContact;
    if (senderContactOrInit instanceof ModelStore) {
        senderContact = senderContactOrInit;
    } else {
        log.debug('Received group message from unknown user. Adding user.');
        senderContact = await model.contacts.add.fromRemote(handle, {
            ...senderContactOrInit,
            acquaintanceLevel: AcquaintanceLevel.GROUP_OR_DELETED,
        });
    }

    // 3. If the group is marked as "left":
    const view = group.get().view;
    switch (view.userState) {
        case GroupUserState.LEFT:
        case GroupUserState.KICKED: {
            // 3.1 If the user is the creator of the group, send a group-setup with an empty members
            //     list back to the sender, discard the received message and abort these steps.
            if (view.creator === 'me') {
                await sendEmptyGroupSetup(groupId, senderContact.get(), handle, services);
                return undefined;
            }

            // 3.2 Send a group-leave back to the sender, discard the received message and abort
            //     these steps.
            await sendGroupLeave(groupId, creatorIdentity, senderContact.get(), handle, services);
            return undefined;
        }
        case GroupUserState.MEMBER:
            break;
        default:
            unreachable(view.userState);
    }

    // 4. If the sender is not a member of the group:
    const senderIsMember = group.get().controller.hasMember(senderContact);
    if (!senderIsMember) {
        // 4.1 If the user is the creator of the group, send a group-setup with an empty members
        //     list back to the sender, discard the message and abort these steps.
        if (view.creator === 'me') {
            await sendEmptyGroupSetup(groupId, senderContact.get(), handle, services);
            return undefined;
        }

        // 4.2 Send a group-sync-request to the group creator, discard the message and abort these
        //     steps.
        const creatorModel = await getCreatorModel();
        if (creatorModel === undefined) {
            log.warn(
                `Discarding group message with unknown creator (${creatorIdentity}) that cannot be added to the contacts`,
            );
        } else {
            await sendGroupSyncRequest(groupId, creatorModel, handle, services);
        }
        return undefined;
    }

    // End of common group receive steps
    return {group, senderContact};
}

/**
 * Create (and reflect) contacts for the listed identities, with acquaintance level set to "GROUP".
 *
 * Contacts will be reflected and added to the database (unless invalid or revoked).
 *
 * @returns array of created contact stores
 * @throws {DirectoryError} if directory fetch failed
 */
export async function addGroupContacts(
    identities: IdentityString[],
    handle: ActiveTaskCodecHandle<'volatile'>,
    services: ServicesForTasks,
    log: Logger,
): Promise<ModelStore<Contact>[]> {
    const {directory, model} = services;

    // Look up all public keys in one go
    const identityDataMap = await directory.identities(identities);

    // Add contacts
    const contactStores: ModelStore<Contact>[] = [];
    for (const identity of identities) {
        const fetched = identityDataMap.get(identity);
        assert(
            fetched !== undefined,
            `Directory lookup did not return information for all identities`,
        );

        // Log and skip invalid / revoked identities
        if (fetched.state === ActivityState.INVALID) {
            log.warn(
                `Group member ${identity} is invalid or revoked, not adding it to the database`,
            );
            continue;
        }

        // Add contact with acquaintance level "GROUP"
        const contactStore = await model.contacts.add.fromRemote(handle, {
            identity,
            publicKey: fetched.publicKey,
            firstName: '',
            lastName: '',
            nickname: undefined,
            colorIndex: idColorIndex({type: ReceiverType.CONTACT, identity}),
            createdAt: new Date(),
            verificationLevel: VerificationLevel.UNVERIFIED,
            workVerificationLevel: WorkVerificationLevel.NONE,
            identityType: fetched.type,
            acquaintanceLevel: AcquaintanceLevel.GROUP_OR_DELETED,
            featureMask: fetched.featureMask,
            syncState: SyncState.INITIAL,
            activityState: fetched.state ?? ActivityState.ACTIVE,
            category: ConversationCategory.DEFAULT,
            visibility: ConversationVisibility.SHOW,
        });
        contactStores.push(contactStore);
    }
    return contactStores;
}

/**
 * Send a CSP group sync request to the specified receiver.
 */
export async function sendGroupSyncRequest<TPersistence extends ActiveTaskPersistence>(
    groupId: GroupId,
    receiver: Contact,
    handle: ActiveTaskCodecHandle<TPersistence>,
    services: ServicesForTasks,
): Promise<void> {
    await new OutgoingCspMessagesTask(services, [
        {
            receiver,
            messageProperties: {
                type: CspE2eGroupControlType.GROUP_SYNC_REQUEST,
                encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupCreatorContainer, {
                    groupId,
                    innerData: structbuf.bridge.encoder(structbuf.csp.e2e.GroupSyncRequest, {}),
                }),
                cspMessageFlags: CspMessageFlags.none(),
                messageId: randomMessageId(services.crypto),
                createdAt: new Date(),
                allowUserProfileDistribution: false,
            },
        },
    ]).run(handle);
}

/**
 * Send a CSP group setup message to the specified receiver (a contact or group).
 */
export async function sendGroupSetup<TPersistence extends ActiveTaskPersistence>(
    groupId: GroupId,
    receiver: Contact | Group,
    members: IdentityString[],
    handle: ActiveTaskCodecHandle<TPersistence>,
    services: ServicesForTasks,
    reflect: GroupMessageReflectSetting = 'default',
): Promise<void> {
    let task: OutgoingCspMessagesTask;
    const commonMessageProperties = {
        encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupCreatorContainer, {
            groupId,
            innerData: structbuf.bridge.encoder(structbuf.csp.e2e.GroupSetup, {
                members: members.map((identity) => UTF8.encode(identity)),
            }),
        }),
        cspMessageFlags: CspMessageFlags.none(),
        messageId: randomMessageId(services.crypto),
        createdAt: new Date(),
        allowUserProfileDistribution: true,
        overrideReflectedProperty: reflect === 'never',
    };

    switch (receiver.type) {
        case ReceiverType.CONTACT: {
            task = new OutgoingCspMessagesTask(services, [
                {
                    receiver,
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_SETUP,
                        ...commonMessageProperties,
                    },
                },
            ]);
            break;
        }
        case ReceiverType.GROUP:
            task = new OutgoingCspMessagesTask(services, [
                {
                    receiver,
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_SETUP,
                        ...commonMessageProperties,
                    },
                },
            ]);
            break;
        default:
            unreachable(receiver);
    }
    await task.run(handle);
}

/**
 * Send a CSP group setup message with an empty member list to the specified receiver (a contact).
 */
export async function sendEmptyGroupSetup<TPersistence extends ActiveTaskPersistence>(
    groupId: GroupId,
    receiver: Contact,
    handle: ActiveTaskCodecHandle<TPersistence>,
    services: ServicesForTasks,
): Promise<void> {
    await sendGroupSetup(groupId, receiver, [], handle, services, 'never');
}

/**
 * Send a CSP group name message to the specified receiver (a contact or group).
 */
export async function sendGroupName<TPersistence extends ActiveTaskPersistence>(
    groupId: GroupId,
    receiver: Contact | Group,
    name: string,
    handle: ActiveTaskCodecHandle<TPersistence>,
    services: ServicesForTasks,
): Promise<void> {
    let task: OutgoingCspMessagesTask;
    const commonMessageProperties = {
        encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupCreatorContainer, {
            groupId,
            innerData: structbuf.bridge.encoder(structbuf.csp.e2e.GroupName, {
                name: UTF8.encode(name),
            }),
        }),
        cspMessageFlags: CspMessageFlags.none(),
        messageId: randomMessageId(services.crypto),
        createdAt: new Date(),
        allowUserProfileDistribution: true,
    };

    switch (receiver.type) {
        case ReceiverType.CONTACT: {
            task = new OutgoingCspMessagesTask(services, [
                {
                    receiver,
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_NAME,
                        ...commonMessageProperties,
                    },
                },
            ]);
            break;
        }
        case ReceiverType.GROUP:
            task = new OutgoingCspMessagesTask(services, [
                {
                    receiver,
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_NAME,
                        ...commonMessageProperties,
                    },
                },
            ]);
            break;
        default:
            unreachable(receiver);
    }
    await task.run(handle);
}

/**
 * Send a CSP group set profile picture message to the specified receiver (a contact or group).
 */
export async function sendGroupSetProfilePicture<TPersistence extends ActiveTaskPersistence>(
    groupId: GroupId,
    receiver: Contact | Group,
    profilePicture: ReadonlyUint8Array,
    handle: ActiveTaskCodecHandle<TPersistence>,
    services: ServicesForTasks,
): Promise<void> {
    const blobInfo = await encryptAndUploadBlob(
        services,
        profilePicture,
        BLOB_FILE_NONCE,
        'public',
    );

    let task: OutgoingCspMessagesTask;
    const commonMessageProperties = {
        encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupCreatorContainer, {
            groupId,
            innerData: structbuf.bridge.encoder(structbuf.csp.e2e.SetProfilePicture, {
                pictureBlobId: blobInfo.id as ReadonlyUint8Array as Uint8Array,
                pictureSize: profilePicture.byteLength,
                key: blobInfo.key.unwrap() as ReadonlyUint8Array as Uint8Array,
            }),
        }),
        cspMessageFlags: CspMessageFlags.none(),
        messageId: randomMessageId(services.crypto),
        createdAt: new Date(),
        allowUserProfileDistribution: false,
    };

    switch (receiver.type) {
        case ReceiverType.CONTACT:
            task = new OutgoingCspMessagesTask(services, [
                {
                    receiver,
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE,
                        ...commonMessageProperties,
                    },
                },
            ]);
            break;
        case ReceiverType.GROUP:
            task = new OutgoingCspMessagesTask(services, [
                {
                    receiver,
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE,
                        ...commonMessageProperties,
                    },
                },
            ]);
            break;
        default:
            unreachable(receiver);
    }
    await task.run(handle);
}

/**
 * Send a CSP group delete profile picture message to the specified receiver (a contact or group).
 */
export async function sendGroupDeleteProfilePicture<TPersistence extends ActiveTaskPersistence>(
    groupId: GroupId,
    receiver: Contact | Group,
    handle: ActiveTaskCodecHandle<TPersistence>,
    services: ServicesForTasks,
): Promise<void> {
    let task: OutgoingCspMessagesTask;
    const commonMessageProperties = {
        encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupCreatorContainer, {
            groupId,
            innerData: structbuf.bridge.encoder(structbuf.csp.e2e.DeleteProfilePicture, {}),
        }),
        cspMessageFlags: CspMessageFlags.none(),
        messageId: randomMessageId(services.crypto),
        createdAt: new Date(),
        allowUserProfileDistribution: false,
    };

    switch (receiver.type) {
        case ReceiverType.CONTACT:
            task = new OutgoingCspMessagesTask(services, [
                {
                    receiver,
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE,
                        ...commonMessageProperties,
                    },
                },
            ]);
            break;
        case ReceiverType.GROUP:
            task = new OutgoingCspMessagesTask(services, [
                {
                    receiver,
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE,
                        ...commonMessageProperties,
                    },
                },
            ]);
            break;
        default:
            unreachable(receiver);
    }
    await task.run(handle);
}

/**
 * Send a CSP group leave message to the specified receiver.
 */
async function sendGroupLeave<TPersistence extends ActiveTaskPersistence>(
    groupId: GroupId,
    creatorIdentity: IdentityString,
    receiver: Contact | Group,
    handle: ActiveTaskCodecHandle<TPersistence>,
    services: ServicesForTasks,
): Promise<void> {
    let task: OutgoingCspMessagesTask;
    const commonMessageProperties = {
        encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
            groupId,
            creatorIdentity: UTF8.encode(creatorIdentity),
            innerData: structbuf.bridge.encoder(structbuf.csp.e2e.GroupLeave, {}),
        }),
        cspMessageFlags: CspMessageFlags.none(),
        messageId: randomMessageId(services.crypto),
        createdAt: new Date(),
        allowUserProfileDistribution: false,
    };

    switch (receiver.type) {
        case ReceiverType.CONTACT:
            task = new OutgoingCspMessagesTask(services, [
                {
                    receiver,
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_LEAVE,
                        ...commonMessageProperties,
                    },
                },
            ]);
            break;
        case ReceiverType.GROUP:
            task = new OutgoingCspMessagesTask(services, [
                {
                    receiver,
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_LEAVE,
                        ...commonMessageProperties,
                    },
                },
            ]);
            break;
        default:
            unreachable(receiver);
    }

    await task.run(handle);
}
