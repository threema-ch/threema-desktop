/**
 * Device join protocol.
 */

import {type ServicesForBackend} from '~/common/backend';
import {type RendezvousConnection} from '~/common/dom/network/protocol/rendezvous';
import {DeviceJoinError} from '~/common/error';
import {type StoredFileHandle} from '~/common/file-storage';
import {type Logger} from '~/common/logging';
import {validate} from '~/common/network/protobuf';
import {join} from '~/common/network/protobuf/js';
import {type BlobId} from '~/common/network/protocol/blob';
import {unreachable} from '~/common/utils/assert';

type JoinState = 'wait-for-begin' | 'sync-blob-data' | 'sync-essential-data';

type ServicesForDeviceJoinProtocol = Pick<ServicesForBackend, 'file'>;

export class DeviceJoinProtocol {
    private _state: JoinState = 'wait-for-begin';

    /**
     * Mapping from {@link BlobId} to the {@link StoredFileHandle} as returned by the file storage.
     */
    private readonly _blobIdToFileId: Map<BlobId, StoredFileHandle> = new Map();

    public constructor(
        private readonly _rendezvousConnection: RendezvousConnection,
        private readonly _log: Logger,
        private readonly _services: ServicesForDeviceJoinProtocol,
    ) {}

    /**
     * Run the device join protocol to completion.
     *
     * @throws {@link DeviceJoinError} if something goes wrong
     */
    public async run(): Promise<void> {
        const reader = this._rendezvousConnection.readable.getReader();
        this._log.info('Starting device join protocol, waiting for ULP messages');
        for (;;) {
            // Read next message from stream
            const readResult = await reader.read();
            if (readResult.done) {
                this._log.info('ULP stream done');
                // TODO(DESK-1037): Do we need to throw an error, depending on state?
                return;
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
                    this._handleEssentialData(validated.essentialData);
                    break;
                default:
                    unreachable(validated);
            }
        }
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

    private _handleEssentialData(essentialData: validate.join.EssentialData.Type): void {
        this._log.debug(`Received EssentialData message`);
        if (this._state !== 'sync-blob-data') {
            throw new DeviceJoinError(
                'protocol',
                `Received EssentialData message in state ${this._state}`,
            );
        }
        this._setState('sync-essential-data');
    }
}
