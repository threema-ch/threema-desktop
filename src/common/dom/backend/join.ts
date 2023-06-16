/**
 * Device join protocol.
 */

import {type ServicesForBackend} from '~/common/backend';
import {randomU64} from '~/common/crypto/random';
import {type DeviceIds} from '~/common/device';
import {type RendezvousConnection} from '~/common/dom/network/protocol/rendezvous';
import {DeviceJoinError} from '~/common/error';
import {FileStorageError, type StoredFileHandle} from '~/common/file-storage';
import {type Logger} from '~/common/logging';
import {type ProfileSettingsUpdate, type Repositories} from '~/common/model';
import * as protobuf from '~/common/network/protobuf';
import {validate} from '~/common/network/protobuf';
import {join} from '~/common/network/protobuf/js';
import {type EssentialData} from '~/common/network/protobuf/validate/join';
import {type BlobIdString, blobIdToString} from '~/common/network/protocol/blob';
import {
    ensureCspDeviceId,
    ensureD2mDeviceId,
    type IdentityString,
    isNickname,
    type ServerGroup,
} from '~/common/network/types';
import {type RawClientKey, type RawDeviceGroupKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {Delayed} from '~/common/utils/delayed';

type JoinState = 'wait-for-begin' | 'sync-blob-data' | 'sync-essential-data';

type ServicesForDeviceJoinProtocol = Pick<ServicesForBackend, 'crypto' | 'file'>;

/**
 * Data obtained as part of the device join protocol, which is needed to initialize the backend.
 */
interface DeviceJoinResult {
    readonly identity: IdentityString;
    readonly rawCk: RawClientKey;
    readonly serverGroup: ServerGroup;
    readonly deviceIds: DeviceIds;
    readonly dgk: RawDeviceGroupKey;
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
    private _state: JoinState = 'wait-for-begin';

    private readonly _reader: ReadableStreamDefaultReader<Uint8Array>;
    private readonly _writer: WritableStreamDefaultWriter<ReadonlyUint8Array>;
    private readonly _essentialData: Delayed<EssentialData.Type> = new Delayed(
        () => new DeviceJoinError('internal', 'Delayed essential data was read before it was set'),
        () => new DeviceJoinError('internal', 'Delayed essential data was set twice'),
    );

    /**
     * Mapping from {@link BlobIdString} to the {@link StoredFileHandle} as returned by the file
     * storage.
     */
    private readonly _blobIdToFileId: Map<BlobIdString, StoredFileHandle> = new Map();

    public constructor(
        private readonly _rendezvousConnection: RendezvousConnection,
        private readonly _onBegin: () => Promise<void>,
        private readonly _log: Logger,
        private readonly _services: ServicesForDeviceJoinProtocol,
    ) {
        this._reader = this._rendezvousConnection.readable.getReader();
        this._writer = this._rendezvousConnection.writable.getWriter();
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
            const readResult = await this._reader.read();
            if (readResult.done) {
                this._log.info('ULP stream done');
                throw new Error(
                    'Rendezvous connection stream ended before device join was complete',
                );
            }

            // Parse message
            this._log.debug(`New ULP message (${readResult.value.byteLength} bytes)`);
            let parsed;
            try {
                parsed = join.EdToNd.decode(readResult.value);
            } catch (error) {
                throw new DeviceJoinError('encoding', 'Could not decode ULP message with EdToNd', {
                    from: error,
                });
            }

            // Validate message
            let validated: validate.join.EdToNd.Type;
            try {
                validated = validate.join.EdToNd.SCHEMA.parse(parsed);
            } catch (error) {
                throw new DeviceJoinError(
                    'validation',
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
                case 'essentialData':
                    return this._handleEssentialData(validated.essentialData);
                default:
                    unreachable(validated);
            }
        }
    }

    /**
     * Initialize database with data from the `EssentialData` message (i.e. user profile, contacts,
     * settings, etc).
     */
    public async restoreEssentialData(repositories: Repositories): Promise<void> {
        const essentialData = this._essentialData.unwrap();

        // Load profile picture bytes from temporary file
        let profilePicture: ReadonlyUint8Array | undefined;
        const profilePictureBlobId = essentialData.userProfile.profilePicture?.updated.blob.id;
        if (profilePictureBlobId !== undefined) {
            const fileHandle = this._blobIdToFileId.get(blobIdToString(profilePictureBlobId));
            if (fileHandle === undefined) {
                throw new DeviceJoinError(
                    'protocol',
                    'No blob data found for user profile picture',
                );
            }
            try {
                profilePicture = await this._services.file.load(fileHandle);
            } catch (error) {
                let msg = 'Could not load profile picture from file service';
                if (error instanceof FileStorageError) {
                    msg += `: ${error.type}`;
                }
                throw new DeviceJoinError('internal', msg, {from: error});
            }
            await this._services.file.delete(fileHandle.fileId);
        }

        // Profile settings: Nickname and profile picture
        const profile: ProfileSettingsUpdate = {
            nickname: isNickname(essentialData.userProfile.nickname)
                ? essentialData.userProfile.nickname
                : undefined,
            profilePicture,
            profilePictureShareWith: essentialData.userProfile.profilePictureShareWith,
        };
        repositories.user.profileSettings.get().controller.update(profile);

        // TODO(DESK-1038): Contacts
        //const contactImporter = new SafeContactImporter(services);
        //await contactImporter.importFrom(backupData);

        // TODO(DESK-1038): Groups
        //const groupImporter = new SafeGroupImporter(services);
        //groupImporter.importFrom(backupData);
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
        this._rendezvousConnection.abort.raise();
    }

    private _setState(newState: JoinState): void {
        this._log.debug(`State transition from ${this._state} to ${newState}`);
        this._state = newState;
    }

    private async _handleBegin(): Promise<void> {
        this._log.debug(`Received Begin message`);
        if (this._state !== 'wait-for-begin') {
            throw new DeviceJoinError('protocol', `Received Begin message in state ${this._state}`);
        }
        await this._onBegin();
        this._setState('sync-blob-data');
    }

    private async _handleBlobData(blobData: validate.common.BlobData.Type): Promise<void> {
        this._log.debug(`Received BlobData message`);
        if (this._state !== 'sync-blob-data') {
            throw new DeviceJoinError(
                'protocol',
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
                'protocol',
                `Received EssentialData message in state ${this._state}`,
            );
        }
        this._setState('sync-essential-data');

        // Extract data required to initialize the backend
        const identity = essentialData.identityData.identity;
        const rawCk = essentialData.identityData.ck;
        const serverGroup = essentialData.identityData.cspServerGroup;
        const dgk = essentialData.deviceGroupData.dgk;

        // Generate random device IDs
        const deviceIds = {
            d2mDeviceId: ensureD2mDeviceId(randomU64(this._services.crypto)),
            cspDeviceId: ensureCspDeviceId(randomU64(this._services.crypto)),
        };

        // Cache essential data
        this._essentialData.set(essentialData);

        return {identity, rawCk, serverGroup, deviceIds, dgk};
    }
}
