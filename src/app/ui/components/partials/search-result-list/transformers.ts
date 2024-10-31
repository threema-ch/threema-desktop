import type {ConversationPreviewListProps} from '~/app/ui/components/partials/conversation-preview-list/props';
import type {
    AnyQuotedMessage,
    MessagePreviewListProps,
} from '~/app/ui/components/partials/message-preview-list/props';
import {transformMessageReactionsProps} from '~/app/ui/components/partials/message-preview-list/transformers';
import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {I18nType} from '~/app/ui/i18n-types';
import {ConversationCategory, ConversationVisibility} from '~/common/enum';
import {conversationCompareFn} from '~/common/model/utils/conversation';
import type {u53} from '~/common/types';
import {chunkBy} from '~/common/utils/array';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {RemoteSetStore} from '~/common/utils/store/set-store';
import type {ConversationRegularMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/regular-message';
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
    i18n: I18nType,
    /**
     * Max count of items to include. If not defined, the count of items in the source store will be
     * used.
     */
    limit?: u53,
): IQueryableStore<Omit<ConversationPreviewListProps, 'services'>> {
    return derive(
        [conversationSearchResultSetStore],
        ([{currentValue: conversationSearchResultSet}], getAndSubscribe) => ({
            items: [...conversationSearchResultSet]
                // Remove deleted / hidden conversations.
                .filter((conversation) => conversation.lastUpdate !== undefined)
                .slice(0, limit)
                .sort(conversationCompareFn)
                .map((result) => {
                    const lastMessageViewModelStore = result.lastMessage?.viewModelStore;
                    const lastMessageViewModel =
                        lastMessageViewModelStore === undefined
                            ? undefined
                            : getAndSubscribe(lastMessageViewModelStore);
                    let lastMessage: ConversationPreviewListProps['items'][u53]['lastMessage'] =
                        undefined;
                    if (lastMessageViewModel !== undefined) {
                        switch (lastMessageViewModel.type) {
                            case 'deleted-message':
                                lastMessage = {
                                    reactions: [],
                                    sender: lastMessageViewModel.sender,
                                    status: lastMessageViewModel.status,
                                    direction: lastMessageViewModel.direction,
                                };
                                break;

                            case 'regular-message':
                                lastMessage = {
                                    file: lastMessageViewModel.file,
                                    reactions: transformMessageReactionsProps(
                                        lastMessageViewModel,
                                        i18n,
                                    ),
                                    sender: lastMessageViewModel.sender,
                                    status: lastMessageViewModel.status,
                                    text: lastMessageViewModel.text,
                                    direction: lastMessageViewModel.direction,
                                };
                                break;

                            case 'status-message':
                                throw new Error(
                                    'TODO(DESK-1517): Implement status messages in last message previews',
                                );

                            default:
                                unreachable(lastMessageViewModel);
                        }
                    }

                    return {
                        handlerProps: undefined,
                        isArchived: result.visibility === ConversationVisibility.ARCHIVED,
                        isPinned: result.visibility === ConversationVisibility.PINNED,
                        isPrivate: result.category === ConversationCategory.PROTECTED,
                        lastMessage,
                        receiver: result.receiver,
                        totalMessageCount: result.totalMessageCount,
                        unreadMessageCount: result.unreadMessageCount,
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
    i18n: I18nType,
    /**
     * Max count of items to include. If not defined, the count of items in the source store will be
     * used.
     */
    limit?: u53,
): IQueryableStore<Omit<MessagePreviewListProps, 'services'>> {
    return derive(
        [messageSearchResultSetStore],
        ([{currentValue: messageSearchResultSet}], getAndSubscribe) => ({
            items: chunkBy(
                [...messageSearchResultSet].slice(0, limit),
                (result) => result.conversation.receiver.lookup.uid,
            ).map((groupedResults) => ({
                // As the results were only chunked, it is certain that each chunk has at least one
                // element.
                conversation: unwrap(groupedResults[0]).conversation,
                messages: groupedResults
                    .map((result) => {
                        const messageViewModel = getAndSubscribe(result.message.viewModelStore);

                        let quoteProps: AnyQuotedMessage | undefined = undefined;
                        if (messageViewModel.quote === 'not-found') {
                            quoteProps = 'not-found';
                        }
                        if (
                            messageViewModel.quote !== undefined &&
                            messageViewModel.quote !== 'not-found'
                        ) {
                            const quoteViewModel = getAndSubscribe(
                                messageViewModel.quote.viewModelStore,
                            );

                            switch (messageViewModel.quote.type) {
                                case 'deleted-message':
                                    assert(quoteViewModel.type === messageViewModel.quote.type);

                                    quoteProps = {
                                        type: 'deleted-message',
                                        id: quoteViewModel.id,
                                    };
                                    break;

                                case 'regular-message':
                                    assert(quoteViewModel.type === messageViewModel.quote.type);

                                    quoteProps = {
                                        type: 'regular-message',
                                        ...transformMessageProps(
                                            messageViewModel.quote.viewModelController,
                                            quoteViewModel,
                                            i18n,
                                        ),
                                    };
                                    break;

                                default:
                                    unreachable(messageViewModel.quote);
                            }
                        }

                        return {
                            ...transformMessageProps(
                                result.message.viewModelController,
                                messageViewModel,
                                i18n,
                            ),
                            ordinal: messageViewModel.ordinal,
                            quote: quoteProps,
                        };
                    })
                    // Sort by newest messages first.
                    .sort((a, b) => b.ordinal - a.ordinal),
            })),
        }),
    );
}

/**
 * Transforms the `SetStore` of `ReceiverSearchResult`s, which is sent by the ViewModel, to a new
 * store compatible with the shape of props expected by `ReceiverPreviewList` component.
 */
export function receiverSearchResultSetStoreToReceiverPreviewListPropsStore(
    receiverSearchResultSetStore: RemoteSetStore<Remote<ReceiverSearchResult>>,
    /**
     * Max count of items to include. If not defined, the count of items in the source store will be
     * used.
     */
    limit?: u53,
): IQueryableStore<Omit<ReceiverPreviewListProps, 'services'>> {
    return derive([receiverSearchResultSetStore], ([{currentValue: receiverSearchResultSet}]) => ({
        items: [...receiverSearchResultSet]
            .slice(0, limit)
            .sort((a, b) => a.receiver.name.localeCompare(b.receiver.name))
            .map((result) => ({
                handlerProps: undefined,
                receiver: result.receiver,
            })),
    }));
}

function transformMessageProps(
    viewModelController: Remote<ConversationRegularMessageViewModelBundle>['viewModelController'],
    viewModel: ReturnType<
        Remote<ConversationRegularMessageViewModelBundle>['viewModelStore']['get']
    >,
    i18n: I18nType,
): Omit<MessagePreviewListProps['items'][u53]['messages'][u53], 'quote'> {
    return {
        direction: viewModel.direction,
        file: transformMessageFileProps(viewModelController, viewModel),
        id: viewModel.id,
        reactions: transformMessageReactionsProps(viewModel, i18n),
        sender: viewModel.sender,
        status: viewModel.status,
        text: viewModel.text,
    };
}

function transformMessageFileProps(
    viewModelController: Remote<ConversationRegularMessageViewModelBundle>['viewModelController'],
    viewModel: ReturnType<
        Remote<ConversationRegularMessageViewModelBundle>['viewModelStore']['get']
    >,
): MessagePreviewListProps['items'][u53]['messages'][u53]['file'] {
    if (viewModel.file !== undefined) {
        return {
            ...viewModel.file,
            fetchFileBytes: viewModelController.getBlob,
        };
    }

    return undefined;
}
