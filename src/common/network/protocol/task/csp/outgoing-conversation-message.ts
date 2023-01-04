/**
 * Outgoing message task.
 */
import {type DbReceiverLookup} from '~/common/db';
import {
    type MessageType,
    CspE2eConversationType,
    CspE2eGroupConversationType,
    MessageDirection,
    ReceiverType,
    ReceiverTypeUtils,
} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type AnyMessage, type AnyReceiver, type OutboundMessageFor} from '~/common/model';
import {type CspE2eType, type LayerEncoder} from '~/common/network/protocol';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
    ACTIVE_TASK,
} from '~/common/network/protocol/task';
import {serializeQuoteText} from '~/common/network/protocol/task/common/quotes';
import {
    type IOutgoingCspMessageTaskConstructor,
    type ValidCspMessageTypeForReceiver,
    OutgoingCspMessageTask,
} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import * as structbuf from '~/common/network/structbuf';
import {
    type FileEncodable,
    type GroupMemberContainerEncodable,
    type TextEncodable,
} from '~/common/network/structbuf/csp/e2e';
import {type MessageId} from '~/common/network/types';
import {assert, unreachable} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * The outgoing message task has the following responsibilities:
 *
 * - Upload blobs (if any)
 * - Call the OutgoingCspMessageTask which handles sending, reflection and acks
 *
 * This task is only meant to be used for conversation messages (with an associated message model),
 * not for control messages.
 */
export class OutgoingConversationMessageTask<TReceiver extends AnyReceiver>
    implements ActiveTask<void, 'persistent'>
{
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = true;
    public readonly transaction = undefined;

    private readonly _log: Logger;

    /**
     * Create a new instance of this task. Note that the {@param _messageModel} and {@param _receiverModel} must match.
     */
    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _receiverModel: TReceiver,
        private readonly _messageModel: OutboundMessageFor<MessageType>['model'],
        private readonly _outgoingCspMessageTaskConstructor: IOutgoingCspMessageTaskConstructor = OutgoingCspMessageTask,
    ) {
        // Instantiate logger
        const messageIdHex = u64ToHexLe(_messageModel.view.id);
        this._log = _services.logging.logger(`network.protocol.task.out-message.${messageIdHex}`);
    }

    /**
     * Construct a  {@link OutgoingConversationMessageTask} from lookup params.
     *
     * @throws Error if the conversation for the receiver cannot be found
     * @throws Error if the message does not exist in the conversation.
     * @throws Error if the message is not an outbound message.
     */
    public static fromLookup<TReceiver extends AnyReceiver>(
        services: ServicesForTasks,
        receiver: DbReceiverLookup,
        messageId: MessageId,
    ): OutgoingConversationMessageTask<TReceiver> {
        const {model} = services;
        const messageIdHex = u64ToHexLe(messageId);

        const conversationStore = model.conversations.getForReceiver(receiver);
        if (conversationStore === undefined) {
            throw new Error(`Conversation for receiver ${JSON.stringify(receiver)} not found`);
        }
        const messageStore = conversationStore.get().controller.getMessage(messageId);
        if (messageStore === undefined) {
            throw new Error(`Message with ID ${messageIdHex} not found`);
        }

        const receiverModel = conversationStore.get().controller.receiver().get() as TReceiver;
        const messageModel = messageStore.get() as AnyMessage<'model'>;
        assert(
            messageModel.ctx === MessageDirection.OUTBOUND,
            'Outgoing message task requires outbound messages',
        );

        return new OutgoingConversationMessageTask(services, receiverModel, messageModel);
    }

    public async run(handle: ActiveTaskCodecHandle<'persistent'>): Promise<void> {
        const {view, type: messageType} = this._messageModel;
        this._log.debug(
            `Run for ${ReceiverTypeUtils.nameOf(
                this._receiverModel.type,
            )?.toLowerCase()} ${messageType} message`,
        );

        // Initialize outgoing CSP message task
        const messageView = view;
        const cspMessageFlags = CspMessageFlags.forMessageType(messageType);
        cspMessageFlags.groupMessage = this._receiverModel.type === ReceiverType.GROUP;
        const messageProperties = {
            type: this._getCspE2eType() as ValidCspMessageTypeForReceiver<TReceiver>,
            encoder: this._getCspEncoder(),
            cspMessageFlags,
            messageId: messageView.id,
            createdAt: messageView.createdAt,
            allowUserProfileDistribution: true,
        } as const;
        const outCspMessageTask = new this._outgoingCspMessageTaskConstructor(
            this._services,
            this._receiverModel,
            messageProperties,
        );

        // Run task
        const reflectDate = await outCspMessageTask.run(handle);

        // Mark message as sent, using the reflection date as timestamp
        assert(
            reflectDate !== undefined,
            `OutgoingCspMessageTask did not reflect the message of type ${messageProperties.type}`,
        );
        this._markMessageAsSent(reflectDate);

        // Done
        this._log.info(
            `Reflected and sent ${ReceiverTypeUtils.nameOf(
                this._receiverModel.type,
            )?.toLowerCase()} ${messageType} message`,
        );
    }

    /**
     * Return the layer encoder for the message to be sent (without container).
     */
    private _getCspEncoder(): LayerEncoder<
        TextEncodable | FileEncodable | GroupMemberContainerEncodable
    > {
        let encoder;
        switch (this._messageModel.type) {
            case 'text': {
                // Get message text (or quote V2 text)
                const {quotedMessageId, text: viewText} = this._messageModel.view;
                let textString;
                if (quotedMessageId === undefined) {
                    textString = viewText;
                } else {
                    textString = serializeQuoteText(quotedMessageId, viewText);
                }

                // Encode message
                encoder = structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                    text: UTF8.encode(textString),
                });
                break;
            }
            case 'file':
                throw new Error('TODO(WEBMD-316): Implement support for sending file messages');
            default:
                return unreachable(this._messageModel);
        }

        if (this._receiverModel.type === ReceiverType.GROUP) {
            return structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                groupId: this._receiverModel.view.groupId,
                creatorIdentity: UTF8.encode(this._receiverModel.view.creatorIdentity),
                innerData: encoder,
            });
        } else {
            return encoder;
        }
    }

    /**
     * Determine the CSP E2E Type for the conversation message based on the receiver.
     * It guarantees that {@link ValidCspMessageTypeForReceiver} holds true for the returned value.
     *
     * @returns a valid conversation message type.
     */
    private _getCspE2eType(): CspE2eType {
        if (this._receiverModel.type === ReceiverType.GROUP) {
            switch (this._messageModel.type) {
                case 'text':
                    return CspE2eGroupConversationType.GROUP_TEXT;
                case 'file':
                    return CspE2eGroupConversationType.GROUP_FILE;
                default:
                    return unreachable(this._messageModel);
            }
        } else {
            switch (this._messageModel.type) {
                case 'text':
                    return CspE2eConversationType.TEXT;
                case 'file':
                    return CspE2eConversationType.FILE;
                default:
                    return unreachable(this._messageModel);
            }
        }
    }

    private _markMessageAsSent(date: Date): void {
        this._messageModel.controller.sent(date);
    }
}
