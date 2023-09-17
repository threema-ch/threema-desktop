import type {MessageDirection, MessageType} from '~/common/enum';
import type {LocalModel} from '~/common/model';
import type {
    CommonBaseFileMessageInit,
    CommonBaseFileMessageView,
    InboundBaseFileMessageController,
    InboundBaseFileMessageView,
    InboundBaseMessageInit,
    OutboundBaseFileMessageController,
    OutboundBaseFileMessageView,
    OutboundBaseMessageInit,
} from '~/common/model/types/message/common';
import type {LocalModelStore} from '~/common/model/utils/model-store';
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
type InboundVideoMessageModel = LocalModel<
    InboundVideoMessageView,
    InboundVideoMessageController,
    MessageDirection.INBOUND,
    MessageType.VIDEO
>;
export type IInboundVideoMessageModelStore = LocalModelStore<InboundVideoMessageModel>;

/**
 * Outbound video message model.
 */
type OutboundVideoMessageModel = LocalModel<
    OutboundVideoMessageView,
    OutboundVideoMessageController,
    MessageDirection.OUTBOUND,
    MessageType.VIDEO
>;
export type IOutboundVideoMessageModelStore = LocalModelStore<OutboundVideoMessageModel>;

// Bundle

/**
 * Combined types related to an inbound video message.
 */
export interface InboundVideoMessage {
    readonly view: InboundVideoMessageView;
    readonly init: InboundVideoMessageInit;
    readonly controller: InboundVideoMessageController;
    readonly model: InboundVideoMessageModel;
    readonly store: LocalModelStore<InboundVideoMessageModel>;
}

/**
 * Combined types related to an outbound video message.
 */
export interface OutboundVideoMessage {
    readonly view: OutboundVideoMessageView;
    readonly init: OutboundVideoMessageInit;
    readonly controller: OutboundVideoMessageController;
    readonly model: OutboundVideoMessageModel;
    readonly store: LocalModelStore<OutboundVideoMessageModel>;
}
