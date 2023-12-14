import type {Logger} from '~/common/logging';
import type * as protobuf from '~/common/network/protobuf';
import {
    ConversationId as D2dConversationId,
    IncomingMessageUpdate,
    OutgoingMessageUpdate,
} from '~/common/network/protobuf/validate/d2d';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ComposableTask,
    type ServicesForTasks,
} from '~/common/network/protocol/task/';
import type {ConversationId, MessageId} from '~/common/network/types';
import {chunk} from '~/common/utils/array';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * A {@link UniqueMessageId} uniquely identifies a message.
 */
interface UniqueMessageId {
    readonly messageId: MessageId;
    readonly conversation: ConversationId;
}

/**
 * Send an OutgoingMessageUpdate.
 *
 * Currently, the update is hardcoded to "sent".
 */
export class ReflectOutgoingMessageUpdateTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, Date>
{
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly transaction = undefined;

    protected readonly _log: Logger;
    public constructor(
        services: Pick<ServicesForTasks, 'logging'>,
        private readonly _uniqueMessageId: UniqueMessageId,
    ) {
        this._log = services.logging.logger(
            `network.protocol.task.reflect-outgoing-message-update`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<Date> {
        const messageUpdate = this._getEnvelope();
        this._log.info(
            `Reflecting message update for referenced message: ${this._uniqueMessageId.messageId}`,
        );
        const [reflectDate] = await handle.reflect([messageUpdate]);
        return reflectDate;
    }

    protected _getEnvelope(): protobuf.d2d.IEnvelope {
        const validatedMessage = this._getValidatedSentMessage();
        const outgoingMessageUpdate = OutgoingMessageUpdate.serialize(validatedMessage);
        return {outgoingMessageUpdate};
    }

    private _getValidatedSentMessage(): OutgoingMessageUpdate.Type {
        const updates = [
            {
                messageId: this._uniqueMessageId.messageId,
                conversation: D2dConversationId.fromCommonConversationId(
                    this._uniqueMessageId.conversation,
                ),
                update: 'sent' as const,
                sent: {},
            },
        ];
        return {updates};
    }
}

/**
 * Send an IncomingMessageUpdate.
 *
 * Currently, the update is hardcoded to "read".
 */
export class ReflectIncomingMessageUpdateTask implements ActiveTask<void, 'persistent'> {
    public readonly persist = true;
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly transaction = undefined;

    protected readonly _log: Logger;

    private readonly _chunkSize = 512;

    public constructor(
        services: Pick<ServicesForTasks, 'logging'>,
        private readonly _uniqueMessageIds: UniqueMessageId[],
        private readonly _timestamp: Date,
    ) {
        this._log = services.logging.logger(
            `network.protocol.task.reflect-incoming-message-update`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        for (const group of chunk(this._uniqueMessageIds, this._chunkSize)) {
            const messageUpdate = this._getEnvelope(group);
            this._log.info(`Reflecting a chunk of ${group.length} message updates`);
            this._log.debug(
                `Reflecting message update for referenced message(s): ${group
                    .map((msg) => u64ToHexLe(msg.messageId))
                    .join(',')}`,
            );
            await handle.reflect([messageUpdate]);
        }
    }

    protected _getEnvelope(group: UniqueMessageId[]): protobuf.d2d.IEnvelope {
        const validatedMessage = this._getValidatedSentMessage(group);
        const incomingMessageUpdate = IncomingMessageUpdate.serialize(validatedMessage);
        return {incomingMessageUpdate};
    }

    private _getValidatedSentMessage(group: UniqueMessageId[]): IncomingMessageUpdate.Type {
        const updates: IncomingMessageUpdate.Type['updates'] = group.map((uniqueMessageId) => ({
            messageId: uniqueMessageId.messageId,
            conversation: D2dConversationId.fromCommonConversationId(uniqueMessageId.conversation),
            update: 'read',
            read: {
                at: this._timestamp,
            },
        }));
        return {
            updates,
        };
    }
}
