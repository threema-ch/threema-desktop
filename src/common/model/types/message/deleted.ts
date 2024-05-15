import type {MessageDirection, MessageType} from '~/common/enum';
import type {
    ControllerUpdateFromSource,
    ControllerUpdateFromSync,
    LocalModel,
} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {
    CommonBaseMessageController,
    CommonBaseMessageView,
    InboundBaseMessageInit,
    InboundBaseMessageView,
    OutboundBaseMessageInit,
    OutboundBaseMessageView,
} from '~/common/model/types/message/common';
import type {LocalModelStore} from '~/common/model/utils/model-store';

// View

interface CommonDeletedMessageView extends Required<Pick<CommonBaseMessageView, 'deletedAt'>> {
    readonly history: [];
    readonly lastEditedAt: undefined;
    readonly reactions: [];
}
export type InboundDeletedMessageView = InboundBaseMessageView &
    CommonDeletedMessageView & {
        readonly raw: undefined;
    };
export type OutboundDeletedMessageView = OutboundBaseMessageView & CommonDeletedMessageView;

// Init

/**
 * Fields needed to create a new inbound deleted message.
 */
export type InboundDeletedMessageInit = InboundBaseMessageInit<MessageType.DELETED>;
/**
 * Fields needed to create a new outbound deleted message.
 */
export type OutboundDeletedMessageInit = OutboundBaseMessageInit<MessageType.DELETED>;

// Controller

/**
 * Controller for inbound deleted messages.
 */
export type InboundDeletedMessageController =
    CommonBaseMessageController<InboundDeletedMessageView> & {
        /**
         * The user read the message on a linked device.
         *
         * Note: This interface does not allow updating `fromLocal`, because when viewing a
         *       conversation on the local device, the _entire_ conversation should be marked as
         *       read. Thus, use `ConversationController.read.fromLocal` instead.
         */
        readonly read: ControllerUpdateFromSync<[readAt: Date]>;

        /**
         * Return the sender of this message.
         */
        readonly sender: () => LocalModelStore<Contact>;
    };
/**
 * Controller for outbound deleted messages.
 */
export type OutboundDeletedMessageController =
    CommonBaseMessageController<OutboundDeletedMessageView> & {
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
    };

// Model

/**
 * Inbound deleted message model.
 */
export type InboundDeletedMessageModel = LocalModel<
    InboundDeletedMessageView,
    InboundDeletedMessageController,
    MessageDirection.INBOUND,
    MessageType.DELETED
>;
export type InboundDeletedMessageModelStore = LocalModelStore<InboundDeletedMessageModel>;

/**
 * Outbound deleted message model.
 */
export type OutboundDeletedMessageModel = LocalModel<
    OutboundDeletedMessageView,
    OutboundDeletedMessageController,
    MessageDirection.OUTBOUND,
    MessageType.DELETED
>;
export type OutboundDeletedMessageModelStore = LocalModelStore<OutboundDeletedMessageModel>;

// Bundle

/**
 * Combined types related to an inbound deleted message.
 */
export interface InboundDeletedMessage {
    readonly view: InboundDeletedMessageView;
    readonly init: InboundDeletedMessageInit;
    readonly controller: InboundDeletedMessageController;
    readonly model: InboundDeletedMessageModel;
    readonly store: InboundDeletedMessageModelStore;
}

/**
 * Combined types related to an outbound deleted message.
 */
export interface OutboundDeletedMessage {
    readonly view: OutboundDeletedMessageView;
    readonly init: OutboundDeletedMessageInit;
    readonly controller: OutboundDeletedMessageController;
    readonly model: OutboundDeletedMessageModel;
    readonly store: OutboundDeletedMessageModelStore;
}
