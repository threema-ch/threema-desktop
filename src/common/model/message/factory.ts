import {type DbMessageCommon, type DbMessageFor} from '~/common/db';
import {type MessageDirection, type MessageType} from '~/common/enum';
import {
    type AnyMessageModelStore,
    type BaseMessageView,
    type Contact,
    type ConversationControllerHandle,
    type DirectedMessageFor,
    type ServicesForModel,
} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {unreachable} from '~/common/utils/assert';

import {type MessageFactory, type NO_SENDER} from '.';
import {createFileMessage, getFileMessageModelStore} from './file-message';
import {createTextMessage, getTextMessageModelStore} from './text-message';

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
            default:
                return unreachable(init);
        }
    },
};
