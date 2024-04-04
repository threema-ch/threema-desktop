import type {MessageDirection, MessageType} from '~/common/enum';
import type {LocalModel} from '~/common/model/types/common';
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

export type InboundDeletedMessageView = InboundBaseMessageView &
    Required<Pick<CommonBaseMessageView, 'deletedAt'>> & {
        readonly history: [];
        readonly lastEditedAt: undefined;
        readonly reactions: [];
        readonly raw: undefined;
    };

export type OutboundDeletedMessageView = OutboundBaseMessageView &
    Required<Pick<CommonBaseMessageView, 'deletedAt'>> & {
        readonly history: [];
        readonly lastEditedAt: undefined;
        readonly reactions: [];
    };

export type InboundDeletedMessageInit = InboundBaseMessageInit<MessageType.DELETED>;
export type OutboundDeletedMessageInit = OutboundBaseMessageInit<MessageType.DELETED>;

export type InboundDeletedMessageController =
    CommonBaseMessageController<InboundDeletedMessageView> & {
        readonly sender: () => LocalModelStore<Contact>;
    };
export type OutboundDeletedMessageController =
    CommonBaseMessageController<OutboundDeletedMessageView>;

export type OutboundDeletedMessageModel = LocalModel<
    OutboundDeletedMessageView,
    OutboundDeletedMessageController,
    MessageDirection.OUTBOUND,
    MessageType.DELETED
>;

export type InboundDeletedMessageModel = LocalModel<
    InboundDeletedMessageView,
    InboundDeletedMessageController,
    MessageDirection.INBOUND,
    MessageType.DELETED
>;

export type InboundDeletedMessageModelStore = LocalModelStore<InboundDeletedMessageModel>;
export type OutboundDeletedMessageModelStore = LocalModelStore<OutboundDeletedMessageModel>;

export interface InboundDeletedMessage {
    readonly view: InboundDeletedMessageView;
    readonly init: InboundDeletedMessageInit;
    readonly controller: InboundDeletedMessageController;
    readonly model: InboundDeletedMessageModel;
    readonly store: InboundDeletedMessageModelStore;
}
export interface OutboundDeletedMessage {
    readonly view: OutboundDeletedMessageView;
    readonly init: OutboundDeletedMessageInit;
    readonly controller: OutboundDeletedMessageController;
    readonly model: OutboundDeletedMessageModel;
    readonly store: OutboundDeletedMessageModelStore;
}
