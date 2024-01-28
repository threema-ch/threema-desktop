import type {DbContact, UidOf} from '~/common/db';
import type {
    BlobDownloadState,
    MessageDirection,
    MessageReaction,
    MessageType,
} from '~/common/enum';
import type {FileEncryptionKey, FileId} from '~/common/file-storage';
import type {
    ControllerCustomUpdateFromSource,
    ControllerUpdateFromSource,
    ControllerUpdateFromSync,
} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {Conversation} from '~/common/model/types/conversation';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {BlobId} from '~/common/network/protocol/blob';
import type {IdentityString, MessageId} from '~/common/network/types';
import type {RawBlobKey} from '~/common/network/types/keys';
import type {ReadonlyUint8Array, u53} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';
import type {FileBytesAndMediaType} from '~/common/utils/file';

export const OWN_IDENTITY_ALIAS = 'me';
export type IdentityStringOrMe = IdentityString | typeof OWN_IDENTITY_ALIAS;

export interface MessageReactionView {
    readonly reactionAt: Date;
    readonly reaction: MessageReaction;
    readonly senderIdentity: IdentityStringOrMe;
}

/**
 * Base view for all message types and directions.
 */
export interface CommonBaseMessageView {
    /**
     * Message ID.
     */
    readonly id: MessageId;

    /**
     * Timestamp for when the message...
     *
     * - Outbound: ...has been created on the local device.
     * - Inbound: ...has been created on the remote device.
     *
     * Note: For inbound messages, this timestamp may have an arbitrary value as it's controlled by
     *       the sender.
     */
    readonly createdAt: Date;

    /**
     * Optional timestamp for when...
     *
     * - Outbound: ...the 'read' delivery receipt message or the 'OutgoingMessageUpdate' with
     *     'update=read' has been reflected to the mediator server.
     * - Inbound: ...the 'read' delivery receipt message has been reflected to the mediator server
     *     by the leader device.
     */
    readonly readAt?: Date;

    /**
     * Reactions to a message.
     */
    readonly reactions: MessageReactionView[];

    /**
     * Ordinal for message ordering. Note: Higher `ordinal` means the message is newer.
     */
    readonly ordinal: u53;
}
export type InboundBaseMessageView = CommonBaseMessageView & {
    /**
     * Message direction.
     */
    readonly direction: MessageDirection.INBOUND;

    /**
     * When the message has been received from the chat server and reflected to the mediator server
     * by the leader device.
     */
    readonly receivedAt: Date;

    /**
     * Unparsed raw body.
     */
    readonly raw: ReadonlyUint8Array;
};
export type OutboundBaseMessageView = CommonBaseMessageView & {
    /**
     * Message direction.
     */
    readonly direction: MessageDirection.OUTBOUND;

    /**
     * When the message has been delivered to and acknowledged by the chat server.
     */
    readonly sentAt?: Date;

    /**
     * When the message was delivered to the recipient and confirmed by the recipient with a
     * "received" delivery receipt.
     */
    readonly deliveredAt?: Date;
};

/**
 * Helper type to get the proper base message view for the specified direction.
 */
export type BaseMessageView<TDirection extends MessageDirection> =
    TDirection extends MessageDirection.INBOUND
        ? InboundBaseMessageView
        : TDirection extends MessageDirection.OUTBOUND
          ? OutboundBaseMessageView
          : never;

export type CommonBaseMessageInit<TType extends MessageType> = {
    /**
     * Message type (e.g. text, file, etc).
     */
    readonly type: TType;
} & Omit<CommonBaseMessageView, 'ordinal' | 'reactions'>;
export type InboundBaseMessageInit<TType extends MessageType> = CommonBaseMessageInit<TType> &
    Pick<InboundBaseMessageView, 'receivedAt' | 'raw'> & {
        readonly sender: UidOf<DbContact>;
    };
export type OutboundBaseMessageInit<TType extends MessageType> = CommonBaseMessageInit<TType> &
    Pick<OutboundBaseMessageView, 'sentAt'>;

/**
 * Common parts of the controller for all message types and directions.
 */
export type CommonBaseMessageController<TView extends CommonBaseMessageView> = {
    readonly meta: ModelLifetimeGuard<TView>;

    /**
     * Get the store of the {@link Conversation}, which this message is part of.
     */
    readonly getConversationModelStore: () => LocalModelStore<Conversation>;
    /**
     * Remove the message.
     */
    readonly remove: () => void;
} & ProxyMarked;

/**
 * Common parts of the controller for all inbound message types.
 */
export type InboundBaseMessageController<TView extends InboundBaseMessageView> =
    CommonBaseMessageController<TView> & {
        /**
         * Contact that sent this message.
         */
        readonly sender: () => LocalModelStore<Contact>;

        /**
         * The user read the message on a linked device.
         *
         * Note: This interface does not allow updating `fromLocal`, because when viewing a
         *       conversation on the local device, the _entire_ conversation should be marked as
         *       read. Thus, use `ConversationController.read.fromLocal` instead.
         */
        readonly read: ControllerUpdateFromSync<[readAt: Date]>;

        /**
         * The user's reaction towards the message.
         */
        readonly reaction: ControllerCustomUpdateFromSource<
            [type: MessageReaction, reactedAt: Date], // From Local
            [type: MessageReaction, reactedAt: Date, reactionSender: IdentityStringOrMe], // FromSync
            [type: MessageReaction, reactedAt: Date, reactionSender: IdentityString] // FromRemote
        >;
    };

