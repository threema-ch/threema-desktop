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
import {createFileMessage, getFileMessageModelStore} from '~/common/model/message/file-message';
import {createImageMessage, getImageMessageModelStore} from '~/common/model/message/image-message';
import {createTextMessage, getTextMessageModelStore} from '~/common/model/message/text-message';
import {createVideoMessage, getVideoMessageModelStore} from '~/common/model/message/video-message';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {BaseMessageView} from '~/common/model/types/message';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {unreachable} from '~/common/utils/assert';

/**
 * Default message factory for creating stores and database entries for all existing message types.
 */
export const MESSAGE_FACTORY: MessageFactory = {
    createStore: <TLocalModelStore extends AnyMessageModelStore>(
        services: ServicesForModel,
        direction: TLocalModelStore['ctx'],
        conversation: ConversationControllerHandle,
        message: DbMessageFor<TLocalModelStore['type']>,
        common: BaseMessageView<TLocalModelStore['ctx']>,
        sender: LocalModelStore<Contact> | typeof NO_SENDER,
    ): TLocalModelStore => {
        switch (message.type) {
            case 'text': {
                return getTextMessageModelStore(
                    services,
                    conversation,
                    message,
                    common,
                    sender,
                ) as TLocalModelStore; // Trivially true as message.type === TLocalModelStore['type']
            }
            case 'file':
                return getFileMessageModelStore(
                    services,
                    conversation,
                    message,
                    common,
                    sender,
                ) as TLocalModelStore; // Trivially true as message.type === TLocalModelStore['type']
            case 'image':
                return getImageMessageModelStore(
                    services,
                    conversation,
                    message,
                    common,
                    sender,
                ) as TLocalModelStore; // Trivially true as message.type === TLocalModelStore['type']
            case 'video':
                return getVideoMessageModelStore(
                    services,
                    conversation,
                    message,
                    common,
                    sender,
                ) as TLocalModelStore; // Trivially true as message.type === TLocalModelStore['type']
            case 'audio':
                return getAudioMessageModelStore(
                    services,
                    conversation,
                    message,
                    common,
                    sender,
                ) as TLocalModelStore; // Trivially true as message.type === TLocalModelStore['type']
            default:
                return unreachable(message);
        }
    },

    createDbMessage: <TDirection extends MessageDirection, TType extends MessageType>(
        services: ServicesForModel,
        common: Omit<DbMessageCommon<TType>, 'uid' | 'type'>,
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
