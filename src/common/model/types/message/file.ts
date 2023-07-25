import {type MessageDirection, type MessageType} from '~/common/enum';
import {type LocalModel} from '~/common/model';
import {
    type CommonBaseFileMessageInit,
    type InboundBaseFileMessageController,
    type InboundBaseFileMessageView,
    type InboundBaseMessageInit,
    type OutboundBaseFileMessageController,
    type OutboundBaseFileMessageView,
    type OutboundBaseMessageInit,
} from '~/common/model/types/message/common';
import {type LocalModelStore} from '~/common/model/utils/model-store';

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

// Bundle

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
