import type {ConversationPreviewListProps} from '~/app/ui/components/partials/conversation-preview-list/props';
import type {MessagePreviewListProps} from '~/app/ui/components/partials/message-preview-list/props';
import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {u53} from '~/common/types';
import {chunkBy} from '~/common/utils/array';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {RemoteSetStore} from '~/common/utils/store/set-store';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import type {
    ConversationSearchResult,
    MessageSearchResult,
    ReceiverSearchResult,
} from '~/common/viewmodel/search/nav/store/types';

/**
 * Transforms the `SetStore` of `ConversationSearchResult`s, which is sent by the ViewModel, to a
 * new store compatible with the shape of props expected by `ConversationPreviewList` component.
 */
export function conversationSearchResultSetStoreToConversationPreviewListPropsStore(
    conversationSearchResultSetStore: RemoteSetStore<Remote<ConversationSearchResult>>,
): IQueryableStore<Omit<ConversationPreviewListProps, 'services'>> {
    return derive(
        conversationSearchResultSetStore,
        (conversationSearchResultSet, getAndSubscribe) => ({
            items: [...conversationSearchResultSet].map((result) => {
                const lastMessageViewModelStore = result.lastMessage?.viewModelStore;
                const lastMessageViewModel =
                    lastMessageViewModelStore === undefined
                        ? undefined
                        : getAndSubscribe(lastMessageViewModelStore);

                return {
                    isArchived: result.isArchived,
                    isPinned: result.isPinned,
                    isPrivate: result.isPrivate,
                    lastMessage:
                        lastMessageViewModel === undefined
                            ? undefined
                            : {
                                  file: lastMessageViewModel.file,
                                  reactions: lastMessageViewModel.reactions,
                                  sender: lastMessageViewModel.sender,
                                  status: lastMessageViewModel.status,
                                  text: lastMessageViewModel.text,
                              },
                    receiver: result.receiver,
                };
            }),
        }),
    );
}

/**
 * Transforms the `SetStore` of `MessageSearchResult`s, which is sent by the ViewModel, to a new
 * store compatible with the shape of props expected by `ConversationPreviewList` component.
 */
export function messageSearchResultSetStoreToMessagePreviewListPropsStore(
    messageSearchResultSetStore: RemoteSetStore<Remote<MessageSearchResult>>,
): IQueryableStore<Omit<MessagePreviewListProps, 'services'>> {
    return derive(messageSearchResultSetStore, (messageSearchResultSet, getAndSubscribe) => ({
        items: chunkBy(
            [...messageSearchResultSet],
            (result) => result.conversation.receiver.lookup.uid,
        ).map((groupedResults) => ({
            // As the results were only chunked, it is certain that each chunk has at least one
            // element.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            conversation: groupedResults[0]!.conversation,
            messages: groupedResults
                .map((result) => {
                    const messageViewModel = getAndSubscribe(result.message.viewModelStore);

                    const quoteProps =
                        messageViewModel.quote !== undefined &&
                        messageViewModel.quote !== 'not-found'
                            ? getMessageProps(
                                  messageViewModel.quote.viewModelController,
                                  getAndSubscribe(messageViewModel.quote.viewModelStore),
                              )
                            : messageViewModel.quote;

                    return {
                        ...getMessageProps(result.message.viewModelController, messageViewModel),
                        ordinal: messageViewModel.ordinal,
                        quote: quoteProps,
                    };
                })
                // Sort by newest messages first.
                .sort((a, b) => b.ordinal - a.ordinal),
        })),
    }));
}

/**
 * Transforms the `SetStore` of `ReceiverSearchResult`s, which is sent by the ViewModel, to a new
 * store compatible with the shape of props expected by `ReceiverPreviewList` component.
 */
export function receiverSearchResultSetStoreToReceiverPreviewListPropsStore(
    receiverSearchResultSetStore: RemoteSetStore<Remote<ReceiverSearchResult>>,
): IQueryableStore<Omit<ReceiverPreviewListProps, 'services'>> {
    return derive(receiverSearchResultSetStore, (receiverSearchResultSet) => ({
        items: [...receiverSearchResultSet].map((result) => ({
            receiver: result.receiver,
        })),
    }));
}

function getMessageProps(
    viewModelController: Remote<ConversationMessageViewModelBundle>['viewModelController'],
    viewModel: ReturnType<Remote<ConversationMessageViewModelBundle>['viewModelStore']['get']>,
): Omit<MessagePreviewListProps['items'][u53]['messages'][u53], 'quote'> {
    return {
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
): MessagePreviewListProps['items'][u53]['messages'][u53]['file'] {
    if (viewModel.file !== undefined) {
        return {
            ...viewModel.file,
            fetchFileBytes: viewModelController.getBlob,
        };
    }

    return undefined;
}