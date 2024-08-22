import type {ImageRenderingType, MessageDirection, MessageType} from '~/common/enum';
import type {Model} from '~/common/model';
import type {
    CommonBaseFileMessageInit,
    CommonBaseFileMessageView,
    CommonInboundMessageBundle,
    CommonOutboundMessageBundle,
    InboundBaseFileMessageController,
    InboundBaseFileMessageView,
    InboundBaseMessageInit,
    OutboundBaseFileMessageController,
    OutboundBaseFileMessageView,
    OutboundBaseMessageInit,
} from '~/common/model/types/message/common';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {Dimensions, ReadonlyUint8Array} from '~/common/types';

// View

export interface CommonImageMessageView extends CommonBaseFileMessageView {
    readonly renderingType: ImageRenderingType;
    readonly animated: boolean;
    readonly dimensions?: Dimensions;
}
export type InboundImageMessageView = InboundBaseFileMessageView & CommonImageMessageView;
export type OutboundImageMessageView = OutboundBaseFileMessageView & CommonImageMessageView;

// Init

/**
 * Fields needed to create a new image message.
 */
export type CommonImageMessageInit = CommonBaseFileMessageInit<MessageType.IMAGE> &
    Pick<CommonImageMessageView, 'renderingType' | 'animated' | 'dimensions'>;
type InboundImageMessageInit = CommonImageMessageInit & InboundBaseMessageInit<MessageType.IMAGE>;
type OutboundImageMessageInit = CommonImageMessageInit & OutboundBaseMessageInit<MessageType.IMAGE>;

// Controller

/**
 * Controller for inbound image messages.
 */
export type InboundImageMessageController =
    InboundBaseFileMessageController<InboundImageMessageView>;

/**
 * Controller for outbound image messages.
 */
export type OutboundImageMessageController =
    OutboundBaseFileMessageController<OutboundImageMessageView> & {
        /**
         * Regenerate the image thumbnail.
         */
        readonly regenerateThumbnail: (imageBytes: ReadonlyUint8Array) => Promise<void>;
    };

// Model

/**
 * Inbound image message model.
 */
type InboundImageMessageModel = Model<
    InboundImageMessageView,
    InboundImageMessageController,
    MessageDirection.INBOUND,
    MessageType.IMAGE
>;
export type IInboundImageMessageModelStore = ModelStore<InboundImageMessageModel>;

/**
 * Outbound image message model.
 */
type OutboundImageMessageModel = Model<
    OutboundImageMessageView,
    OutboundImageMessageController,
    MessageDirection.OUTBOUND,
    MessageType.IMAGE
>;
export type IOutboundImageMessageModelStore = ModelStore<OutboundImageMessageModel>;

// Bundle

/**
 * Combined types related to an inbound image message.
 */
export interface InboundImageMessageBundle extends CommonInboundMessageBundle<'image'> {
    readonly view: InboundImageMessageView;
    readonly init: InboundImageMessageInit;
    readonly controller: InboundImageMessageController;
    readonly model: InboundImageMessageModel;
    readonly store: ModelStore<InboundImageMessageModel>;
}

/**
 * Combined types related to an outbound image message.
 */
export interface OutboundImageMessageBundle extends CommonOutboundMessageBundle<'image'> {
    readonly view: OutboundImageMessageView;
    readonly init: OutboundImageMessageInit;
    readonly controller: OutboundImageMessageController;
    readonly model: OutboundImageMessageModel;
    readonly store: ModelStore<OutboundImageMessageModel>;
}
