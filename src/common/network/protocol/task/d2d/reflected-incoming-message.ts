import {
    type MessageType,
    CspE2eConversationType,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    CspE2eStatusUpdateType,
    MessageDirection,
    ReceiverType,
} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type Contact, type MessageFor} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {
    type ComposableTask,
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
    PASSIVE_TASK,
} from '~/common/network/protocol/task';
import {parsePossibleTextQuote} from '~/common/network/protocol/task/common/quotes';
import {ReflectedDeliveryReceiptTask} from '~/common/network/protocol/task/d2d/reflected-delivery-receipt';
import {
    type AnyInboundMessageInitFragment,
    type InboundTextMessageInitFragment,
    getConversationById,
} from '~/common/network/protocol/task/message-processing-helpers';
import type * as structbuf from '~/common/network/structbuf';
import {
    type ContactConversationId,
    type GroupConversationId,
    type MessageId,
} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';

import {ReflectedGroupNameTask} from './reflected-group-name';
import {ReflectedIncomingGroupLeaveTask} from './reflected-incoming-group-leave';
import {ReflectedIncomingGroupSetupTask} from './reflected-incoming-group-setup';
import {ReflectedMessageTaskBase} from './reflected-message';

type CommonInboundMessageInitFragment = Omit<
    MessageFor<MessageDirection.INBOUND, MessageType, 'init'>,
    'id' | 'sender' | 'type'
>;

/**
 * The message processing instructions determine how an incoming message should be processed.
 */
type MessageProcessingInstructions =
    | ConversationMessageInstructions
    | GroupControlMessageInstructions
    | StatusUpdateInstructions;

interface BaseProcessingInstructions {
    /**
     * A constant indicating the category (e.g. `conversation-message` or `status-update`).
     */
    readonly messageCategory: string;
}

interface ConversationMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'conversation-message';
    /**
     * Conversation to which this message belongs.
     */
    readonly conversationId: ContactConversationId | GroupConversationId;
    readonly initFragment: AnyInboundMessageInitFragment;
}

interface GroupControlMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'group-control';
    /**
     * The subtask to run for processing the group control message.
     */
    readonly task: ComposableTask<PassiveTaskCodecHandle, unknown>;
}

interface StatusUpdateInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'status-update';
    /**
     * The subtask to run for processing the status update.
     */
    readonly task: ComposableTask<PassiveTaskCodecHandle, unknown>;
}

