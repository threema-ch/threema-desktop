import {type MessageDirection, type MessageType} from '~/common/enum';
import {type LocalModel} from '~/common/model';
import {
    type CommonBaseMessageController,
    type CommonBaseMessageInit,
    type CommonBaseMessageView,
    type InboundBaseMessageController,
    type InboundBaseMessageInit,
    type InboundBaseMessageView,
    type OutboundBaseMessageController,
    type OutboundBaseMessageInit,
    type OutboundBaseMessageView,
} from '~/common/model/types/message/common';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type MessageId} from '~/common/network/types';

// View

export interface CommonTextMessageView extends CommonBaseMessageView {
    readonly text: string;
    readonly quotedMessageId?: MessageId;
}
export type InboundTextMessageView = InboundBaseMessageView & CommonTextMessageView;
export type OutboundTextMessageView = OutboundBaseMessageView & CommonTextMessageView;

// Init

/**
 * Fields needed to create a new image message.
 */
type CommonTextMessageInit = CommonBaseMessageInit<MessageType.TEXT> &
    Pick<CommonTextMessageView, 'text' | 'quotedMessageId'>;
type InboundTextMessageInit = CommonTextMessageInit & InboundBaseMessageInit<MessageType.TEXT>;
type OutboundTextMessageInit = CommonTextMessageInit & OutboundBaseMessageInit<MessageType.TEXT>;

// Controller

type CommonTextMessageController<TView extends CommonTextMessageView> =
    CommonBaseMessageController<TView>;

/**
 * Controller for inbound text messages.
 */
export type InboundTextMessageController = InboundBaseMessageController<InboundTextMessageView> &
    CommonTextMessageController<InboundTextMessageView>;

/**
 * Controller for outbound text messages.
 */
export type OutboundTextMessageController = OutboundBaseMessageController<OutboundTextMessageView> &
    CommonTextMessageController<OutboundTextMessageView>;

// Model

/**
 * Inbound text message model.
 */
export type InboundTextMessageModel = LocalModel<
    InboundTextMessageView,
    InboundTextMessageController,
    MessageDirection.INBOUND,
    MessageType.TEXT
>;
export type IInboundTextMessageModelStore = LocalModelStore<InboundTextMessageModel>;

/**
 * Outbound text message model.
 */
export type OutboundTextMessageModel = LocalModel<
    OutboundTextMessageView,
    OutboundTextMessageController,
    MessageDirection.OUTBOUND,
    MessageType.TEXT
>;
export type IOutboundTextMessageModelStore = LocalModelStore<OutboundTextMessageModel>;

// Bundle

/**
 * Combined types related to an inbound text message.
 */
export interface InboundTextMessage {
    readonly view: InboundTextMessageView;
    readonly init: InboundTextMessageInit;
    readonly controller: InboundTextMessageController;
    readonly model: InboundTextMessageModel;
}

/**
 * Combined types related to an outbound text message.
 */
export interface OutboundTextMessage {
    readonly view: OutboundTextMessageView;
    readonly init: OutboundTextMessageInit;
    readonly controller: OutboundTextMessageController;
    readonly model: OutboundTextMessageModel;
}