/**
 * Common parts of the controller for all outbound message types.
 */
export type OutboundBaseMessageController<TView extends OutboundBaseMessageView> =
    CommonBaseMessageController<TView> & {
        /**
         * The message has been delivered to and acknowledged by the chat server.
         */
        readonly sent: (sentAt: Date) => void;

        /**
         * The message was delivered to the recipient.
         *
         * (Note: On the protocol level, this corresponds to a delivery receipt of type "received".)
         */
        readonly delivered: Omit<ControllerUpdateFromSource<[deliveredAt: Date]>, 'fromLocal'>;

        /**
         * The receiver read the message.
         */
        readonly read: Omit<ControllerUpdateFromSource<[readAt: Date]>, 'fromLocal'>;

        /**
         * The receiver's reaction towards the message.
         */
        readonly reaction: ControllerCustomUpdateFromSource<
            [type: MessageReaction, reactedAt: Date], // From Local
            [type: MessageReaction, reactedAt: Date, reactionSender: IdentityStringOrMe], // FromSync
            [type: MessageReaction, reactedAt: Date, reactionSender: IdentityString] // FromRemote
        >;
    };

export interface FileData {
    readonly fileId: FileId;
    readonly encryptionKey: FileEncryptionKey;
    readonly unencryptedByteCount: u53;
    readonly storageFormatVersion: u53;
}

/**
 * File message data state
 *
 * - unsynced: The file is available only locally (for outgoing messages) or only on the blob server
 *   (for incoming or reflected messages).
 * - syncing: The file is being uploaded (for outgoing messages) or downloaded (for incoming or
 *   reflected messages).
 * - synced: The file was up- or downloaded successfully.
 * - failed: The up- or download failed and should not be retried (e.g. when the blob download
 *   returns a 404).
 */
export type FileMessageDataState = 'unsynced' | 'syncing' | 'synced' | 'failed';

/**
 * View for file-based messages in all directions.
 */
export interface CommonBaseFileMessageView extends CommonBaseMessageView {
    readonly fileName?: string;
    readonly fileSize: u53;
    readonly caption?: string;
    readonly correlationId?: string;
    readonly mediaType: string;
    readonly thumbnailMediaType?: string;
    readonly blobId?: BlobId;
    readonly thumbnailBlobId?: BlobId;
    readonly blobDownloadState?: BlobDownloadState;
    readonly thumbnailBlobDownloadState?: BlobDownloadState;
    readonly encryptionKey: RawBlobKey;
    readonly fileData?: FileData;
    readonly thumbnailFileData?: FileData;
    readonly state: FileMessageDataState;
}

/**
 * Update type for file based message updates
 */
export type UpdateFileBasedMessage = Partial<CommonBaseFileMessageView>;

/**
 * View shared among all inbound file-based messages.
 */
export type InboundBaseFileMessageView = InboundBaseMessageView & CommonBaseFileMessageView;
/**
 * View shared among all outbound file-based messages.
 */
export type OutboundBaseFileMessageView = OutboundBaseMessageView & CommonBaseFileMessageView;

/**
 * Fields needed to create a new file-based message.
 */
export type CommonBaseFileMessageInit<T extends MessageType> = CommonBaseMessageInit<T> &
    Pick<
        CommonBaseFileMessageView,
        | 'fileName'
        | 'fileSize'
        | 'caption'
        | 'correlationId'
        | 'mediaType'
        | 'thumbnailMediaType'
        | 'blobId'
        | 'thumbnailBlobId'
        | 'encryptionKey'
        | 'fileData'
        | 'thumbnailFileData'
    >;

/**
 * Common parts of the controller for all file-based message types and directions.
 */
type CommonBaseFileMessageController<TView extends CommonBaseFileMessageView> =
    CommonBaseMessageController<TView> & {
        /**
         * Return the blob bytes.
         *
         * If the blob has not yet been downloaded, the download will be started and the database
         * will be updated. Once that is done, the promise will resolve with the blob data.
         *
         * If fetching the blob bytes fails (for any reason), then the promise is rejected with a
         * {@link BlobFetchError}.
         */
        readonly blob: () => Promise<FileBytesAndMediaType>;

        /**
         * Return the thumbnail blob bytes.
         *
         * If the blob has not yet been downloaded, the download will be started and the database
         * will be updated. Once that is done, the promise will resolve with the blob data.
         *
         * If fetching the thumbnail blob bytes fails (for any reason), then the promise is rejected
         * with a {@link BlobFetchError}.
         */
        readonly thumbnailBlob: () => Promise<FileBytesAndMediaType | undefined>;
    };

/**
 * Common parts of the controller for all inbound file-based message types.
 */
export type InboundBaseFileMessageController<TView extends InboundBaseFileMessageView> =
    InboundBaseMessageController<TView> & CommonBaseFileMessageController<TView>;

/**
 * Common parts of the controller for all outbound file-based message types.
 */
export type OutboundBaseFileMessageController<TView extends OutboundBaseFileMessageView> =
    OutboundBaseMessageController<TView> &
        CommonBaseFileMessageController<TView> & {
            /**
             * Ensure that file and thumbnail data are uploaded to the blob server.
             */
            readonly uploadBlobs: () => Promise<void>;
        };
