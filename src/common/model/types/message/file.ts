import type {MessageDirection, MessageType} from '~/common/enum';
import type {Model} from '~/common/model';
import type {
    CommonBaseFileMessageInit,
    InboundBaseFileMessageController,
    InboundBaseFileMessageView,
    InboundBaseMessageInit,
    OutboundBaseFileMessageController,
    OutboundBaseFileMessageView,
    OutboundBaseMessageInit,
} from '~/common/model/types/message/common';
import type {ModelStore} from '~/common/model/utils/model-store';

// View

/**
 * View for inbound file messages.
 */
export type InboundFileMessageView = InboundBaseFileMessageView;
/**
 * View for outbound file messages.
 */
export type OutboundFileMessageView = OutboundBaseFileMessageView;

// Init

/**
 * Fields needed to create a new file message.
 */
export type CommonFileMessageInit = CommonBaseFileMessageInit<MessageType.FILE>;
type InboundFileMessageInit = CommonFileMessageInit & InboundBaseMessageInit<MessageType.FILE>;
type OutboundFileMessageInit = CommonFileMessageInit & OutboundBaseMessageInit<MessageType.FILE>;

// Controller

/**
 * Controller for inbound file messages.
 */
export type InboundFileMessageController = InboundBaseFileMessageController<InboundFileMessageView>;

/**
 * Controller for outbound file messages.
 */
export type OutboundFileMessageController =
    OutboundBaseFileMessageController<OutboundFileMessageView>;

// Model

/**
 * Inbound file message model.
 */
type InboundFileMessageModel = Model<
    InboundFileMessageView,
    InboundFileMessageController,
    MessageDirection.INBOUND,
    MessageType.FILE
>;
export type IInboundFileMessageModelStore = ModelStore<InboundFileMessageModel>;

/**
 * Outbound file message model.
 */
type OutboundFileMessageModel = Model<
    OutboundFileMessageView,
    OutboundFileMessageController,
    MessageDirection.OUTBOUND,
    MessageType.FILE
>;
export type IOutboundFileMessageModelStore = ModelStore<OutboundFileMessageModel>;

// Bundle

/**
 * Combined types related to an inbound file message.
 */
export interface InboundFileMessageBundle {
    readonly view: InboundFileMessageView;
    readonly init: InboundFileMessageInit;
    readonly controller: InboundFileMessageController;
    readonly model: InboundFileMessageModel;
    readonly store: ModelStore<InboundFileMessageModel>;
}

/**
 * Combined types related to an outbound file message.
 */
export interface OutboundFileMessageBundle {
    readonly view: OutboundFileMessageView;
    readonly init: OutboundFileMessageInit;
    readonly controller: OutboundFileMessageController;
    readonly model: OutboundFileMessageModel;
    readonly store: ModelStore<OutboundFileMessageModel>;
}
