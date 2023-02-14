/**
 * Incoming close error payload task.
 */
import {type Logger} from '~/common/logging';
import {
    PASSIVE_TASK,
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import type * as structbuf from '~/common/network/structbuf';
import {UTF8} from '~/common/utils/codec';

/**
 * Process incoming close error payloads.
 */
export class IncomingCloseErrorPayloadTask implements PassiveTask<void> {
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;

    private readonly _log: Logger;
    private readonly _message: structbuf.csp.payload.CloseError;

    public constructor(
        private readonly _services: ServicesForTasks,
        message: structbuf.csp.payload.CloseError,
    ) {
        this._log = _services.logging.logger(`network.protocol.task.in-close-error`);
        this._message = message;
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {systemDialog} = this._services;
        try {
            const text = UTF8.decode(this._message.message);
            this._log.warn(`Server connection closed: ${text}`);
            systemDialog
                .open({type: 'server-alert', context: {text, title: 'Server Connection Closed'}})
                .catch((error) => {
                    this._log.error(`failed to show server alert system dialog: ${error}`);
                });
        } catch (error) {
            this._log.error(`Incoming server alert with invalid UTF-8`);
        }
        // TODO(DESK-200): Handle this._message.canReconnect
    }
}
