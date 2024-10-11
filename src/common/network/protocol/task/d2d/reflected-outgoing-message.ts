import {NONCE_REUSED} from '~/common/crypto/nonce';
import {
    CspE2eConversationType,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    CspE2eStatusUpdateType,
    MessageDirection,
    type MessageType,
    NonceScope,
    ReceiverType,
    ReceiverTypeUtils,
    CspE2eGroupStatusUpdateType,
    CspE2eMessageUpdateType,
    CspE2eGroupMessageUpdateType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {MessageFor} from '~/common/model/types/message';
import * as protobuf from '~/common/network/protobuf';
import {
    type ComposableTask,
    PASSIVE_TASK,
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {
    getFileBasedMessageTypeAndExtraProperties,
    messageStoreHasThumbnail,
} from '~/common/network/protocol/task/common/file';
import {getTextForLocation} from '~/common/network/protocol/task/common/location';
import {parsePossibleTextQuote} from '~/common/network/protocol/task/common/quotes';
import {ReflectedDeliveryReceiptTask} from '~/common/network/protocol/task/d2d/reflected-delivery-receipt';
import {ReflectedGroupCallStartTask} from '~/common/network/protocol/task/d2d/reflected-group-call-start';
import {ReflectedGroupNameTask} from '~/common/network/protocol/task/d2d/reflected-group-name';
import {ReflectedGroupProfilePictureTask} from '~/common/network/protocol/task/d2d/reflected-group-profile-picture';
import {ReflectedMessageTaskBase} from '~/common/network/protocol/task/d2d/reflected-message';
import {ReflectedMessageContentUpdateTask} from '~/common/network/protocol/task/d2d/reflected-message-content-update';
import {ReflectedOutgoingGroupLeaveTask} from '~/common/network/protocol/task/d2d/reflected-outgoing-group-leave';
import {ReflectedOutgoingGroupSetupTask} from '~/common/network/protocol/task/d2d/reflected-outgoing-group-setup';
import {
    type AnyOutboundMessageInitFragment,
    getConversationById,
    messageReferenceDebugFor,
    type OutboundAudioMessageInitFragment,
    type OutboundFileMessageInitFragment,
    type OutboundImageMessageInitFragment,
    type OutboundTextMessageInitFragment,
    type OutboundVideoMessageInitFragment,
} from '~/common/network/protocol/task/message-processing-helpers';
import type * as structbuf from '~/common/network/structbuf';
import type {
    ContactConversationId,
    ConversationId,
    D2mDeviceId,
    GroupConversationId,
    MessageId,
} from '~/common/network/types';
import {assert, unreachable} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {u64ToHexLe} from '~/common/utils/number';

type CommonOutboundMessageInitFragment = Omit<
    MessageFor<MessageDirection.OUTBOUND, MessageType, 'init'>,
    'id' | 'type' | 'ordinal' | 'reactions'
>;

/**
 * The message processing instructions determine how an incoming message should be processed.
 */
type MessageProcessingInstructions =
    | ConversationMessageInstructions
    | GroupControlMessageInstructions
    | MessageContentUpdateInstructions
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
    readonly initFragment: AnyOutboundMessageInitFragment;
}

interface GroupControlMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'group-control';
    /**
     * The subtask to run for processing the group control message.
     */
    readonly task: ComposableTask<PassiveTaskCodecHandle, unknown>;
}

interface MessageContentUpdateInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'message-content-update';
    readonly task: ComposableTask<PassiveTaskCodecHandle, unknown>;
}

interface StatusUpdateInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'status-update';
    /**
     * The subtask to run for processing the status update.
     */
    readonly task: ComposableTask<PassiveTaskCodecHandle, unknown>;
}

