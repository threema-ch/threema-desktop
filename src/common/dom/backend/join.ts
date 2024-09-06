/**
 * Device join protocol.
 */
import type {ServicesForBackend} from '~/common/backend';
import type {NonceHash} from '~/common/crypto';
import {randomU64} from '~/common/crypto/random';
import type {DeviceIds, ThreemaWorkCredentials} from '~/common/device';
import type {RendezvousConnection} from '~/common/dom/network/protocol/rendezvous';
import {ReceiverType} from '~/common/enum';
import {DeviceJoinError, RendezvousCloseError} from '~/common/error';
import {FileStorageError, type StoredFileHandle} from '~/common/file-storage';
import type {Logger} from '~/common/logging';
import type {Repositories} from '~/common/model';
import type {ContactModelStore} from '~/common/model/contact';
import {groupDebugString} from '~/common/model/group';
import type {ProfileSettingsUpdate} from '~/common/model/types/settings';
import * as protobuf from '~/common/network/protobuf';
import {validate} from '~/common/network/protobuf';
import {join} from '~/common/network/protobuf/js';
import type {EssentialData} from '~/common/network/protobuf/validate/join';
import {type BlobId, type BlobIdString, blobIdToString} from '~/common/network/protocol/blob';
import type {RendezvousCloseCause} from '~/common/network/protocol/rendezvous';
import {
    type ConversationId,
    ensureCspDeviceId,
    ensureD2mDeviceId,
    type IdentityString,
    isNickname,
    type ServerGroup,
    type DeviceCookie,
} from '~/common/network/types';
import type {RawClientKey, RawDeviceGroupKey} from '~/common/network/types/keys';
import type {ReadonlyUint8Array} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {Delayed} from '~/common/utils/delayed';
import {idColorIndex} from '~/common/utils/id-color';
import type {AbortRaiser} from '~/common/utils/signal';
import {mapValitaDefaultsToUndefined} from '~/common/utils/valita-helpers';

type JoinState = 'wait-for-begin' | 'sync-blob-data' | 'sync-essential-data';

type ServicesForDeviceJoinProtocol = Pick<ServicesForBackend, 'crypto' | 'file'>;

/**
 * Data obtained as part of the device join protocol, which is needed to initialize the backend.
 */
export interface DeviceJoinResult {
    readonly identity: IdentityString;
    readonly rawCk: RawClientKey;
    readonly serverGroup: ServerGroup;
    readonly deviceIds: DeviceIds;
    readonly cspDeviceCookie: DeviceCookie;
    readonly dgk: RawDeviceGroupKey;
    readonly cspHashedNonces: Set<NonceHash>;
    readonly d2dHashedNonces: Set<NonceHash>;
    readonly workCredentials?: ThreemaWorkCredentials;
}

/**
 * Device Join Protocol
 *
 * This class has the following responsibilities:
 *
 * - Run the device join protocol over an existing rendezvous connection
 * - Restore essential data into the database
 *
 * Use it as follows:
 *
 * 1. Create instance using rendezvous connection
 * 2. Call {@link join()}, store join result
 * 3. Instantiate key storage and backend using information in join result
 * 4. Call {@link restoreEssentialData()} to initialize database with data from the `EssentialData`
 *    message (i.e. contacts, settings, etc)
 * 5. Establish connection with and register at Mediator server
 * 6. Call {@link complete()} to send the `Registered` message to the existing device, and to close
 *    the message
 */
export class DeviceJoinProtocol {
    public abort: AbortRaiser<RendezvousCloseCause>;

    private readonly _reader: ReadableStreamDefaultReader<Uint8Array>;
    private readonly _writer: WritableStreamDefaultWriter<ReadonlyUint8Array>;
    private readonly _essentialData = new Delayed<EssentialData.Type>(
        () =>
            new DeviceJoinError(
                {kind: 'internal'},
                'Delayed essential data was read before it was set',
            ),
        () => new DeviceJoinError({kind: 'internal'}, 'Delayed essential data was set twice'),
    );

    /**
     * Mapping from {@link BlobIdString} to the {@link StoredFileHandle} as returned by the file
     * storage.
     */
    private readonly _blobIdToFileId = new Map<BlobIdString, StoredFileHandle>();

    private _state: JoinState = 'wait-for-begin';

    public constructor(
        private readonly _rendezvousConnection: RendezvousConnection,
        private readonly _onBegin: () => Promise<void>,
        private readonly _log: Logger,
        private readonly _services: ServicesForDeviceJoinProtocol,
    ) {
        this._reader = this._rendezvousConnection.readable.getReader();
        this._writer = this._rendezvousConnection.writable.getWriter();
        this.abort = this._rendezvousConnection.abort;
    }

