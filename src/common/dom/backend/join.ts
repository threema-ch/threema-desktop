/**
 * Device join protocol.
 */

import {type RendezvousConnection} from '~/common/dom/network/protocol/rendezvous';
import {DeviceJoinError} from '~/common/error';
import {type Logger} from '~/common/logging';
import {validate} from '~/common/network/protobuf';
import {join} from '~/common/network/protobuf/js';

type JoinState = 'wait-for-begin' | 'sync-blob-data' | 'sync-essential-data';

export class DeviceJoinProtocol {
    private _state: JoinState = 'wait-for-begin';

    public constructor(
        private readonly _rendezvousConnection: RendezvousConnection,
        private readonly _log: Logger,
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
            this._log.debug('New ULP message:', readResult.value);
            let parsed;
            try {
                parsed = join.EdToNd.decode(readResult.value);
            } catch (error) {
                throw new DeviceJoinError('encoding', 'Could not decode ULP message with EdToNd', {
                    from: error,
                });
            }
            this._log.debug('Parsed ULP message:', parsed);

            // Validate message
            let validated;
            try {
                validated = validate.join.EdToNd.SCHEMA.parse(parsed);
            } catch (error) {
                throw new DeviceJoinError('validation', 'Could not validate EdToNd message', {
                    from: error,
                });
            }
            this._log.debug('Validated ULP message:', validated);
        }
    }
}