export class ReflectedIncomingMessageTask
    extends ReflectedMessageTaskBase<protobuf.d2d.IncomingMessage>
    implements PassiveTask<void>
{
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;

    public constructor(
        services: ServicesForTasks,
        unvalidatedMessage: protobuf.d2d.IncomingMessage,
        private readonly _reflectedAt: Date,
    ) {
        super(services, unvalidatedMessage, 'incoming');
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {model} = this._services;

        // Validate the Protobuf message
        const validationResult = this._validateProtobuf(
            this._unvalidatedMessage,
            protobuf.validate.d2d.IncomingMessage.SCHEMA,
        );
        if (validationResult === undefined) {
            return;
        }
        const {validatedMessage, messageTypeDebug} = validationResult;
        const {type, body, senderIdentity} = validatedMessage;

        this._log.info(`Received reflected incoming ${messageTypeDebug} message`);

        // Decode Body
        const validatedBody = this._decodeMessage(type, body, messageTypeDebug);
        if (validatedBody === undefined) {
            return;
        }

        // Look up sender contact
        const senderContact = model.contacts.getByIdentity(senderIdentity);
        if (senderContact === undefined) {
            this._log.error(
                `Discarding ${this._direction} ${messageTypeDebug} message due to missing sender contact`,
            );
            return;
        }

        // Get processing instructions
        let instructions;
        try {
            instructions = this._getInstructionsForMessage(
                validatedBody,
                senderContact,
                validatedMessage.messageId,
                validatedMessage.createdAt,
                this._reflectedAt,
            );
        } catch (error) {
            this._log.info(
                `Discarding reflected incoming ${messageTypeDebug} message with invalid content: ${error}`,
            );
            return;
        }
        if (instructions === 'discard') {
            this._log.info(`Discarding reflected incoming ${messageTypeDebug} message`);
            return;
        }

        // Process / save the message
        switch (instructions.messageCategory) {
            case 'conversation-message': {
                // Get conversation
                const conversation = getConversationById(model, instructions.conversationId);
                if (conversation === undefined) {
                    this._log.error(
                        `Discarding ${this._direction} ${messageTypeDebug} message because conversation was not found in database`,
                    );
                    return;
                }

                // Discard message if it has been already received
                if (conversation.get().controller.hasMessage(validatedMessage.messageId)) {
                    this._log.warn(
                        `Discarding ${this._direction} ${messageTypeDebug} message ${validatedMessage.messageId} as it was already received`,
                    );
                    return;
                }

                // Add message to conversation
                this._log.debug(`Saving ${this._direction} ${messageTypeDebug} message`);
                void conversation.get().controller.addMessage.fromSync({
                    ...instructions.initFragment,
                    direction: MessageDirection.INBOUND,
                    sender: senderContact.ctx,
                    id: validatedMessage.messageId,
                });
                break;
            }

            case 'group-control':
            case 'status-update': {
                this._log.debug('Running the sub-task');
                await instructions.task.run(handle);
                break;
            }

            default:
                unreachable(instructions);
        }
    }

    /**
     * Process the validated message body. Return processing instructions depending on the message
     * type.
     *
     * @param validatedBody The decoded and validated message body (decoded `padded-data` inside
     *   `container`).
     * @param senderIdentity The sender identity string.
     * @param messageId The message ID of the message.
     * @param createdAt Original creation timestamp of the incoming message.
     * @param reflectedAt The timestamp when this message was put into the reflection queue.
     */
    private _getInstructionsForMessage(
        validatedBody: structbuf.validate.csp.e2e.ValidatedCspE2eTypes,
        senderContact: LocalModelStore<Contact>,
        messageId: MessageId,
        createdAt: Date,
        reflectedAt: Date,
    ): MessageProcessingInstructions | 'discard' {
        const senderIdentity = senderContact.get().view.identity;
        const commonFragment = this._getCommonMessageInitFragment(createdAt, reflectedAt);
        switch (validatedBody.type) {
            // Contact conversation messages
            case CspE2eConversationType.TEXT: {
                const initFragment = getTextMessageInitFragment(
                    validatedBody.message,
                    commonFragment,
                    this._log,
                    messageId,
                );
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId: {type: ReceiverType.CONTACT, identity: senderIdentity},
                    initFragment,
                };
                return instructions;
            }

            // Group conversation messages
            case CspE2eGroupConversationType.GROUP_TEXT: {
                const initFragment = getTextMessageInitFragment(
                    validatedBody.message,
                    commonFragment,
                    this._log,
                    messageId,
                );
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId: {
                        type: ReceiverType.GROUP,
                        creatorIdentity: validatedBody.container.creatorIdentity,
                        groupId: validatedBody.container.groupId,
                    },
                    initFragment,
                };
                return instructions;
            }

            // Group control messages
            case CspE2eGroupControlType.GROUP_SETUP: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedIncomingGroupSetupTask(
                        this._services,
                        messageId,
                        senderIdentity,
                        reflectedAt,
                        validatedBody.container,
                        validatedBody.message,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_NAME: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedGroupNameTask(
                        this._services,
                        messageId,
                        senderIdentity,
                        validatedBody.container,
                        validatedBody.message,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_LEAVE: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedIncomingGroupLeaveTask(
                        this._services,
                        messageId,
                        senderContact,
                        validatedBody.container,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_REQUEST_SYNC:
                // Ignore, must be processed by leader only
                return 'discard';

            // Status messages
            case CspE2eStatusUpdateType.DELIVERY_RECEIPT: {
                // Since this is a reflected incoming delivery receipt, we expect that it's a
                // reaction to an outbound message.
                const expectedMessageDirection = MessageDirection.OUTBOUND;
                const instructions: StatusUpdateInstructions = {
                    messageCategory: 'status-update',
                    task: new ReflectedDeliveryReceiptTask(
                        this._services,
                        messageId,
                        {type: ReceiverType.CONTACT, identity: senderIdentity},
                        validatedBody.message,
                        createdAt,
                        expectedMessageDirection,
                    ),
                };
                return instructions;
            }

            default:
                return unreachable(validatedBody);
        }
    }

    /**
     * Return the common inbound message init fragment.
     */
    private _getCommonMessageInitFragment(
        createdAt: Date,
        reflectedAt: Date,
    ): CommonInboundMessageInitFragment {
        return {
            createdAt,
            receivedAt: reflectedAt,
            raw: this._unvalidatedMessage.body,
        };
    }
}

function getTextMessageInitFragment(
    message: structbuf.validate.csp.e2e.Text.Type,
    commonFragment: CommonInboundMessageInitFragment,
    log: Logger,
    messageId: MessageId,
): InboundTextMessageInitFragment {
    const possibleQuote = parsePossibleTextQuote(message.text, log, messageId);
    const text = possibleQuote?.comment ?? message.text;

    return {
        ...commonFragment,
        type: 'text',
        text,
        quotedMessageId: possibleQuote?.quotedMessageId,
    };
}