    /**
     * Run the device join protocol until we received essential data.
     *
     * @throws {@link DeviceJoinError} if something goes wrong
     */
    public async join(): Promise<DeviceJoinResult> {
        this._log.info('Starting device join protocol, waiting for ULP messages');
        for (;;) {
            // Read next message from stream
            let readResult;
            try {
                readResult = await this._reader.read();
            } catch (error) {
                throw new DeviceJoinError(
                    {
                        kind: 'connection',
                        cause: error instanceof RendezvousCloseError ? error.cause : 'unknown',
                    },
                    'Rendezvous connection stream ended before device join was complete',
                    {from: error},
                );
            }
            if (readResult.done) {
                this._log.info('ULP stream done');
                throw new DeviceJoinError(
                    {kind: 'connection', cause: 'closed'},
                    'Rendezvous connection stream ended before device join was complete',
                );
            }

            // Parse message
            this._log.debug(`New ULP message (${readResult.value.byteLength} bytes)`);
            let parsed;
            try {
                parsed = join.EdToNd.decode(readResult.value);
            } catch (error) {
                throw new DeviceJoinError(
                    {kind: 'encoding'},
                    'Could not decode ULP message with EdToNd',
                    {
                        from: error,
                    },
                );
            }

            // Validate message
            let validated: validate.join.EdToNd.Type;
            try {
                validated = validate.join.EdToNd.SCHEMA.parse(parsed);
            } catch (error) {
                throw new DeviceJoinError(
                    {kind: 'validation'},
                    `Could not validate EdToNd message: ${error}`,
                    {
                        from: error,
                    },
                );
            }

            switch (validated.content) {
                case 'begin':
                    await this._handleBegin();
                    break;
                case 'blobData':
                    await this._handleBlobData(validated.blobData);
                    break;
                case 'essentialData': {
                    // If nonces were deduplicated during validation, log an error
                    assert(parsed.essentialData !== null && parsed.essentialData !== undefined);
                    if (
                        parsed.essentialData.cspHashedNonces.length >
                        validated.essentialData.cspHashedNonces.size
                    ) {
                        this._log.error(
                            `Essential data contained ${
                                parsed.essentialData.cspHashedNonces.length -
                                validated.essentialData.cspHashedNonces.size
                            } duplicate CSP nonces`,
                        );
                    }
                    if (
                        parsed.essentialData.d2dHashedNonces.length >
                        validated.essentialData.d2dHashedNonces.size
                    ) {
                        this._log.error(
                            `Essential data contained ${
                                parsed.essentialData.d2dHashedNonces.length -
                                validated.essentialData.d2dHashedNonces.size
                            } duplicate D2D nonces`,
                        );
                    }

                    return this._handleEssentialData(validated.essentialData);
                }
                default:
                    unreachable(validated);
            }
        }
    }

    /**
     * Initialize database with data from the `EssentialData` message (i.e. user profile, contacts,
     * settings, etc).
     */
    public async restoreEssentialData(
        repositories: Repositories,
        ownIdentity: IdentityString,
    ): Promise<void> {
        const essentialData = this._essentialData.unwrap();

        // Load profile picture bytes from temporary file
        let profilePictureData: ReadonlyUint8Array | undefined = undefined;
        const profilePictureBlobId = essentialData.userProfile.profilePicture?.updated.blob.id;
        const key = essentialData.userProfile.profilePicture?.updated.blob.key;
        if (profilePictureBlobId !== undefined) {
            profilePictureData = await this._loadFileContents(
                profilePictureBlobId,
                'user profile picture',
            );
        }

        // Profile settings: Nickname and profile picture
        const profile: ProfileSettingsUpdate = {
            nickname: isNickname(essentialData.userProfile.nickname)
                ? essentialData.userProfile.nickname
                : undefined,
            profilePicture:
                profilePictureData === undefined
                    ? undefined
                    : // These should all be defined. However, when they are undefined for some
                      // reason, gracefully set them as undefined. Whenever the `profile picture
                      // distribtuion steps` are run and these are detected undefined, the blob is
                      // uploaded and the corresponding fields are set.
                      {
                          blob: profilePictureData,
                          blobId: profilePictureBlobId,
                          lastUploadedAt:
                              essentialData.userProfile.profilePicture?.updated.blob.uploadedAt,
                          key,
                      },
            profilePictureShareWith: essentialData.userProfile.profilePictureShareWith,
        };
        await repositories.user.profileSettings.get().controller.update(profile);

        // Contacts and groups
        await this._restoreContacts(essentialData.contacts, repositories);
        await this._restoreGroups(essentialData.groups, repositories, ownIdentity);
        // TODO(DESK-236): Import distribution lists
    }

