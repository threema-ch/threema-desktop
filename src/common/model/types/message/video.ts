import type {MessageDirection, MessageType} from '~/common/enum';
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
import type {Dimensions, f64} from '~/common/types';

// View

export interface CommonVideoMessageView extends CommonBaseFileMessageView {
    /**
     * Reported duration of the video, in seconds.
     */
    readonly duration?: f64;
    readonly dimensions?: Dimensions;
}
export type InboundVideoMessageView = InboundBaseFileMessageView & CommonVideoMessageView;
export type OutboundVideoMessageView = OutboundBaseFileMessageView & CommonVideoMessageView;

// Init

/**
 * Fields needed to create a new video message.
 */
export type CommonVideoMessageInit = CommonBaseFileMessageInit<MessageType.VIDEO> &
    Pick<CommonVideoMessageView, 'duration' | 'dimensions'>;
type InboundVideoMessageInit = CommonVideoMessageInit & InboundBaseMessageInit<MessageType.VIDEO>;
type OutboundVideoMessageInit = CommonVideoMessageInit & OutboundBaseMessageInit<MessageType.VIDEO>;

// Controller

/**
 * Controller for inbound video messages.
 */
export type InboundVideoMessageController =
    InboundBaseFileMessageController<InboundVideoMessageView>;

/**
 * Controller for outbound video messages.
 */
export type OutboundVideoMessageController =
    OutboundBaseFileMessageController<OutboundVideoMessageView>;

// Model

/**
 * Inbound video message model.
 */
type InboundVideoMessageModel = Model<
    InboundVideoMessageView,
    InboundVideoMessageController,
    MessageDirection.INBOUND,
    MessageType.VIDEO
>;
export type IInboundVideoMessageModelStore = ModelStore<InboundVideoMessageModel>;

/**
 * Outbound video message model.
 */
type OutboundVideoMessageModel = Model<
    OutboundVideoMessageView,
    OutboundVideoMessageController,
    MessageDirection.OUTBOUND,
    MessageType.VIDEO
>;
export type IOutboundVideoMessageModelStore = ModelStore<OutboundVideoMessageModel>;

// Bundle

/**
 * Combined types related to an inbound video message.
 */
export interface InboundVideoMessageBundle extends CommonInboundMessageBundle<'video'> {
    readonly view: InboundVideoMessageView;
    readonly init: InboundVideoMessageInit;
    readonly controller: InboundVideoMessageController;
    readonly model: InboundVideoMessageModel;
    readonly store: ModelStore<InboundVideoMessageModel>;
}

/**
 * Combined types related to an outbound video message.
 */
export interface OutboundVideoMessageBundle extends CommonOutboundMessageBundle<'video'> {
    readonly view: OutboundVideoMessageView;
    readonly init: OutboundVideoMessageInit;
    readonly controller: OutboundVideoMessageController;
    readonly model: OutboundVideoMessageModel;
    readonly store: ModelStore<OutboundVideoMessageModel>;
}
