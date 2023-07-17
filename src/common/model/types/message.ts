import {type DbContact, type UidOf} from '~/common/db';
import {
    type BlobDownloadState,
    type MessageDirection,
    type MessageReaction,
    type MessageType,
} from '~/common/enum';
import {type FileEncryptionKey, type FileId} from '~/common/file-storage';
import {
    type ControllerUpdateFromSource,
    type ControllerUpdateFromSync,
    type LocalModel,
} from '~/common/model/types/common';
import {type Contact} from '~/common/model/types/contact';
import {type ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {type LocalModelStore, type RemoteModelStore} from '~/common/model/utils/model-store';
import {type BlobId} from '~/common/network/protocol/blob';
import {type FileRenderingType} from '~/common/network/structbuf/validate/csp/e2e/file';
import {type MessageId} from '~/common/network/types';
import {type RawBlobKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array, type u53} from '~/common/types';
import {type ProxyMarked} from '~/common/utils/endpoint';
import {type LocalSetStore, type RemoteSetStore} from '~/common/utils/store/set-store';

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
     * Optional reaction to a message.
     */
    readonly lastReaction?: {
        readonly at: Date;
        readonly type: MessageReaction;
    };
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

type CommonBaseMessageInit<TType extends MessageType> = {
    /**
     * Message type (e.g. text, file, etc).
     */
    readonly type: TType;
} & CommonBaseMessageView;
type InboundBaseMessageInit<TType extends MessageType> = CommonBaseMessageInit<TType> &
    Pick<InboundBaseMessageView, 'receivedAt' | 'raw'> & {
        readonly sender: UidOf<DbContact>;
    };
type OutboundBaseMessageInit<TType extends MessageType> = CommonBaseMessageInit<TType> &
    Pick<OutboundBaseMessageView, 'sentAt'>;

/**
 * Common parts of the controller for all message types and directions.
 */
export type CommonBaseMessageController<TView extends CommonBaseMessageView> = {
    readonly meta: ModelLifetimeGuard<TView>;

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
        readonly reaction: Omit<
            ControllerUpdateFromSource<[type: MessageReaction, reactedAt: Date]>,
            'fromRemote'
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
        readonly reaction: Omit<
            ControllerUpdateFromSource<[type: MessageReaction, reactedAt: Date]>,
            'fromLocal'
        >;
    };

export interface TextMessageViewFragment {
    readonly text: string;
    readonly quotedMessageId?: MessageId;
}
type CommonTextMessageView = CommonBaseMessageView & TextMessageViewFragment;
type InboundTextMessageView = InboundBaseMessageView & CommonTextMessageView;
type OutboundTextMessageView = OutboundBaseMessageView & CommonTextMessageView;
type CommonTextMessageInit = CommonBaseMessageInit<MessageType.TEXT> &
    Pick<CommonTextMessageView, 'text' | 'quotedMessageId'>;
type InboundTextMessageInit = CommonTextMessageInit & InboundBaseMessageInit<MessageType.TEXT>;
type OutboundTextMessageInit = CommonTextMessageInit & OutboundBaseMessageInit<MessageType.TEXT>;
type CommonTextMessageController<TView extends CommonTextMessageView> =
    CommonBaseMessageController<TView>;
export type InboundTextMessageController = InboundBaseMessageController<InboundTextMessageView> &
    CommonTextMessageController<InboundTextMessageView>;
export type OutboundTextMessageController = OutboundBaseMessageController<OutboundTextMessageView> &
    CommonTextMessageController<OutboundTextMessageView>;
export type InboundTextMessageModel = LocalModel<
    InboundTextMessageView,
    InboundTextMessageController,
    MessageDirection.INBOUND,
    MessageType.TEXT
>;
export type IInboundTextMessageModelStore = LocalModelStore<InboundTextMessageModel>;
export type OutboundTextMessageModel = LocalModel<
    OutboundTextMessageView,
    OutboundTextMessageController,
    MessageDirection.OUTBOUND,
    MessageType.TEXT
>;
export type IOutboundTextMessageModelStore = LocalModelStore<OutboundTextMessageModel>;
export interface InboundTextMessage {
    readonly view: InboundTextMessageView;
    readonly init: InboundTextMessageInit;
    readonly controller: InboundTextMessageController;
    readonly model: InboundTextMessageModel;
}

export interface OutboundTextMessage {
    readonly view: OutboundTextMessageView;
    readonly init: OutboundTextMessageInit;
    readonly controller: OutboundTextMessageController;
    readonly model: OutboundTextMessageModel;
}

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
 * View shared among all inbound file-based messages.
 */
export type InboundBaseFileMessageView = InboundBaseMessageView & CommonBaseFileMessageView;
/**
 * View shared among all outbound file-based messages.
 */
export type OutboundBaseFileMessageView = OutboundBaseMessageView & CommonBaseFileMessageView;

/**
 * View for inbound file messages.
 */
export type InboundFileMessageView = InboundBaseFileMessageView;
/**
 * View for outbound file messages.
 */
export type OutboundFileMessageView = OutboundBaseFileMessageView;

/**
 * Height and width of a media item (e.g. an image).
 */
export interface Dimensions {
    readonly height: u53;
    readonly width: u53;
}

export interface CommonImageMessageView extends CommonBaseFileMessageView {
    readonly renderingType: Exclude<FileRenderingType, 'file'>;
    readonly animated: boolean;
    readonly dimensions?: Dimensions;
}
export type InboundImageMessageView = InboundBaseFileMessageView & CommonImageMessageView;
export type OutboundImageMessageView = OutboundBaseFileMessageView & CommonImageMessageView;

/**
 * Fields needed to create a new file-based message.
 */
type CommonBaseFileMessageInit<T extends MessageType> = CommonBaseMessageInit<T> &
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
 * Fields needed to create a new file message.
 */
type CommonFileMessageInit = CommonBaseFileMessageInit<MessageType.FILE>;
type InboundFileMessageInit = CommonFileMessageInit & InboundBaseMessageInit<MessageType.FILE>;
type OutboundFileMessageInit = CommonFileMessageInit & OutboundBaseMessageInit<MessageType.FILE>;

/**
 * Fields needed to create a new image message.
 */
type CommonImageMessageInit = CommonBaseFileMessageInit<MessageType.IMAGE> &
    Pick<CommonImageMessageView, 'renderingType' | 'animated' | 'dimensions'>;
type InboundImageMessageInit = CommonImageMessageInit & InboundBaseMessageInit<MessageType.IMAGE>;
type OutboundImageMessageInit = CommonImageMessageInit & OutboundBaseMessageInit<MessageType.IMAGE>;

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
         * If the download fails (for any reason), then the promise is rejected with an error.
         */
        readonly blob: () => Promise<ReadonlyUint8Array>;

        /**
         * Return the thumbnail blob bytes.
         *
         * If the blob has not yet been downloaded, the download will be started and the database
         * will be updated. Once that is done, the promise will resolve with the blob data.
         *
         * If the download fails (for any reason), then the promise is rejected with an error.
         */
        readonly thumbnailBlob: () => Promise<ReadonlyUint8Array | undefined>;
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

/**
 * Controller for inbound file messages.
 */
export type InboundFileMessageController = InboundBaseFileMessageController<InboundFileMessageView>;

/**
 * Controller for outbound file messages.
 */
export type OutboundFileMessageController =
    OutboundBaseFileMessageController<OutboundFileMessageView>;

/**
 * Controller for inbound image messages.
 */
export type InboundImageMessageController =
    InboundBaseFileMessageController<InboundImageMessageView>;

/**
 * Controller for outbound image messages.
 */
export type OutboundImageMessageController =
    OutboundBaseFileMessageController<OutboundImageMessageView>;

/**
 * Inbound file message model.
 */
type InboundFileMessageModel = LocalModel<
    InboundFileMessageView,
    InboundFileMessageController,
    MessageDirection.INBOUND,
    MessageType.FILE
>;
export type IInboundFileMessageModelStore = LocalModelStore<InboundFileMessageModel>;

/**
 * Outbound file message model.
 */
type OutboundFileMessageModel = LocalModel<
    OutboundFileMessageView,
    OutboundFileMessageController,
    MessageDirection.OUTBOUND,
    MessageType.FILE
>;
export type IOutboundFileMessageModelStore = LocalModelStore<OutboundFileMessageModel>;

/**
 * Inbound image message model.
 */
type InboundImageMessageModel = LocalModel<
    InboundImageMessageView,
    InboundImageMessageController,
    MessageDirection.INBOUND,
    MessageType.IMAGE
>;
export type IInboundImageMessageModelStore = LocalModelStore<InboundImageMessageModel>;

/**
 * Outbound image message model.
 */
type OutboundImageMessageModel = LocalModel<
    OutboundImageMessageView,
    OutboundImageMessageController,
    MessageDirection.OUTBOUND,
    MessageType.IMAGE
>;
export type IOutboundImageMessageModelStore = LocalModelStore<OutboundImageMessageModel>;

/**
 * Combined types related to an inbound file message.
 */
export interface InboundFileMessage {
    readonly view: InboundFileMessageView;
    readonly init: InboundFileMessageInit;
    readonly controller: InboundFileMessageController;
    readonly model: InboundFileMessageModel;
    readonly store: LocalModelStore<InboundFileMessageModel>;
}

/**
 * Combined types related to an outbound file message.
 */
export interface OutboundFileMessage {
    readonly view: OutboundFileMessageView;
    readonly init: OutboundFileMessageInit;
    readonly controller: OutboundFileMessageController;
    readonly model: OutboundFileMessageModel;
    readonly store: LocalModelStore<OutboundFileMessageModel>;
}

/**
 * Combined types related to an inbound image message.
 */
export interface InboundImageMessage {
    readonly view: InboundImageMessageView;
    readonly init: InboundImageMessageInit;
    readonly controller: InboundImageMessageController;
    readonly model: InboundImageMessageModel;
    readonly store: LocalModelStore<InboundImageMessageModel>;
}

/**
 * Combined types related to an outbound image message.
 */
export interface OutboundImageMessage {
    readonly view: OutboundImageMessageView;
    readonly init: OutboundImageMessageInit;
    readonly controller: OutboundImageMessageController;
    readonly model: OutboundImageMessageModel;
    readonly store: LocalModelStore<OutboundImageMessageModel>;
}

/**
 * Helper to return the appropriate bundle for the specified inbound message type.
 */
export type InboundMessageFor<TType extends MessageType> = TType extends MessageType.TEXT
    ? InboundTextMessage
    : TType extends MessageType.FILE
    ? InboundFileMessage
    : TType extends MessageType.IMAGE
    ? InboundImageMessage
    : never;

/**
 * Helper to return the appropriate bundle for the specified outbound message type.
 */
export type OutboundMessageFor<TType extends MessageType> = TType extends MessageType.TEXT
    ? OutboundTextMessage
    : TType extends MessageType.FILE
    ? OutboundFileMessage
    : TType extends MessageType.IMAGE
    ? OutboundImageMessage
    : never;

type BundleProperty = 'view' | 'init' | 'controller' | 'model';

/**
 * Helper to return the appropriate bundle property for the specified direction and message type.
 */
export type DirectedMessageFor<
    TDirection extends MessageDirection,
    TType extends MessageType,
    TBundleProperty extends BundleProperty,
> = TDirection extends MessageDirection.INBOUND
    ? {
          readonly direction: MessageDirection.INBOUND;
      } & InboundMessageFor<TType>[TBundleProperty]
    : TDirection extends MessageDirection.OUTBOUND
    ? {
          readonly direction: MessageDirection.OUTBOUND;
      } & OutboundMessageFor<TType>[TBundleProperty]
    : never;

export type MessageFor<
    TDirection extends MessageDirection,
    TType extends MessageType,
    TVariant extends BundleProperty,
> = TDirection extends MessageDirection.INBOUND
    ? InboundMessageFor<TType>[TVariant]
    : TDirection extends MessageDirection.OUTBOUND
    ? OutboundMessageFor<TType>[TVariant]
    : never;

export type AnyMessage<TVariant extends BundleProperty> = MessageFor<
    MessageDirection,
    MessageType,
    TVariant
>;

export type AnyMessageModel = AnyInboundMessageModel | AnyOutboundMessageModel;
export type AnyInboundMessageModel =
    | InboundTextMessage['model']
    | InboundFileMessage['model']
    | InboundImageMessage['model'];
export type AnyOutboundMessageModel =
    | OutboundTextMessage['model']
    | OutboundFileMessage['model']
    | OutboundImageMessage['model'];
export type AnyMessageModelStore = AnyInboundMessageModelStore | AnyOutboundMessageModelStore;
export type AnyInboundMessageModelStore =
    | IInboundTextMessageModelStore
    | IInboundFileMessageModelStore
    | IInboundImageMessageModelStore;
export type AnyOutboundMessageModelStore =
    | IOutboundTextMessageModelStore
    | IOutboundFileMessageModelStore
    | IOutboundImageMessageModelStore;
export type AnyTextMessageModelStore =
    | IInboundTextMessageModelStore
    | IOutboundTextMessageModelStore;
export type AnyFileMessageModelStore =
    | IInboundFileMessageModelStore
    | IOutboundFileMessageModelStore;
export type AnyImageMessageModelStore =
    | IInboundImageMessageModelStore
    | IOutboundImageMessageModelStore;

export type SetOfAnyRemoteMessageModel =
    | ReadonlySet<RemoteModelStore<InboundTextMessage['model']>>
    | ReadonlySet<RemoteModelStore<OutboundTextMessage['model']>>
    | ReadonlySet<RemoteModelStore<InboundFileMessage['model']>>
    | ReadonlySet<RemoteModelStore<OutboundFileMessage['model']>>
    | ReadonlySet<RemoteModelStore<InboundImageMessage['model']>>
    | ReadonlySet<RemoteModelStore<OutboundImageMessage['model']>>;
export type SetOfAnyLocalMessageModelStore = LocalSetStore<
    | LocalModelStore<InboundTextMessage['model']>
    | LocalModelStore<OutboundTextMessage['model']>
    | LocalModelStore<InboundFileMessage['model']>
    | LocalModelStore<OutboundFileMessage['model']>
    | LocalModelStore<InboundImageMessage['model']>
    | LocalModelStore<OutboundImageMessage['model']>
>;
export type SetOfAnyRemoteMessageModelStore = RemoteSetStore<
    | RemoteModelStore<InboundTextMessage['model']>
    | RemoteModelStore<OutboundTextMessage['model']>
    | RemoteModelStore<InboundFileMessage['model']>
    | RemoteModelStore<OutboundFileMessage['model']>
    | RemoteModelStore<InboundImageMessage['model']>
    | RemoteModelStore<OutboundImageMessage['model']>
>;
