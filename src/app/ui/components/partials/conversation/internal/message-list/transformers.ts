import type {
    AnyStatusMessageProps,
    MessageProps,
} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/props';
import type {I18nType} from '~/app/ui/i18n-types';
import {statusMessageUidToStatusMessageId} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {localeSort} from '~/common/utils/string';
import type {
    ConversationMessageViewModelBundle,
    ConversationStatusMessageViewModelBundle,
} from '~/common/viewmodel/conversation/main/message';
import type {ConversationMessageSetStore} from '~/common/viewmodel/conversation/main/store';

/**
 * Shape of props as they should be provided from the backend.
 */
export type MessagePropsFromBackend = Omit<MessageProps, 'boundary' | 'conversation' | 'services'>;
export type StatusPropsFromBackend = Omit<AnyStatusMessageProps, 'services' | 'boundary'>;
export type AnyMessagePropsFromBackend = MessagePropsFromBackend | StatusPropsFromBackend;

export function messageSetStoreToMessagePropsStore(
    messageSetStore: Remote<ConversationMessageSetStore>,
    i18n: I18nType,
): IQueryableStore<AnyMessagePropsFromBackend[]> {
    return derive([messageSetStore], ([{currentValue: messageSet}], getAndSubscribe) =>
        [...messageSet]
            .map((value): AnyMessagePropsFromBackend & {ordinal: number} => {
                switch (value.type) {
                    case 'status': {
                        const viewModel = getAndSubscribe(value.viewModelStore);
                        return {
                            type: 'status',
                            id: statusMessageUidToStatusMessageId(value.viewModelStore.get().uid),
                            information: {
                                text: getStatusMessageProps(viewModel, i18n),
                                type: viewModel.type,
                                at: viewModel.createdAt,
                            },
                            ordinal: viewModel.ordinal,
                        };
                    }
                    case 'message': {
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
                    }
                    default:
                        return unreachable(value);
                }
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

export function getStatusMessageProps(
    viewModel: ReturnType<
        Remote<ConversationStatusMessageViewModelBundle>['viewModelStore']['get']
    >,
    i18n: I18nType,
): string {
    switch (viewModel.type) {
        case 'group-member-change': {
            const added = viewModel.value.added.join(', ');
            const removed = viewModel.value.removed.join(',');
            const numAdded = viewModel.value.added.length;
            const numRemoved = viewModel.value.removed.length;
            return i18n.t(
                'status.prose--group-member-change',
                '{numAdded, plural, =0 {} =1 {{added} was added to the group} other {{added} were added to the group}}{and, plural, =0 { } other {, and}} {numRemoved, plural, =0 {} =1 {{removed} was removed from the group} other {{removed} were removed from the group}}',

                {
                    added,
                    removed,
                    numAdded: String(numAdded),
                    numRemoved: String(numRemoved),
                    and: String(numAdded > 0 && numRemoved > 0 ? '1' : '0'),
                },
            );
        }
        case 'group-name-change': {
            const value = viewModel.value;
            if (value.oldName === '') {
                return i18n.t(
                    'status.prose--group-created-name',
                    'Group created with name "{new}"',
                    {
                        new: value.newName,
                    },
                );
            }
            return i18n.t(
                'status.prose--group-name-change',
                'The group name was changed from "{old}" to "{new}"',
                {old: value.oldName, new: value.newName},
            );
        }
        default:
            return unreachable(viewModel);
    }
}
