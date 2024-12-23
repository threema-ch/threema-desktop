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
import type {f64} from '~/common/types';

// View

export interface CommonAudioMessageView extends CommonBaseFileMessageView {
    /**
     * Reported duration of the audio, in seconds.
     */
    readonly duration?: f64;
}
export type InboundAudioMessageView = InboundBaseFileMessageView & CommonAudioMessageView;
export type OutboundAudioMessageView = OutboundBaseFileMessageView & CommonAudioMessageView;

// Init

/**
 * Fields needed to create a new audio message.
 */
export type CommonAudioMessageInit = CommonBaseFileMessageInit<MessageType.AUDIO> &
    Pick<CommonAudioMessageView, 'duration'>;
type InboundAudioMessageInit = CommonAudioMessageInit & InboundBaseMessageInit<MessageType.AUDIO>;
type OutboundAudioMessageInit = CommonAudioMessageInit & OutboundBaseMessageInit<MessageType.AUDIO>;

// Controller

/**
 * Controller for inbound audio messages.
 */
export type InboundAudioMessageController =
    InboundBaseFileMessageController<InboundAudioMessageView>;

/**
 * Controller for outbound audio messages.
 */
export type OutboundAudioMessageController =
    OutboundBaseFileMessageController<OutboundAudioMessageView>;

// Model

/**
 * Inbound audio message model.
 */
type InboundAudioMessageModel = Model<
    InboundAudioMessageView,
    InboundAudioMessageController,
    MessageDirection.INBOUND,
    MessageType.AUDIO
>;
export type IInboundAudioMessageModelStore = ModelStore<InboundAudioMessageModel>;

/**
 * Outbound audio message model.
 */
type OutboundAudioMessageModel = Model<
    OutboundAudioMessageView,
    OutboundAudioMessageController,
    MessageDirection.OUTBOUND,
    MessageType.AUDIO
>;
export type IOutboundAudioMessageModelStore = ModelStore<OutboundAudioMessageModel>;

// Bundle

/**
 * Combined types related to an inbound audio message.
 */
export interface InboundAudioMessageBundle extends CommonInboundMessageBundle<'audio'> {
    readonly view: InboundAudioMessageView;
    readonly init: InboundAudioMessageInit;
    readonly controller: InboundAudioMessageController;
    readonly model: InboundAudioMessageModel;
    readonly store: ModelStore<InboundAudioMessageModel>;
}

/**
 * Combined types related to an outbound audio message.
 */
export interface OutboundAudioMessageBundle extends CommonOutboundMessageBundle<'audio'> {
    readonly view: OutboundAudioMessageView;
    readonly init: OutboundAudioMessageInit;
    readonly controller: OutboundAudioMessageController;
    readonly model: OutboundAudioMessageModel;
    readonly store: ModelStore<OutboundAudioMessageModel>;
}