    /**
     * Send the `Registered` message through the Rendezvous connection and then close the
     * connection.
     */
    public async complete(): Promise<void> {
        // Send `Registered` message
        const encoder = protobuf.utils.encoder(protobuf.join.NdToEd, {
            content: 'registered',
            registered: protobuf.utils.creator(protobuf.join.Registered, {}),
        });
        await this._writer.write(encoder.encode(new Uint8Array(encoder.byteLength())));

        // Close connection
        this._reader.releaseLock();
        this._rendezvousConnection.abort.raise('complete');
    }

    /**
     * Load file contents for the specified {@link blobId} from the file system, then delete the file.
     */
    private async _loadFileContents(blobId: BlobId, subject: string): Promise<ReadonlyUint8Array> {
        const fileHandle = this._blobIdToFileId.get(blobIdToString(blobId));
        if (fileHandle === undefined) {
            throw new DeviceJoinError({kind: 'protocol'}, `No blob data found for ${subject}`);
        }

        let bytes;
        try {
            bytes = await this._services.file.load(fileHandle);
        } catch (error) {
            let msg = `Could not load ${subject} from file service`;
            if (error instanceof FileStorageError) {
                msg += `: ${error.type}`;
            }
            throw new DeviceJoinError({kind: 'internal'}, msg, {from: error});
        }

        await this._services.file.delete(fileHandle.fileId);
        return bytes;
    }

    /**
     * Restore contacts into database.
     */
    private async _restoreContacts(
        contacts: EssentialData.Type['contacts'],
        repositories: Repositories,
    ): Promise<void> {
        for (const {contact, lastUpdateAt} of contacts) {
            this._log.debug(`Restoring contact ${contact.identity}`);

            // Basic data
            const contactModelStore = repositories.contacts.add.fromSync(
                mapValitaDefaultsToUndefined({
                    identity: contact.identity,
                    publicKey: contact.publicKey,
                    createdAt: contact.createdAt,
                    firstName: contact.firstName ?? '',
                    lastName: contact.lastName ?? '',
                    nickname: contact.nickname,
                    verificationLevel: contact.verificationLevel,
                    workVerificationLevel: contact.workVerificationLevel,
                    identityType: contact.identityType,
                    acquaintanceLevel: contact.acquaintanceLevel,
                    activityState: contact.activityState,
                    featureMask: contact.featureMask,
                    syncState: contact.syncState,
                    readReceiptPolicyOverride: contact.readReceiptPolicyOverride,
                    typingIndicatorPolicyOverride: contact.typingIndicatorPolicyOverride,
                    notificationTriggerPolicyOverride: contact.notificationTriggerPolicyOverride,
                    notificationSoundPolicyOverride: contact.notificationSoundPolicyOverride,
                    lastUpdate: lastUpdateAt,
                    colorIndex: idColorIndex({
                        type: ReceiverType.CONTACT,
                        identity: contact.identity,
                    }),
                    category: contact.conversationCategory,
                    visibility: contact.conversationVisibility,
                } as const),
            );

            // Profile pictures
            const profilePictureController = contactModelStore
                .get()
                .controller.profilePicture.get().controller;
            const contactDefinedProfilePictureBlobId =
                contact.contactDefinedProfilePicture?.updated.blob.id;
            if (contactDefinedProfilePictureBlobId !== undefined) {
                const bytes = await this._loadFileContents(
                    contactDefinedProfilePictureBlobId,
                    'contact-defined contact profile picture',
                );
                profilePictureController.setPicture.fromSync(bytes, 'contact-defined');
            }
            const userDefinedProfilePictureBlobId =
                contact.userDefinedProfilePicture?.updated.blob.id;
            if (userDefinedProfilePictureBlobId !== undefined) {
                const bytes = await this._loadFileContents(
                    userDefinedProfilePictureBlobId,
                    'user-defined contact profile picture',
                );
                profilePictureController.setPicture.fromSync(bytes, 'user-defined');
            }
        }
    }

