import {MessageDirection} from '~/common/enum';
import {type Logger} from '~/common/logging';
import * as protobuf from '~/common/network/protobuf';
import {toCommonConversationId} from '~/common/network/protobuf/validate/d2d/conversation-id';
import {
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
    PASSIVE_TASK,
} from '~/common/network/protocol/task/';
import {getConversationById} from '~/common/network/protocol/task/message-processing-helpers';
import {unreachable} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';

export class ReflectedOutgoingMessageUpdateTask implements PassiveTask<void> {
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _unvalidatedMessage: protobuf.d2d.OutgoingMessageUpdate,
        private readonly _reflectedDate: Date,
    ) {
        this._log = _services.logging.logger(
            `network.protocol.task.reflected-outgoing-message-update`,
        );
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {model} = this._services;

        // Validate the Protobuf message
        let validatedMessage;
        try {
            validatedMessage = protobuf.validate.d2d.OutgoingMessageUpdate.SCHEMA.parse(
                this._unvalidatedMessage,
            );
        } catch (error) {
            this._log.error(
                `Discarding reflected OutgoingMessageUpdate message due to validation error: ${error}`,
            );
            return;
        }

        this._log.info(
            `Received reflected OutgoingMessageUpdate message referencing ${validatedMessage.updates.length} messages`,
        );

        // Process updates
        for (const update of validatedMessage.updates) {
            const {conversation: d2dConversationId, messageId} = update;

            // Retrieve conversation
            const conversationId = toCommonConversationId(d2dConversationId);
            const conversation = getConversationById(model, conversationId);
            if (conversation === undefined) {
                this._log.warn(`Skipping message update due to missing conversation`);
                continue;
            }

            // Retrieve the associated message
            const message = conversation.get().controller.getMessage(messageId)?.get();
            if (message === undefined) {
                this._log.warn(
                    `Skipping message update due to missing message ${u64ToHexLe(messageId)}`,
                );
                continue;
            }
            if (message.ctx !== MessageDirection.OUTBOUND) {
                this._log.error(
                    `Skipping message update for ${u64ToHexLe(
                        messageId,
                    )} because it is no outbound message`,
                );
                continue;
            }

            // Apply update
            switch (update.update) {
                case 'sent':
                    this._log.debug(`Marking outgoing message ${u64ToHexLe(messageId)} as sent`);
                    message.controller.sent(this._reflectedDate);
                    return;
                default:
                    unreachable(update.update);
            }
        }
    }
}
