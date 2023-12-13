import type {MessageDirection, MessageType} from '~/common/enum';
import type {
    IInboundAudioMessageModelStore,
    InboundAudioMessage,
    IOutboundAudioMessageModelStore,
    OutboundAudioMessage,
} from '~/common/model/types/message/audio';
import type {
    IInboundFileMessageModelStore,
    InboundFileMessage,
    IOutboundFileMessageModelStore,
    OutboundFileMessage,
} from '~/common/model/types/message/file';
import type {
    IInboundImageMessageModelStore,
    InboundImageMessage,
    IOutboundImageMessageModelStore,
    OutboundImageMessage,
} from '~/common/model/types/message/image';
import type {
    IInboundTextMessageModelStore,
    InboundTextMessage,
    IOutboundTextMessageModelStore,
    OutboundTextMessage,
} from '~/common/model/types/message/text';
import type {
    IInboundVideoMessageModelStore,
    InboundVideoMessage,
    IOutboundVideoMessageModelStore,
    OutboundVideoMessage,
} from '~/common/model/types/message/video';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {LocalModelStore, RemoteModelStore} from '~/common/model/utils/model-store';
import type {IDerivableSetStore, RemoteSetStore} from '~/common/utils/store/set-store';

export * from './common';

/**
 * Helper to return the appropriate bundle for the specified inbound message type.
 */
export type InboundMessageFor<TType extends MessageType> = TType extends MessageType.TEXT
    ? InboundTextMessage
    : TType extends MessageType.FILE
      ? InboundFileMessage
      : TType extends MessageType.IMAGE
        ? InboundImageMessage
        : TType extends MessageType.VIDEO
          ? InboundVideoMessage
          : TType extends MessageType.AUDIO
            ? InboundAudioMessage
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
        : TType extends MessageType.VIDEO
          ? OutboundVideoMessage
          : TType extends MessageType.AUDIO
            ? OutboundAudioMessage
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
export type AnyFileBasedMessageModel =
    | InboundAudioMessage['model']
    | InboundFileMessage['model']
    | InboundImageMessage['model']
    | InboundVideoMessage['model']
    | OutboundAudioMessage['model']
    | OutboundFileMessage['model']
    | OutboundImageMessage['model']
    | OutboundVideoMessage['model'];
export type AnyInboundMessageModel =
    | InboundTextMessage['model']
    | InboundFileMessage['model']
    | InboundImageMessage['model']
    | InboundVideoMessage['model']
    | InboundAudioMessage['model'];
export type AnyOutboundMessageModel =
    | OutboundTextMessage['model']
    | OutboundFileMessage['model']
    | OutboundImageMessage['model']
    | OutboundVideoMessage['model']
    | OutboundAudioMessage['model'];
export type AnyMessageModelStore = AnyInboundMessageModelStore | AnyOutboundMessageModelStore;
export type AnyInboundMessageModelStore =
    | IInboundTextMessageModelStore
    | IInboundFileMessageModelStore
    | IInboundImageMessageModelStore
    | IInboundVideoMessageModelStore
    | IInboundAudioMessageModelStore;
export type AnyOutboundMessageModelStore =
    | IOutboundTextMessageModelStore
    | IOutboundFileMessageModelStore
    | IOutboundImageMessageModelStore
    | IOutboundVideoMessageModelStore
    | IOutboundAudioMessageModelStore;
export type AnyTextMessageModelStore =
    | IInboundTextMessageModelStore
    | IOutboundTextMessageModelStore;
export type AnyFileMessageModelStore =
    | IInboundFileMessageModelStore
    | IOutboundFileMessageModelStore;
export type AnyImageMessageModelStore =
    | IInboundImageMessageModelStore
    | IOutboundImageMessageModelStore;
export type AnyVideoMessageModelStore =
    | IInboundVideoMessageModelStore
    | IOutboundVideoMessageModelStore;
export type AnyAudioMessageModelStore =
    | IInboundAudioMessageModelStore
    | IOutboundAudioMessageModelStore;

export type SetOfAnyRemoteMessageModel =
    | ReadonlySet<RemoteModelStore<InboundTextMessage['model']>>
    | ReadonlySet<RemoteModelStore<OutboundTextMessage['model']>>
    | ReadonlySet<RemoteModelStore<InboundFileMessage['model']>>
    | ReadonlySet<RemoteModelStore<OutboundFileMessage['model']>>
    | ReadonlySet<RemoteModelStore<InboundImageMessage['model']>>
    | ReadonlySet<RemoteModelStore<OutboundImageMessage['model']>>
    | ReadonlySet<RemoteModelStore<InboundVideoMessage['model']>>
    | ReadonlySet<RemoteModelStore<OutboundVideoMessage['model']>>
    | ReadonlySet<RemoteModelStore<InboundAudioMessage['model']>>
    | ReadonlySet<RemoteModelStore<OutboundAudioMessage['model']>>;
export type SetOfAnyLocalMessageModelStore = IDerivableSetStore<
    | LocalModelStore<InboundTextMessage['model']>
    | LocalModelStore<OutboundTextMessage['model']>
    | LocalModelStore<InboundFileMessage['model']>
    | LocalModelStore<OutboundFileMessage['model']>
    | LocalModelStore<InboundImageMessage['model']>
    | LocalModelStore<OutboundImageMessage['model']>
    | LocalModelStore<InboundVideoMessage['model']>
    | LocalModelStore<OutboundVideoMessage['model']>
    | LocalModelStore<InboundAudioMessage['model']>
    | LocalModelStore<OutboundAudioMessage['model']>
>;
export type SetOfAnyRemoteMessageModelStore = RemoteSetStore<
    | RemoteModelStore<InboundTextMessage['model']>
    | RemoteModelStore<OutboundTextMessage['model']>
    | RemoteModelStore<InboundFileMessage['model']>
    | RemoteModelStore<OutboundFileMessage['model']>
    | RemoteModelStore<InboundImageMessage['model']>
    | RemoteModelStore<OutboundImageMessage['model']>
    | RemoteModelStore<InboundVideoMessage['model']>
    | RemoteModelStore<OutboundVideoMessage['model']>
    | RemoteModelStore<InboundAudioMessage['model']>
    | RemoteModelStore<OutboundAudioMessage['model']>
>;

export type AnyFileBasedInboundMessageModelLifetimeGuard =
    | ModelLifetimeGuard<InboundFileMessage['view']>
    | ModelLifetimeGuard<InboundImageMessage['view']>
    | ModelLifetimeGuard<InboundVideoMessage['view']>
    | ModelLifetimeGuard<InboundAudioMessage['view']>;
export type AnyFileBasedOutboundMessageModelLifetimeGuard =
    | ModelLifetimeGuard<OutboundFileMessage['view']>
    | ModelLifetimeGuard<OutboundImageMessage['view']>
    | ModelLifetimeGuard<OutboundVideoMessage['view']>
    | ModelLifetimeGuard<OutboundAudioMessage['view']>;
export type AnyFileBasedMessageModelLifetimeGuard =
    | AnyFileBasedInboundMessageModelLifetimeGuard
    | AnyFileBasedOutboundMessageModelLifetimeGuard;