    /**
     * Restore groups into database.
     *
     * Note: Must be called after contact import!
     */
    private async _restoreGroups(
        groups: EssentialData.Type['groups'],
        repositories: Repositories,
        ownIdentity: IdentityString,
    ): Promise<void> {
        for (const {group, lastUpdateAt} of groups) {
            const debugString = groupDebugString(
                group.groupIdentity.creatorIdentity,
                group.groupIdentity.groupId,
            );
            this._log.debug(`Restoring group ${debugString}`);

            // Collect group members. We assume that all contacts must have been restored in the
            // contact restore step. A missing contact is treated as an invalid group.
            const members = [];
            for (const member of group.memberIdentities.identities) {
                // Sanity check: Our own identity must not be part of the members list
                if (member === ownIdentity) {
                    throw new DeviceJoinError(
                        {kind: 'protocol'},
                        `Group ${groupDebugString} contained user's own identity as member`,
                    );
                }
                const contact = repositories.contacts.getByIdentity(member);
                if (contact === undefined) {
                    throw new DeviceJoinError(
                        {kind: 'protocol'},
                        `Group ${groupDebugString} could not be imported, member ${member} not found in database`,
                    );
                }
                members.push(contact);
            }

            let creator: ContactModelStore | undefined = undefined;
            // Get the creator uid if the user is not the creator.
            if (group.groupIdentity.creatorIdentity !== ownIdentity) {
                creator = repositories.contacts.getByIdentity(group.groupIdentity.creatorIdentity);
                if (creator === undefined) {
                    throw new DeviceJoinError(
                        {kind: 'protocol'},
                        `Group ${groupDebugString} could not be imported, creator ${group.groupIdentity.creatorIdentity} not found in database`,
                    );
                }
            }

            // Add group
            const conversationId: ConversationId = {
                type: ReceiverType.GROUP,
                creatorIdentity: group.groupIdentity.creatorIdentity,
                groupId: group.groupIdentity.groupId,
            };
            const groupModelStore = repositories.groups.add.fromSync(
                mapValitaDefaultsToUndefined({
                    groupId: group.groupIdentity.groupId,
                    creator: creator ?? 'me',
                    createdAt: group.createdAt,
                    lastUpdate: lastUpdateAt,
                    name: group.name,
                    colorIndex: idColorIndex(conversationId),
                    userState: group.userState,
                    notificationTriggerPolicyOverride: group.notificationTriggerPolicyOverride,
                    notificationSoundPolicyOverride: group.notificationSoundPolicyOverride,
                    category: group.conversationCategory,
                    visibility: group.conversationVisibility,
                } as const),
                members,
            );

            // Profile picture
            const profilePictureController = groupModelStore
                .get()
                .controller.profilePicture.get().controller;
            const profilePictureBlobId = group.profilePicture?.updated.blob.id;
            if (profilePictureBlobId !== undefined) {
                const bytes = await this._loadFileContents(
                    profilePictureBlobId,
                    'group profile picture',
                );
                profilePictureController.setPicture.fromSync(bytes, 'admin-defined');
            }

            this._log.debug(`Group ${debugString} successfully imported`);
        }
    }

    private _setState(newState: JoinState): void {
        this._log.debug(`State transition from ${this._state} to ${newState}`);
        this._state = newState;
    }

    private async _handleBegin(): Promise<void> {
        this._log.debug(`Received Begin message`);
        if (this._state !== 'wait-for-begin') {
            throw new DeviceJoinError(
                {kind: 'protocol'},
                `Received Begin message in state ${this._state}`,
            );
        }
        await this._onBegin();
        this._setState('sync-blob-data');
    }

    private async _handleBlobData(blobData: validate.common.BlobData.Type): Promise<void> {
        this._log.debug(`Received BlobData message`);
        if (this._state !== 'sync-blob-data') {
            throw new DeviceJoinError(
                {kind: 'protocol'},
                `Received BlobData message in state ${this._state}`,
            );
        }

        const fileHandle = await this._services.file.store(blobData.data);
        this._blobIdToFileId.set(blobIdToString(blobData.id), fileHandle);
    }

    private _handleEssentialData(
        essentialData: validate.join.EssentialData.Type,
    ): DeviceJoinResult {
        this._log.debug(`Received EssentialData message`);
        if (this._state !== 'sync-blob-data') {
            throw new DeviceJoinError(
                {kind: 'protocol'},
                `Received EssentialData message in state ${this._state}`,
            );
        }
        this._setState('sync-essential-data');

        // Extract data required to initialize the backend
        const identity = essentialData.identityData.identity;
        const rawCk = essentialData.identityData.ck;
        const serverGroup = essentialData.identityData.cspServerGroup;
        const dgk = essentialData.deviceGroupData.dgk;
        const cspHashedNonces = essentialData.cspHashedNonces;
        const d2dHashedNonces = essentialData.d2dHashedNonces;
        const workCredentials = essentialData.workCredentials;

        // Generate random device IDs
        const deviceIds = {
            d2mDeviceId: ensureD2mDeviceId(randomU64(this._services.crypto)),
            cspDeviceId: ensureCspDeviceId(randomU64(this._services.crypto)),
        };

        const cspDeviceCookie = essentialData.identityData.cspDeviceCookie;

        // Cache essential data
        this._essentialData.set(essentialData);

        return {
            identity,
            rawCk,
            serverGroup,
            deviceIds,
            dgk,
            cspDeviceCookie,
            cspHashedNonces,
            d2dHashedNonces,
            workCredentials,
        };
    }
}
