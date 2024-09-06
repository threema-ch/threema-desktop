import {
    CspE2eConversationType,
    CspE2eGroupConversationType,
    ReceiverType,
    ReceiverTypeUtils,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {AnyOutboundNonDeletedMessageModelStore, AnyReceiver} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import type {UploadedBlobBytes} from '~/common/model/message/common';
import type {CspE2eType, LayerEncoder} from '~/common/network/protocol';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {serializeQuoteText} from '~/common/network/protocol/task/common/quotes';
import {getFileJsonData} from '~/common/network/protocol/task/csp/common';
import type {ValidCspMessageTypeForReceiver} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {OutgoingCspMessagesTask} from '~/common/network/protocol/task/csp/outgoing-csp-messages';
import * as structbuf from '~/common/network/structbuf';
import type {
    FileEncodable,
    GroupMemberContainerEncodable,
    TextEncodable,
} from '~/common/network/structbuf/csp/e2e';
import {ensureError, unreachable} from '~/common/utils/assert';
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
     * Create a new instance of this task. Note that the {@param _messageModelStore} must belong to
     * the {@param _receiverModel}.
     */
    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _receiverModel: TReceiver,
        private readonly _messageModelStore: AnyOutboundNonDeletedMessageModelStore,
    ) {
        // Instantiate logger
        const messageIdHex = u64ToHexLe(_messageModelStore.get().view.id);
        this._log = _services.logging.logger(`network.protocol.task.out-message.${messageIdHex}`);
    }

    public async run(handle: ActiveTaskCodecHandle<'persistent'>): Promise<void> {
        const messageType = this._messageModelStore.type;
        this._log.info(
            `Run for ${ReceiverTypeUtils.nameOf(
                this._receiverModel.type,
            )?.toLowerCase()} ${messageType} message`,
        );

        // Upload file message data
        let uploadedBlobBytes: UploadedBlobBytes | undefined;
        switch (messageType) {
            case 'file':
            case 'image':
            case 'video':
            case 'audio':
                uploadedBlobBytes = await this._messageModelStore.get().controller.uploadBlobs();
                break;
            case 'text':
                // Nothing to upload
                break;
            default:
                unreachable(messageType);
        }

        // Now that blobs are uploaded for the recipient (using low resolution/quality to optimize
        // network traffic and server load), we can re-generate the image thumbnail in a slightly
        // higher resolution, as an optimization for the local user.
        if (messageType === 'image' && uploadedBlobBytes?.main !== undefined) {
            this._messageModelStore
                .get()
                .controller.regenerateThumbnail(uploadedBlobBytes.main)
                .catch((error: unknown) =>
                    this._log.warn(`Failed to regenerate thumbnail: ${ensureError(error)}`),
                );
        }

        // Initialize outgoing CSP message task
        const cspMessageFlags = CspMessageFlags.forMessageType(messageType);
        cspMessageFlags.groupMessage = this._receiverModel.type === ReceiverType.GROUP;
        const {id: messageId, createdAt} = this._messageModelStore.get().view;
        const messageProperties = {
            type: this._getCspE2eType() as ValidCspMessageTypeForReceiver<TReceiver>,
            encoder: this._getCspEncoder(),
            cspMessageFlags,
            messageId,
            createdAt,
            allowUserProfileDistribution: true,
        } as const;
        const outCspMessageTask = new OutgoingCspMessagesTask(this._services, [
            {messageProperties, receiver: this._receiverModel},
        ]);

        // Run task
        await outCspMessageTask.run(handle);

        // Done
        this._log.info(
            `Sent ${ReceiverTypeUtils.nameOf(
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
        const messageModel = this._messageModelStore.get();
        switch (messageModel.type) {
            case 'text': {
                // Get message text (or quote V2 text)
                const {quotedMessageId, text: viewText} = messageModel.view;
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
            case 'image':
            case 'video':
            case 'audio': {
                const fileJson = getFileJsonData(messageModel);
                encoder = structbuf.bridge.encoder(structbuf.csp.e2e.File, {
                    file: UTF8.encode(JSON.stringify(fileJson)),
                });
                break;
            }
            default:
                return unreachable(messageModel);
        }

        if (this._receiverModel.type === ReceiverType.GROUP) {
            return structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                groupId: this._receiverModel.view.groupId,
                creatorIdentity: UTF8.encode(
                    getIdentityString(this._services.device, this._receiverModel.view.creator),
                ),
                innerData: encoder,
            });
        }
        return encoder;
    }

    /**
     * Determine the CSP E2E Type for the conversation message based on the receiver.
     * It guarantees that {@link ValidCspMessageTypeForReceiver} holds true for the returned value.
     *
     * @returns a valid conversation message type.
     */
    private _getCspE2eType(): CspE2eType {
        if (this._receiverModel.type === ReceiverType.GROUP) {
            switch (this._messageModelStore.type) {
                case 'text':
                    return CspE2eGroupConversationType.GROUP_TEXT;
                case 'file':
                case 'image':
                case 'video':
                case 'audio':
                    return CspE2eGroupConversationType.GROUP_FILE;
                default:
                    return unreachable(this._messageModelStore);
            }
        } else {
            switch (this._messageModelStore.type) {
                case 'text':
                    return CspE2eConversationType.TEXT;
                case 'file':
                case 'image':
                case 'video':
                case 'audio':
                    return CspE2eConversationType.FILE;
                default:
                    return unreachable(this._messageModelStore);
            }
        }
    }
}
