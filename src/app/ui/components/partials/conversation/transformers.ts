import type {AnyQuotedMessage} from '~/app/ui/components/partials/conversation/internal/message-list/internal/regular-message/props';
import type {
    AnyMessageListMessage,
    MessageListDeletedMessage,
    MessageListRegularMessage,
    MessageListStatusMessage,
} from '~/app/ui/components/partials/conversation/internal/message-list/props';
import type {I18nType} from '~/app/ui/i18n-types';
import type {u53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {localeSort} from '~/common/utils/string';
import type {ConversationDeletedMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/deleted-message';
import type {ConversationRegularMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/regular-message';
import type {ConversationStatusMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/status-message';
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
            .map((viewModelBundle): AnyMessageListMessage & {readonly ordinal: u53} => {
                const viewModel = getAndSubscribe(viewModelBundle.viewModelStore);

                switch (viewModelBundle.type) {
                    case 'deleted-message': {
                        assert(viewModel.type === viewModelBundle.type);

                        return {
                            ...getDeletedMessageProps(viewModel),
                            ordinal: viewModel.ordinal,
                        };
                    }

                    case 'regular-message': {
                        assert(viewModel.type === viewModelBundle.type);

                        const controller = viewModelBundle.viewModelController;

                        let quoteProps: AnyQuotedMessage | undefined = undefined;
                        if (viewModel.quote === 'not-found') {
                            quoteProps = 'not-found';
                        }
                        if (viewModel.quote !== undefined && viewModel.quote !== 'not-found') {
                            const quoteViewModel = getAndSubscribe(viewModel.quote.viewModelStore);

                            switch (quoteViewModel.type) {
                                case 'deleted-message':
                                    quoteProps = {
                                        type: 'deleted-message',
                                        id: quoteViewModel.id,
                                    };
                                    break;

                                case 'regular-message':
                                    assert(quoteViewModel.type === viewModel.quote.type);

                                    quoteProps = getMessageProps(
                                        viewModel.quote.viewModelController,
                                        quoteViewModel,
                                        i18n,
                                    );
                                    break;

                                default:
                                    unreachable(quoteViewModel);
                            }
                        }

                        return {
                            ...getMessageProps(controller, viewModel, i18n),
                            ordinal: viewModel.ordinal,
                            quote: quoteProps,
                        };
                    }

                    case 'status-message': {
                        assert(viewModel.type === viewModelBundle.type);

                        return {
                            ...getStatusMessageProps(viewModel),
                            ordinal: viewModel.ordinal,
                        };
                    }

                    default:
                        return unreachable(viewModelBundle);
                }
            })
            .sort((a, b) => a.ordinal - b.ordinal),
    );
}

function getMessageProps(
    viewModelController: Remote<ConversationRegularMessageViewModelBundle>['viewModelController'],
    viewModel: ReturnType<
        Remote<ConversationRegularMessageViewModelBundle>['viewModelStore']['get']
    >,
    i18n: I18nType,
): Omit<MessageListRegularMessage, 'quote'> {
    return {
        type: viewModel.type,
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
    viewModelController: Remote<ConversationRegularMessageViewModelBundle>['viewModelController'],
    viewModel: ReturnType<
        Remote<ConversationRegularMessageViewModelBundle>['viewModelStore']['get']
    >,
): MessageListRegularMessage['file'] {
    if (viewModel.file !== undefined) {
        return {
            ...viewModel.file,
            fetchFileBytes: viewModelController.getBlob,
        };
    }

    return undefined;
}

export function getMessageReactionsProps(
    viewModel: ReturnType<
        Remote<ConversationRegularMessageViewModelBundle>['viewModelStore']['get']
    >,
    i18n: I18nType,
): MessageListRegularMessage['reactions'] {
    return viewModel.reactions
        .map((reaction) => ({
            ...reaction,
            sender: {
                name:
                    reaction.sender.type === 'self'
                        ? i18n.t('contacts.label--own-name', 'Me')
                        : reaction.sender.name,
            },
        }))
        .sort((a, b) => localeSort(a.sender.name, b.sender.name));
}

function getDeletedMessageProps(
    viewModel: ReturnType<
        Remote<ConversationDeletedMessageViewModelBundle>['viewModelStore']['get']
    >,
): Omit<MessageListDeletedMessage, 'quote'> {
    return {
        type: 'deleted-message',
        direction: viewModel.direction,
        id: viewModel.id,
        sender: viewModel.sender,
        status: viewModel.status,
    };
}

function getStatusMessageProps(
    viewModel: ReturnType<
        Remote<ConversationStatusMessageViewModelBundle>['viewModelStore']['get']
    >,
): MessageListStatusMessage {
    return {
        type: viewModel.type,
        id: viewModel.id,
        created: viewModel.created,
        status: viewModel.status,
    };
}
