import {ReceiverType} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type AnyReceiver} from '~/common/model';
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
import {type ConversationId, type MessageId} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * A {@link UniqueMessageId} uniquely identifies a message.
 */
interface UniqueMessageId {
    readonly messageId: MessageId;
    readonly conversation: ConversationId;
}

abstract class ReflectMessageUpdateTaskBase {
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly transaction = undefined;

    protected readonly _log: Logger;

    public constructor(
        services: Pick<ServicesForTasks, 'logging'>,
        direction: 'incoming' | 'outgoing',
        protected readonly _uniqueMessageIds: UniqueMessageId[],
    ) {
        this._log = services.logging.logger(
            `network.protocol.task.reflect-${direction}-message-update`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<Date> {
        const messageUpdate = this._getEnvelope();
        this._log.info(
            `Reflecting message update for message(s) ${this._uniqueMessageIds
                .map((msg) => u64ToHexLe(msg.messageId))
                .join(',')}`,
        );
        const [reflectDate] = await handle.reflect([messageUpdate]);
        return reflectDate;
    }

    /**
     * Get a {@link ConversationId.Type} instance for a {@link DbReceiverLookup}.
     */
    protected _getConversationId(receiver: AnyReceiver): D2dConversationId.Type {
        const baseProps = {
            contact: undefined,
            distributionList: undefined,
            group: undefined,
        };
        switch (receiver.type) {
            case ReceiverType.CONTACT:
                return {
                    ...baseProps,
                    id: 'contact',
                    contact: receiver.view.identity,
                };
            case ReceiverType.GROUP:
                return {
                    ...baseProps,
                    id: 'group',
                    group: {
                        groupId: receiver.view.groupId,
                        creatorIdentity: receiver.view.creatorIdentity,
                    },
                };
            case ReceiverType.DISTRIBUTION_LIST:
                // TODO(DESK-237): Support distribution lists
                throw new Error('Receiver type not yet supported');
            default:
                return unreachable(receiver);
        }
    }

    protected abstract _getEnvelope(): protobuf.d2d.IEnvelope;
}

/**
 * Send an OutgoingMessageUpdate.
 *
 * Currently, the update is hardcoded to "sent".
 */
export class ReflectOutgoingMessageUpdateTask
    extends ReflectMessageUpdateTaskBase
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, Date>
{
    public constructor(
        services: Pick<ServicesForTasks, 'logging'>,
        uniqueMessageIds: UniqueMessageId[],
    ) {
        super(services, 'outgoing', uniqueMessageIds);
    }

    protected _getEnvelope(): protobuf.d2d.IEnvelope {
        const validatedMessage = this._getValidatedSentMessage();
        const outgoingMessageUpdate = OutgoingMessageUpdate.serialize(validatedMessage);
        return {outgoingMessageUpdate};
    }

    private _getValidatedSentMessage(): OutgoingMessageUpdate.Type {
        const updates = this._uniqueMessageIds.map((uniqueMessageId) => ({
            messageId: uniqueMessageId.messageId,
            conversation: D2dConversationId.fromCommonConversationId(uniqueMessageId.conversation),
            update: 'sent' as const,
            sent: {},
        }));
        return {
            updates,
        };
    }
}

/**
 * Send an IncomingMessageUpdate.
 *
 * Currently, the update is hardcoded to "read".
 */
export class ReflectIncomingMessageUpdateTask
    extends ReflectMessageUpdateTaskBase
    implements ActiveTask<Date, 'persistent'>
{
    public readonly persist = true;

    public constructor(
        services: Pick<ServicesForTasks, 'logging'>,
        uniqueMessageIds: UniqueMessageId[],
        private readonly _timestamp: Date,
    ) {
        super(services, 'incoming', uniqueMessageIds);
    }

    protected _getEnvelope(): protobuf.d2d.IEnvelope {
        const validatedMessage = this._getValidatedSentMessage();
        const incomingMessageUpdate = IncomingMessageUpdate.serialize(validatedMessage);
        return {incomingMessageUpdate};
    }

    private _getValidatedSentMessage(): IncomingMessageUpdate.Type {
        const updates: IncomingMessageUpdate.Type['updates'] = this._uniqueMessageIds.map(
            (uniqueMessageId) => ({
                messageId: uniqueMessageId.messageId,
                conversation: D2dConversationId.fromCommonConversationId(
                    uniqueMessageId.conversation,
                ),
                update: 'read',
                read: {
                    at: this._timestamp,
                },
            }),
        );
        return {
            updates,
        };
    }
}
