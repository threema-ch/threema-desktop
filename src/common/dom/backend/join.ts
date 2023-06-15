/**
 * Device join protocol.
 */

import {type ServicesForBackend} from '~/common/backend';
import {randomU64} from '~/common/crypto/random';
import {type DeviceIds} from '~/common/device';
import {type RendezvousConnection} from '~/common/dom/network/protocol/rendezvous';
import {DeviceJoinError} from '~/common/error';
import {type StoredFileHandle} from '~/common/file-storage';
import {type Logger} from '~/common/logging';
import * as protobuf from '~/common/network/protobuf';
import {validate} from '~/common/network/protobuf';
import {join} from '~/common/network/protobuf/js';
import {type BlobId} from '~/common/network/protocol/blob';
import {
    ensureCspDeviceId,
    ensureD2mDeviceId,
    type IdentityString,
    type ServerGroup,
} from '~/common/network/types';
import {type RawClientKey, type RawDeviceGroupKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

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

export class DeviceJoinProtocol {
    private _state: JoinState = 'wait-for-begin';

    private readonly _reader: ReadableStreamDefaultReader<Uint8Array>;
    private readonly _writer: WritableStreamDefaultWriter<ReadonlyUint8Array>;

    /**
     * Mapping from {@link BlobId} to the {@link StoredFileHandle} as returned by the file storage.
     */
    private readonly _blobIdToFileId: Map<BlobId, StoredFileHandle> = new Map();

    public constructor(
        private readonly _rendezvousConnection: RendezvousConnection,
        private readonly _log: Logger,
        private readonly _services: ServicesForDeviceJoinProtocol,
    ) {
        this._reader = this._rendezvousConnection.readable.getReader();
        this._writer = this._rendezvousConnection.writable.getWriter();
    }

    /**
     * Run the device join protocol to completion.
     *
     * Note that after this function returns, the `Registered` message has not yet been sent back.
     * Send it using the {@link joinComplete} method once registration is complete.
     *
     * @throws {@link DeviceJoinError} if something goes wrong
     */
    public async run(): Promise<DeviceJoinResult> {
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
                    this._handleBegin();
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
     * Send the `Registered` message through the Rendezvous connection and then close the
     * connection.
     */
    public async joinComplete(): Promise<void> {
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

    private _handleBegin(): void {
        this._log.debug(`Received Begin message`);
        if (this._state !== 'wait-for-begin') {
            throw new DeviceJoinError('protocol', `Received Begin message in state ${this._state}`);
        }
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
        this._blobIdToFileId.set(blobData.id, fileHandle);
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

        return {identity, rawCk, serverGroup, deviceIds, dgk};
    }
}
