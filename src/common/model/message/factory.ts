import type {DbMessageCommon, DbMessageFor} from '~/common/db';
import type {MessageDirection, MessageType} from '~/common/enum';
import type {
    AnyMessageModelStore,
    Contact,
    DirectedMessageFor,
    ServicesForModel,
} from '~/common/model';
import type {MessageFactory} from '~/common/model/message';
import {createAudioMessage, getAudioMessageModelStore} from '~/common/model/message/audio-message';
import type {NO_SENDER} from '~/common/model/message/common';
import {getDeletedMessageModelStore} from '~/common/model/message/deleted-message';
import {createFileMessage, getFileMessageModelStore} from '~/common/model/message/file-message';
import {createImageMessage, getImageMessageModelStore} from '~/common/model/message/image-message';
import {createTextMessage, getTextMessageModelStore} from '~/common/model/message/text-message';
import {createVideoMessage, getVideoMessageModelStore} from '~/common/model/message/video-message';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {AnyNonDeletedMessageType, BaseMessageView} from '~/common/model/types/message';
import type {ModelStore} from '~/common/model/utils/model-store';
import {assert, unreachable} from '~/common/utils/assert';

/**
 * Default message factory for creating stores and database entries for all existing message types.
 */
export const MESSAGE_FACTORY: MessageFactory = {
    createStore: <TModelStore extends AnyMessageModelStore>(
        services: ServicesForModel,
        direction: TModelStore['ctx'],
        conversation: ConversationControllerHandle,
        message: DbMessageFor<TModelStore['type']>,
        common: BaseMessageView<TModelStore['ctx']>,
        sender: ModelStore<Contact> | typeof NO_SENDER,
    ): TModelStore => {
        switch (message.type) {
            case 'text': {
                return getTextMessageModelStore(
                    services,
                    conversation,
                    message,
                    common,
                    sender,
                ) as TModelStore; // Trivially true as message.type === TModelStore['type']
            }
            case 'file':
                return getFileMessageModelStore(
                    services,
                    conversation,
                    message,
                    common,
                    sender,
                ) as TModelStore; // Trivially true as message.type === TModelStore['type']
            case 'image':
                return getImageMessageModelStore(
                    services,
                    conversation,
                    message,
                    common,
                    sender,
                ) as TModelStore; // Trivially true as message.type === TModelStore['type']
            case 'video':
                return getVideoMessageModelStore(
                    services,
                    conversation,
                    message,
                    common,
                    sender,
                ) as TModelStore; // Trivially true as message.type === TModelStore['type']
            case 'audio':
                return getAudioMessageModelStore(
                    services,
                    conversation,
                    message,
                    common,
                    sender,
                ) as TModelStore; // Trivially true as message.type === TModelStore['type']
            case 'deleted':
                assert(
                    common.deletedAt !== undefined,
                    `DeletedAt must be defined for deleted message with uid ${message.uid}`,
                );
                return getDeletedMessageModelStore(
                    services,
                    conversation,
                    common,
                    message.uid,
                    sender,
                ) as TModelStore;
            default:
                return unreachable(message);
        }
    },

    createDbMessage: <TDirection extends MessageDirection, TType extends AnyNonDeletedMessageType>(
        services: ServicesForModel,
        common: Omit<DbMessageCommon<TType>, 'uid' | 'type' | 'ordinal'>,
        init: DirectedMessageFor<TDirection, TType, 'init'>,
    ): DbMessageFor<TType> => {
        switch (init.type) {
            case 'text': {
                return createTextMessage(
                    services,
                    common,
                    init as DirectedMessageFor<TDirection, MessageType.TEXT, 'init'>,
                ) as DbMessageFor<TType>;
            }
            case 'file': {
                return createFileMessage(
                    services,
                    common,
                    init as DirectedMessageFor<TDirection, MessageType.FILE, 'init'>,
                ) as DbMessageFor<TType>;
            }
            case 'image':
                return createImageMessage(
                    services,
                    common,
                    init as DirectedMessageFor<TDirection, MessageType.IMAGE, 'init'>,
                ) as DbMessageFor<TType>;
            case 'video':
                return createVideoMessage(
                    services,
                    common,
                    init as DirectedMessageFor<TDirection, MessageType.VIDEO, 'init'>,
                ) as DbMessageFor<TType>;
            case 'audio':
                return createAudioMessage(
                    services,
                    common,
                    init as DirectedMessageFor<TDirection, MessageType.AUDIO, 'init'>,
                ) as DbMessageFor<TType>;
            default:
                return unreachable(init);
        }
    },
};
