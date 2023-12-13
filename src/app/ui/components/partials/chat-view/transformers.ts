import type {MessageProps} from '~/app/ui/components/partials/chat-view/internal/message/props';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import type {ConversationMessageSetStore} from '~/common/viewmodel/conversation/main/store';

/**
 * Defined the shape of props as they should be provided from the backend.
 */
export type MessagePropsFromBackend = Omit<MessageProps, 'boundary' | 'conversation' | 'services'>;

export function messageSetStoreToMessagePropsStore(
    messageSetStore: Remote<ConversationMessageSetStore>,
): IQueryableStore<MessagePropsFromBackend[]> {
    return derive(messageSetStore, (messageSet, getAndSubscribe) =>
        [...messageSet]
            .map((value) => {
                const viewModel = getAndSubscribe(value.viewModelStore);

                const quoteProps =
                    viewModel.quote !== undefined && viewModel.quote !== 'not-found'
                        ? getMessageProps(
                              viewModel.quote.viewModelController,
                              getAndSubscribe(viewModel.quote.viewModelStore),
                          )
                        : viewModel.quote;

                return {
                    ...getMessageProps(value.viewModelController, viewModel),
                    ordinal: viewModel.ordinal,
                    quote: quoteProps,
                };
            })
            .sort((a, b) => a.ordinal - b.ordinal),
    );
}

function getMessageProps(
    viewModelController: Remote<ConversationMessageViewModelBundle>['viewModelController'],
    viewModel: ReturnType<Remote<ConversationMessageViewModelBundle>['viewModelStore']['get']>,
): Omit<MessagePropsFromBackend, 'quote'> {
    return {
        actions: {
            acknowledge: async () => {
                await viewModelController.acknowledge();
            },
            decline: async () => {
                await viewModelController.decline();
            },
        },
        direction: viewModel.direction,
        file: getMessageFileProps(viewModelController, viewModel),
        id: viewModel.id,
        reactions: viewModel.reactions,
        sender: viewModel.sender,
        status: viewModel.status,
        text: viewModel.text,
    };
}

function getMessageFileProps(
    viewModelController: Remote<ConversationMessageViewModelBundle>['viewModelController'],
    viewModel: ReturnType<Remote<ConversationMessageViewModelBundle>['viewModelStore']['get']>,
): MessagePropsFromBackend['file'] {
    if (viewModel.file !== undefined) {
        return {
            ...viewModel.file,
            fetchFileBytes: viewModelController.getBlob,
        };
    }

    return undefined;
}
