import type {MessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/props';
import type {I18nType} from '~/app/ui/i18n-types';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {localeSort} from '~/common/utils/string';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import type {ConversationMessageSetStore} from '~/common/viewmodel/conversation/main/store';

/**
 * Shape of props as they should be provided from the backend.
 */
export type MessagePropsFromBackend = Omit<MessageProps, 'boundary' | 'conversation' | 'services'>;

export function messageSetStoreToMessagePropsStore(
    messageSetStore: Remote<ConversationMessageSetStore>,
    i18n: I18nType,
): IQueryableStore<MessagePropsFromBackend[]> {
    return derive([messageSetStore], ([{currentValue: messageSet}], getAndSubscribe) =>
        [...messageSet]
            .map((value) => {
                const viewModel = getAndSubscribe(value.viewModelStore);

                const quoteProps =
                    viewModel.quote !== undefined && viewModel.quote !== 'not-found'
                        ? getMessageProps(
                              viewModel.quote.viewModelController,
                              getAndSubscribe(viewModel.quote.viewModelStore),
                              i18n,
                          )
                        : viewModel.quote;

                return {
                    ...getMessageProps(value.viewModelController, viewModel, i18n),
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
    i18n: I18nType,
): Omit<MessagePropsFromBackend, 'quote'> {
    return {
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
): MessagePropsFromBackend['file'] {
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
): MessagePropsFromBackend['reactions'] {
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