export class ReflectedOutgoingMessageTask
    extends ReflectedMessageTaskBase<protobuf.d2d.OutgoingMessage>
    implements PassiveTask<void>
{
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;

    public constructor(
        services: ServicesForTasks,
        unvalidatedMessage: protobuf.d2d.OutgoingMessage,
        senderDeviceId: D2mDeviceId,
        private readonly _reflectedAt: Date,
    ) {
        super(services, unvalidatedMessage, senderDeviceId, 'outgoing');
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {model, nonces} = this._services;

        // Validate the Protobuf message
        const validationResult = this._validateProtobuf(
            this._unvalidatedMessage,
            protobuf.validate.d2d.OutgoingMessage.SCHEMA,
        );
        if (validationResult === undefined) {
            return;
        }
        const {validatedMessage, messageTypeDebug} = validationResult;
        const {
            type,
            body,
            conversation: d2dConversationId,
            nonces: messageNonces,
        } = validatedMessage;

        // Debug info: Extract message ids referenced by this message
        const messageReferenceDebug = messageReferenceDebugFor(type, body);

        this._log.info(
            `Received reflected outgoing ${messageTypeDebug} message from ${this._senderDeviceIdString}`,
            messageReferenceDebug,
        );

        // Persist nonces
        let importedNonces = 0;
        for (const nonce of messageNonces) {
            const guard = nonces.checkAndRegisterNonce(
                NonceScope.CSP,
                nonce,
                'ReflectedOutgoingMessageTask#run',
            );
            const nonceHexString = bytesToHex(nonce);
            if (guard === NONCE_REUSED) {
                // This might happen due to resending nonces of already sent group messages
                // (partially finished persisted tasks).
                this._log.info(`Skip adding preexisting CSP nonce ${nonceHexString}`);
            } else {
                importedNonces++;
                this._log.debug(`Persisting nonce ${nonceHexString}`);
                guard.commit();
            }
        }
        this._log.debug(`Imported ${importedNonces} nonces`);

        // Decode Body
        const validatedBody = this._decodeMessage(type, body, messageTypeDebug);
        if (validatedBody === undefined) {
            return;
        }
        // Get processing instructions
        const conversationId =
            protobuf.validate.d2d.ConversationId.toCommonConversationId(d2dConversationId);
        let instructions;
        try {
            instructions = this._getInstructionsForMessage(
                validatedBody,
                validatedMessage.messageId,
                validatedMessage.createdAt,
                this._reflectedAt,
                conversationId,
            );
        } catch (error) {
            this._log.info(
                `Discarding reflected outgoing ${messageTypeDebug} message with invalid content: ${error}`,
                messageReferenceDebug,
            );
            return;
        }
        if (instructions === 'discard') {
            this._log.info(`Discarding reflected outgoing ${messageTypeDebug} message`);
            return;
        }

        // Process / save the message
        switch (instructions.messageCategory) {
            case 'conversation-message': {
                // Ensure that the D2D and CSP conversation types match
                if (
                    !(
                        (instructions.conversationId.type === ReceiverType.CONTACT &&
                            d2dConversationId.id === 'contact') ||
                        (instructions.conversationId.type === ReceiverType.GROUP &&
                            d2dConversationId.id === 'group')
                    )
                ) {
                    this._log.error(
                        `Discarding ${this._direction} ${messageTypeDebug}, conversation type mismatch`,
                        messageReferenceDebug,
                    );
                    return;
                }

                // Ensure that the D2D and CSP group identities match
                if (instructions.conversationId.type === ReceiverType.GROUP) {
                    assert(d2dConversationId.id === 'group'); // Validated above
                    if (
                        d2dConversationId.group.groupId !== instructions.conversationId.groupId ||
                        d2dConversationId.group.creatorIdentity !==
                            instructions.conversationId.creatorIdentity
                    ) {
                        this._log.error(
                            `Discarding ${this._direction} ${messageTypeDebug}, group identity mismatch`,
                            messageReferenceDebug,
                        );
                        return;
                    }
                }

                // Get conversation
                const conversation = getConversationById(
                    this._services,
                    instructions.conversationId,
                );
                if (conversation === undefined) {
                    this._log.error(
                        `Discarding ${this._direction} ${messageTypeDebug} message because conversation was not found in database`,
                        messageReferenceDebug,
                    );
                    return;
                }

                // Discard message if it has been already received
                if (conversation.get().controller.hasMessage(validatedMessage.messageId)) {
                    this._log.warn(
                        `Discarding ${this._direction} ${messageTypeDebug} message ${u64ToHexLe(
                            validatedMessage.messageId,
                        )} as it was already received`,
                        messageReferenceDebug,
                    );
                    return;
                }

                // Add message to conversation
                this._log.debug(
                    `Saving ${this._direction} ${messageTypeDebug} message`,
                    messageReferenceDebug,
                );
                const messageStore = conversation.get().controller.addMessage.fromSync(handle, {
                    ...instructions.initFragment,
                    createdAt: instructions.initFragment.createdAt,
                    direction: MessageDirection.OUTBOUND,
                    id: validatedMessage.messageId,
                });

                // If this message type has a thumbnail, automatically trigger its download
                if (messageStoreHasThumbnail(messageStore)) {
                    messageStore
                        .get()
                        .controller.thumbnailBlob()
                        .catch((error: unknown) =>
                            this._log.error(
                                `Downloading the thumbnail of a reflected outgoing message failed: ${error}`,
                            ),
                        );
                }

                // If the settings are configured for autodownload, directly download the associated blob
                if (messageStore.type !== 'text') {
                    const autoDownload = model.user.mediaSettings.get().view.autoDownload;
                    if (
                        autoDownload.on &&
                        (autoDownload.limitInMb === 0 ||
                            messageStore.get().view.fileSize / 1e6 < autoDownload.limitInMb)
                    ) {
                        messageStore
                            .get()
                            .controller.blob()
                            .catch((error: unknown) => {
                                this._log.error(
                                    `Downloading the blob of a reflected outgoing message failed: ${error}`,
                                );
                            });
                    }
                }

                break;
            }

            case 'group-control':
            case 'message-content-update':
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
     * @param createdAt Timestamp to use for `createdAt`.
     * @param messageId The message ID of the message.
     * @param conversationId The conversation associated with this outgoing message.
     */
    private _getInstructionsForMessage(
        validatedBody:
            | structbuf.validate.csp.e2e.ValidatedCspE2eTypesStructbuf
            | protobuf.validate.csp_e2e.ValidatedCspE2eTypesProtobuf,
        messageId: MessageId,
        createdAt: Date,
        reflectedAt: Date,
        conversationId: ConversationId,
    ): MessageProcessingInstructions | 'discard' {
        const commonFragment = this._getCommonMessageInitFragment(createdAt);
        switch (validatedBody.type) {
            // Contact conversation messages
            case CspE2eConversationType.TEXT:
            case CspE2eConversationType.FILE:
            case CspE2eConversationType.LOCATION: {
                assert(
                    conversationId.type === ReceiverType.CONTACT,
                    `Message of type ${ReceiverTypeUtils.nameOf(
                        conversationId.type,
                    )} must be directed at contact conversation`,
                ); // TODO(DESK-597): Distribution list support
                let initFragment;
                switch (validatedBody.type) {
                    case CspE2eConversationType.TEXT:
                        initFragment = getTextMessageInitFragment(
                            validatedBody.message,
                            commonFragment,
                            this._log,
                            messageId,
                        );
                        break;
                    case CspE2eConversationType.FILE:
                        initFragment = getFileMessageInitFragment(
                            validatedBody.message,
                            commonFragment,
                            this._log,
                        );
                        break;
                    case CspE2eConversationType.LOCATION:
                        initFragment = getLocationMessageInitFragment(
                            validatedBody.message,
                            commonFragment,
                        );
                        break;
                    default:
                        unreachable(validatedBody);
                }
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId,
                    initFragment,
                };
                return instructions;
            }

            // Group conversation messages
            case CspE2eGroupConversationType.GROUP_TEXT:
            case CspE2eGroupConversationType.GROUP_FILE:
            case CspE2eGroupConversationType.GROUP_LOCATION: {
                let initFragment;
                switch (validatedBody.type) {
                    case CspE2eGroupConversationType.GROUP_TEXT:
                        initFragment = getTextMessageInitFragment(
                            validatedBody.message,
                            commonFragment,
                            this._log,
                            messageId,
                        );
                        break;
                    case CspE2eGroupConversationType.GROUP_FILE:
                        initFragment = getFileMessageInitFragment(
                            validatedBody.message,
                            commonFragment,
                            this._log,
                        );
                        break;
                    case CspE2eGroupConversationType.GROUP_LOCATION:
                        initFragment = getLocationMessageInitFragment(
                            validatedBody.message,
                            commonFragment,
                        );
                        break;
                    default:
                        unreachable(validatedBody);
                }
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
                if (conversationId.type !== ReceiverType.GROUP) {
                    this._log.warn(
                        `Received reflected outgoing group setup message targeted at ${ReceiverTypeUtils.nameOf(
                            conversationId.type,
                        )}. Discarding.`,
                    );
                    return 'discard';
                }
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedOutgoingGroupSetupTask(
                        this._services,
                        messageId,
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
                        this._services.device.identity.string,
                        validatedBody.container,
                        validatedBody.message,
                        reflectedAt,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedGroupProfilePictureTask(
                        this._services,
                        messageId,
                        this._services.device.identity.string,
                        validatedBody.container,
                        validatedBody.message,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedGroupProfilePictureTask(
                        this._services,
                        messageId,
                        this._services.device.identity.string,
                        validatedBody.container,
                        undefined,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_LEAVE: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedOutgoingGroupLeaveTask(
                        this._services,
                        messageId,
                        validatedBody.container,
                        this._reflectedAt,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_SYNC_REQUEST:
                // Ignore for now
                return 'discard';

            case CspE2eGroupControlType.GROUP_CALL_START: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedGroupCallStartTask(
                        this._services,
                        messageId,
                        this._services.device.identity.string,
                        validatedBody.container,
                        validatedBody.message,
                    ),
                };
                return instructions;
            }

            // Status messages
            case CspE2eStatusUpdateType.DELIVERY_RECEIPT: {
                const instructions: StatusUpdateInstructions = {
                    messageCategory: 'status-update',
                    task: new ReflectedDeliveryReceiptTask(
                        this._services,
                        messageId,
                        conversationId,
                        validatedBody.message,
                        createdAt,
                        this._services.device.identity.string,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT: {
                const instructions: StatusUpdateInstructions = {
                    messageCategory: 'status-update',
                    task: new ReflectedDeliveryReceiptTask(
                        this._services,
                        messageId,
                        {
                            type: ReceiverType.GROUP,
                            creatorIdentity: validatedBody.container.creatorIdentity,
                            groupId: validatedBody.container.groupId,
                        },
                        validatedBody.message,
                        createdAt,
                        this._services.device.identity.string,
                    ),
                };
                return instructions;
            }

            // Message content update messages
            case CspE2eMessageUpdateType.EDIT_MESSAGE: {
                assert(conversationId.type === ReceiverType.CONTACT);
                const instructions: MessageContentUpdateInstructions = {
                    messageCategory: 'message-content-update',
                    task: new ReflectedMessageContentUpdateTask(
                        this._services,
                        validatedBody.message.messageId,
                        conversationId,
                        {type: 'edit', newText: validatedBody.message.text},
                        createdAt,
                        MessageDirection.OUTBOUND,
                        this._log,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE: {
                const instructions: MessageContentUpdateInstructions = {
                    messageCategory: 'message-content-update',
                    task: new ReflectedMessageContentUpdateTask(
                        this._services,
                        validatedBody.message.messageId,
                        {
                            type: ReceiverType.GROUP,
                            creatorIdentity: validatedBody.container.creatorIdentity,
                            groupId: validatedBody.container.groupId,
                        },
                        {type: 'edit', newText: validatedBody.message.text},
                        createdAt,
                        MessageDirection.OUTBOUND,
                        this._log,
                    ),
                };
                return instructions;
            }

            case CspE2eMessageUpdateType.DELETE_MESSAGE: {
                assert(conversationId.type === ReceiverType.CONTACT);
                const instructions: MessageContentUpdateInstructions = {
                    messageCategory: 'message-content-update',
                    task: new ReflectedMessageContentUpdateTask(
                        this._services,
                        validatedBody.message.messageId,
                        conversationId,
                        {type: 'delete'},
                        createdAt,
                        MessageDirection.OUTBOUND,
                        this._log,
                    ),
                };

                return instructions;
            }

            case CspE2eGroupMessageUpdateType.GROUP_DELETE_MESSAGE: {
                const instructions: MessageContentUpdateInstructions = {
                    messageCategory: 'message-content-update',
                    task: new ReflectedMessageContentUpdateTask(
                        this._services,
                        validatedBody.message.messageId,
                        {
                            type: ReceiverType.GROUP,
                            creatorIdentity: validatedBody.container.creatorIdentity,
                            groupId: validatedBody.container.groupId,
                        },
                        {type: 'delete'},
                        createdAt,
                        MessageDirection.OUTBOUND,
                        this._log,
                    ),
                };
                return instructions;
            }

            case CspE2eStatusUpdateType.TYPING_INDICATOR:
                // Outgoing typing indicators are not reflected, because it doesn't make sense.
                return 'discard';

            default:
                return unreachable(validatedBody);
        }
    }

    /**
     * Return the common outbound message init fragment.
     */
    private _getCommonMessageInitFragment(createdAt: Date): CommonOutboundMessageInitFragment {
        return {
            createdAt,
        };
    }
}

function getTextMessageInitFragment(
    message: structbuf.validate.csp.e2e.Text.Type,
    commonFragment: CommonOutboundMessageInitFragment,
    log: Logger,
    messageId: MessageId,
): OutboundTextMessageInitFragment {
    const possibleQuote = parsePossibleTextQuote(message.text, log, messageId);
    const text = possibleQuote?.comment ?? message.text;

    return {
        ...commonFragment,
        type: 'text',
        text,
        quotedMessageId: possibleQuote?.quotedMessageId,
    };
}

function getFileMessageInitFragment(
    message: structbuf.validate.csp.e2e.File.Type,
    commonFragment: CommonOutboundMessageInitFragment,
    log: Logger,
):
    | OutboundFileMessageInitFragment
    | OutboundImageMessageInitFragment
    | OutboundVideoMessageInitFragment
    | OutboundAudioMessageInitFragment {
    const fileData = message.file;

    return {
        ...commonFragment,
        blobId: fileData.file.blobId,
        thumbnailBlobId: fileData.thumbnail?.blobId,
        encryptionKey: fileData.encryptionKey,
        mediaType: fileData.file.mediaType,
        thumbnailMediaType: fileData.thumbnail?.mediaType,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        caption: fileData.caption,
        correlationId: fileData.correlationId,
        ...getFileBasedMessageTypeAndExtraProperties(fileData, log),
    };
}

function getLocationMessageInitFragment(
    message: structbuf.validate.csp.e2e.Location.Type,
    commonFragment: CommonOutboundMessageInitFragment,
): OutboundTextMessageInitFragment {
    return {
        ...commonFragment,
        type: 'text',
        text: getTextForLocation(message.location),
    };
}
