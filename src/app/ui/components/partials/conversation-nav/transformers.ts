import type {ContextMenuItemHandlerProps} from '~/app/ui/components/partials/conversation-nav/types';
import type {ConversationPreviewListProps} from '~/app/ui/components/partials/conversation-preview-list/props';
import {transformMessageReactionsProps} from '~/app/ui/components/partials/message-preview-list/transformers';
import type {I18nType} from '~/app/ui/i18n-types';
import {ConversationCategory, ConversationVisibility} from '~/common/enum';
import {conversationCompareFn} from '~/common/model/utils/conversation';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {RemoteSetStore} from '~/common/utils/store/set-store';
import type {ConversationListItemViewModelBundle} from '~/common/viewmodel/conversation/list/item';

/**
 * Transforms the `SetStore` of {@link ConversationListItemViewModelBundle}s, which is sent by the
 * ViewModel, to a new store compatible with the shape of props expected by
 * `ConversationPreviewList` component.
 */
export function conversationListItemSetStoreToConversationPreviewListPropsStore(
    conversationListItemSetStore: RemoteSetStore<Remote<ConversationListItemViewModelBundle>>,
    i18n: I18nType,
): IQueryableStore<Omit<ConversationPreviewListProps<ContextMenuItemHandlerProps>, 'services'>> {
    return derive(
        [conversationListItemSetStore],
        ([{currentValue: conversationListItemSet}], getAndSubscribe) => ({
            items: [...conversationListItemSet]
                // Remove deleted / hidden conversations.
                .filter(
                    (conversation) => conversation.viewModelStore.get().lastUpdate !== undefined,
                )
                .sort((a, b) =>
                    conversationCompareFn(
                        getAndSubscribe(a.viewModelStore),
                        getAndSubscribe(b.viewModelStore),
                    ),
                )
                .map((viewModelBundle) => {
                    const viewModel = getAndSubscribe(viewModelBundle.viewModelStore);

                    const lastMessageViewModelStore = viewModel.lastMessage?.viewModelStore;
                    const lastMessageViewModel =
                        lastMessageViewModelStore === undefined
                            ? undefined
                            : getAndSubscribe(lastMessageViewModelStore);

                    return {
                        // TODO(DESK-1447): Pass current call status (example below).
                        // call: {
                        //     isJoined: true,
                        //     startedAt: new Date()
                        // },
                        handlerProps: {
                            viewModelBundle,
                        },
                        isArchived: viewModel.visibility === ConversationVisibility.ARCHIVED,
                        isPinned: viewModel.visibility === ConversationVisibility.PINNED,
                        isPrivate: viewModel.category === ConversationCategory.PROTECTED,
                        lastMessage:
                            lastMessageViewModel === undefined
                                ? undefined
                                : {
                                      deletedAt: lastMessageViewModel.deletedAt,
                                      file: lastMessageViewModel.file,
                                      reactions: transformMessageReactionsProps(
                                          lastMessageViewModel,
                                          i18n,
                                      ),
                                      sender: lastMessageViewModel.sender,
                                      status: lastMessageViewModel.status,
                                      text: lastMessageViewModel.text,
                                      type: lastMessageViewModel.type,
                                  },
                        receiver: viewModel.receiver,
                        totalMessageCount: viewModel.totalMessageCount,
                        unreadMessageCount: viewModel.unreadMessageCount,
                    };
                }),
        }),
    );
}
