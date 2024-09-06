import {CspE2eStatusUpdateType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact} from '~/common/model';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import type {MessageProperties} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {OutgoingCspMessagesTask} from '~/common/network/protocol/task/csp/outgoing-csp-messages';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import type {TypingIndicatorEncodable} from '~/common/network/structbuf/csp/e2e';

export class OutgoingTypingIndicatorTask<TReceiver extends Contact>
    implements ActiveTask<void, 'volatile'>
{
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = false;
    public readonly transaction = undefined;
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _receiver: TReceiver,
        private readonly _isTyping: boolean,
    ) {
        this._log = _services.logging.logger(`network.protocol.task.outgoing-typing-indicator`);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        const isTyping = this._isTyping ? 1 : 0;
        this._log.debug(`Sending typing indicator with value '${isTyping}'`);
        const messageProperties: MessageProperties<
            TypingIndicatorEncodable,
            CspE2eStatusUpdateType
        > = {
            type: CspE2eStatusUpdateType.TYPING_INDICATOR,
            encoder: structbuf.bridge.encoder(structbuf.csp.e2e.TypingIndicator, {
                isTyping,
            }),
            cspMessageFlags: CspMessageFlags.fromPartial({dontQueue: true, dontAck: true}),
            messageId: randomMessageId(this._services.crypto),
            createdAt: new Date(),
            allowUserProfileDistribution: false,
        } as const;

        const messageTask = new OutgoingCspMessagesTask(this._services, [
            {receiver: this._receiver, messageProperties},
        ]);

        await messageTask.run(handle);
    }
}
