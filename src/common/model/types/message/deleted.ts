import type {MessageDirection, MessageType} from '~/common/enum';
import type {
    ControllerUpdateFromSource,
    ControllerUpdateFromSync,
    Model,
} from '~/common/model/types/common';
import type {Contact} from '~/common/model/types/contact';
import type {
    CommonBaseMessageController,
    CommonBaseMessageView,
    CommonInboundMessageBundle,
    CommonOutboundMessageBundle,
    InboundBaseMessageInit,
    InboundBaseMessageView,
    OutboundBaseMessageInit,
    OutboundBaseMessageView,
} from '~/common/model/types/message/common';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {ReadonlyUint8Array} from '~/common/types';

/**
 * The fields of the deleted message that contrarily to normal messages must be defined
 * (`deletedAt`) or undefined/empty (lastEditedAt, reactions, history).
 */
interface CommonDeleteMessageRestrictions
    extends Required<Pick<CommonBaseMessageView, 'deletedAt'>> {
    readonly history: [];
    readonly lastEditedAt: undefined;
    readonly reactions: [];
}

// View

export type InboundDeletedMessageView = InboundBaseMessageView &
    CommonDeleteMessageRestrictions & {
        readonly raw: ReadonlyUint8Array;
    };
export type OutboundDeletedMessageView = OutboundBaseMessageView & CommonDeleteMessageRestrictions;

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
        readonly sender: () => ModelStore<Contact>;
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
export type InboundDeletedMessageModel = Model<
    InboundDeletedMessageView,
    InboundDeletedMessageController,
    MessageDirection.INBOUND,
    MessageType.DELETED
>;
export type InboundDeletedMessageModelStore = ModelStore<InboundDeletedMessageModel>;

/**
 * Outbound deleted message model.
 */
export type OutboundDeletedMessageModel = Model<
    OutboundDeletedMessageView,
    OutboundDeletedMessageController,
    MessageDirection.OUTBOUND,
    MessageType.DELETED
>;
export type OutboundDeletedMessageModelStore = ModelStore<OutboundDeletedMessageModel>;

// Bundle

/**
 * Combined types related to an inbound deleted message.
 */
export interface InboundDeletedMessageBundle extends CommonInboundMessageBundle<'deleted'> {
    readonly view: InboundDeletedMessageView;
    readonly init: InboundDeletedMessageInit;
    readonly controller: InboundDeletedMessageController;
    readonly model: InboundDeletedMessageModel;
    readonly store: InboundDeletedMessageModelStore;
}

/**
 * Combined types related to an outbound deleted message.
 */
export interface OutboundDeletedMessageBundle extends CommonOutboundMessageBundle<'deleted'> {
    readonly view: OutboundDeletedMessageView;
    readonly init: OutboundDeletedMessageInit;
    readonly controller: OutboundDeletedMessageController;
    readonly model: OutboundDeletedMessageModel;
    readonly store: OutboundDeletedMessageModelStore;
}
