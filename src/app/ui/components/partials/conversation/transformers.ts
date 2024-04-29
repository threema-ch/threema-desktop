import type {
    AnyMessageListMessage,
    MessageListMessage,
    MessageListStatusMessage,
} from '~/app/ui/components/partials/conversation/internal/message-list/props';
import type {I18nType} from '~/app/ui/i18n-types';
import type {u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {localeSort} from '~/common/utils/string';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import type {ConversationStatusMessageViewModelBundle} from '~/common/viewmodel/conversation/main/status-message';
import type {ConversationMessageSetStore} from '~/common/viewmodel/conversation/main/store';

/**
 * Transform the {@link ConversationMessageSetStore} sent from the backend to
 * {@link AnyMessageListMessage}s expected by the `MessageList` component.
 */
export function messageSetStoreToMessageListMessagesStore(
    messageSetStore: Remote<ConversationMessageSetStore>,
    i18n: I18nType,
): IQueryableStore<AnyMessageListMessage[]> {
    return derive([messageSetStore], ([{currentValue: messageSet}], getAndSubscribe) =>
        [...messageSet]
            .map((value): AnyMessageListMessage & {readonly ordinal: u53} => {
                const viewModel = getAndSubscribe(value.viewModelStore);
                switch (viewModel.conversationMessageType) {
                    case 'status': {
                        return {
                            ...getStatusMessageProps(viewModel),
                            ordinal: viewModel.ordinal,
                        };
                    }

                    case 'message': {
                        // If the `viewModel` is of type `"message"`, the controller (which is part
                        // of the same bundle) must be as well.
                        const controller =
                            value.viewModelController as Remote<ConversationMessageViewModelBundle>['viewModelController'];

                        const quoteProps =
                            viewModel.quote !== undefined && viewModel.quote !== 'not-found'
                                ? getMessageProps(
                                      viewModel.quote.viewModelController,
                                      getAndSubscribe(viewModel.quote.viewModelStore),
                                      i18n,
                                  )
                                : viewModel.quote;
                        return {
                            ...getMessageProps(controller, viewModel, i18n),
                            ordinal: viewModel.ordinal,
                            quote: quoteProps,
                        };
                    }

                    default:
                        return unreachable(viewModel);
                }
            })
            .sort((a, b) => a.ordinal - b.ordinal),
    );
}

function getMessageProps(
    viewModelController: Remote<ConversationMessageViewModelBundle>['viewModelController'],
    viewModel: ReturnType<Remote<ConversationMessageViewModelBundle>['viewModelStore']['get']>,
    i18n: I18nType,
): Omit<MessageListMessage, 'quote'> {
    return {
        type: 'message',
        actions: {
            acknowledge: async () => {
                await viewModelController.acknowledge();
            },
            decline: async () => {
                await viewModelController.decline();
            },
            edit: async (newText: string) => {
                await viewModelController.edit(newText, new Date());
            },
        },
        direction: viewModel.direction,
        file: getMessageFileProps(viewModelController, viewModel),
        id: viewModel.id,
        lastEdited: viewModel.lastEditedAt === undefined ? undefined : {at: viewModel.lastEditedAt},
        reactions: getMessageReactionsProps(viewModel, i18n),
        sender: viewModel.sender,
        status: viewModel.status,
        text: viewModel.text,
        history: viewModel.history.map((val) => ({
            at: val.editedAt,
            text: val.text,
        })),
    };
}

function getMessageFileProps(
    viewModelController: Remote<ConversationMessageViewModelBundle>['viewModelController'],
    viewModel: ReturnType<Remote<ConversationMessageViewModelBundle>['viewModelStore']['get']>,
): MessageListMessage['file'] {
    if (viewModel.file !== undefined) {
        return {
            ...viewModel.file,
            fetchFileBytes: viewModelController.getBlob,
        };
    }

    return undefined;
}

export function getMessageReactionsProps(
    viewModel: ReturnType<Remote<ConversationMessageViewModelBundle>['viewModelStore']['get']>,
    i18n: I18nType,
): MessageListMessage['reactions'] {
    return viewModel.reactions
        .map((reaction) => ({
            ...reaction,
            sender: {
                name:
                    reaction.sender.identity === 'me'
                        ? i18n.t('contacts.label--own-name', 'Me')
                        : reaction.sender.name ?? reaction.sender.identity,
            },
        }))
        .sort((a, b) => localeSort(a.sender.name, b.sender.name));
}

function getStatusMessageProps(
    viewModel: ReturnType<
        Remote<ConversationStatusMessageViewModelBundle>['viewModelStore']['get']
    >,
): MessageListStatusMessage {
    return {
        type: 'status-message',
        id: viewModel.id,
        created: {at: viewModel.createdAt},
        status: getStatusMessageStatusProps(viewModel),
    };
}

function getStatusMessageStatusProps(
    viewModel: ReturnType<
        Remote<ConversationStatusMessageViewModelBundle>['viewModelStore']['get']
    >,
): MessageListStatusMessage['status'] {
    switch (viewModel.type) {
        case 'group-member-change':
            return {
                type: 'group-member-change',
                added: viewModel.value.added,
                removed: viewModel.value.removed,
            };

        case 'group-name-change':
            return {
                type: 'group-name-change',
                newName: viewModel.value.newName,
                oldName: viewModel.value.oldName,
            };

        default:
            return unreachable(viewModel);
    }
}
