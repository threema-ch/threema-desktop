import {MessageType} from '~/common/enum';
import type {ConversationModelStore} from '~/common/model/conversation';
import {conversationCompareFn} from '~/common/model/utils/conversation';
import {isNotUndefined, unreachable} from '~/common/utils/assert';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import {LocalSetStore} from '~/common/utils/store/set-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {getConversationDeletedMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/deleted-message';
import type {AnyConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/helpers';
import {getConversationRegularMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/regular-message';
import type {SearchParams} from '~/common/viewmodel/search/nav/controller';
import type {
    ConversationSearchResult,
    MessageSearchResult,
    ReceiverSearchResult,
    SearchViewModel,
} from '~/common/viewmodel/search/nav/store/types';
import {
    getCommonReceiverData,
    getConversationReceiverData,
} from '~/common/viewmodel/utils/receiver';

const TAG_BASE = `search.nav.store`;

/**
 * Returns the {@link ConversationSearchResults}s that match the current search term in
 * {@link searchViewModelController}.
 */
export function getConversationSearchResults(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    searchParams: SearchParams,
    getAndSubscribe: GetAndSubscribeFunction,
): SearchViewModel['conversationSearchResults'] {
    const filteredConversations: ConversationSearchResult[] = [];
    if (searchParams.term !== undefined) {
        const sortedConversations = [
            ...getAndSubscribe(services.model.conversations.getAll()),
        ].sort((a, b) => conversationCompareFn(getAndSubscribe(a).view, getAndSubscribe(b).view));

        for (const conversationModelStore of sortedConversations) {
            const conversationController = conversationModelStore.get().controller;
            if (!conversationController.lifetimeGuard.active.get()) {
                continue;
            }
            const commonData = getCommonReceiverData(conversationController.receiver().get());

            if (commonData.name.toLowerCase().includes(searchParams.term.toLowerCase())) {
                filteredConversations.push(
                    getConversationSearchResult(services, conversationModelStore, getAndSubscribe),
                );

                if (searchParams.limits.conversations === undefined) {
                    continue;
                } else if (filteredConversations.length < searchParams.limits.conversations) {
                    continue;
                } else {
                    break;
                }
            }
        }
    }

    const tag = 'conversation-results[]';
    return new LocalSetStore(new Set(filteredConversations), {
        debug: {
            log: services.logging.logger(`${TAG_BASE}.${tag}`),
            tag,
        },
    });
}

/**
 * Derives {@link ConversationSearchResult} data from a {@link ConversationModelStore}.
 */
export function getConversationSearchResult(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    conversationModelStore: ConversationModelStore,
    getAndSubscribe: GetAndSubscribeFunction,
): ConversationSearchResult {
    const {endpoint} = services;

    const conversationModel = getAndSubscribe(conversationModelStore);
    const lastMessageModelStore = conversationModel.controller.lastMessageStore().get();

    let lastMessageViewModelBundle: AnyConversationMessageViewModelBundle | undefined = undefined;
    if (lastMessageModelStore !== undefined) {
        switch (lastMessageModelStore.type) {
            case MessageType.DELETED:
                lastMessageViewModelBundle = getConversationDeletedMessageViewModelBundle(
                    services,
                    lastMessageModelStore,
                );
                break;

            case MessageType.AUDIO:
            case MessageType.FILE:
            case MessageType.IMAGE:
            case MessageType.TEXT:
            case MessageType.VIDEO:
                lastMessageViewModelBundle = getConversationRegularMessageViewModelBundle(
                    services,
                    lastMessageModelStore,
                    conversationModelStore,
                    false,
                );
                break;

            default:
                return unreachable(lastMessageModelStore);
        }
    }

    return endpoint.exposeProperties({
        category: conversationModel.view.category,
        lastMessage: lastMessageViewModelBundle,
        lastUpdate: conversationModel.view.lastUpdate,
        receiver: getConversationReceiverData(services, conversationModel, getAndSubscribe),
        totalMessageCount: conversationModel.controller.getMessageCount(),
        unreadMessageCount: conversationModel.view.unreadMessageCount,
        visibility: conversationModel.view.visibility,
    });
}

/**
 * Returns the {@link MessageSearchResult}s that match the current search term in
 * {@link searchViewModelController}.
 */
export function getMessageSearchResults(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    searchParams: SearchParams,
    getAndSubscribe: GetAndSubscribeFunction,
): SearchViewModel['messageSearchResults'] {
    const {endpoint} = services;

    let messageResults: MessageSearchResult[] = [];
    if (searchParams.term !== undefined) {
        const messageSetStore = services.model.messages.findAllByText(
            searchParams.term,
            searchParams.limits.messages,
        );

        messageResults = [...getAndSubscribe(messageSetStore)]
            .map((messageModelStore) => {
                const messageModel = getAndSubscribe(messageModelStore);
                const conversationModelStore = messageModel.controller.conversation();
                const conversationModel = getAndSubscribe(conversationModelStore);
                if (!conversationModel.controller.lifetimeGuard.active.get()) {
                    return undefined;
                }

                const isMessageActive = getAndSubscribe(
                    messageModelStore.get().controller.lifetimeGuard.active,
                );

                if (!isMessageActive) {
                    return undefined;
                }

                return endpoint.exposeProperties({
                    conversation: {
                        receiver: getConversationReceiverData(
                            services,
                            conversationModel,
                            getAndSubscribe,
                        ),
                    },
                    message: getConversationRegularMessageViewModelBundle(
                        services,
                        messageModelStore,
                        conversationModelStore,
                        true,
                    ),
                });
            })
            .filter(isNotUndefined);
    }

    const tag = 'message-results[]';
    return new LocalSetStore(new Set(messageResults), {
        debug: {
            log: services.logging.logger(`${TAG_BASE}.${tag}`),
            tag,
        },
    });
}

/**
 * Returns the {@link ReceiverSearchResult}s that match the current search term in
 * {@link searchViewModelController}.
 */
export function getReceiverSearchResults(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    searchParams: SearchParams,
    getAndSubscribe: GetAndSubscribeFunction,
): SearchViewModel['receiverSearchResults'] {
    const {endpoint} = services;

    const receiverResults: ReceiverSearchResult[] = [];
    if (searchParams.term !== undefined) {
        const contactSet = getAndSubscribe(services.model.contacts.getAll());
        const groupSet = getAndSubscribe(services.model.groups.getAll());

        for (const contactOrGroupModelStore of [...contactSet, ...groupSet].sort((a, b) =>
            a.get().view.displayName.localeCompare(b.get().view.displayName),
        )) {
            const commonData = getCommonReceiverData(contactOrGroupModelStore.get());

            if (commonData.name.toLowerCase().includes(searchParams.term.toLowerCase())) {
                const model = getAndSubscribe(contactOrGroupModelStore);
                if (model.controller.lifetimeGuard.active.get()) {
                    continue;
                }
                receiverResults.push(
                    endpoint.exposeProperties({
                        receiver: getConversationReceiverData(
                            services,
                            model.controller.conversation().get(),
                            getAndSubscribe,
                        ),
                    }),
                );

                if (searchParams.limits.receivers === undefined) {
                    continue;
                } else if (receiverResults.length < searchParams.limits.receivers) {
                    continue;
                } else {
                    break;
                }
            }
        }
    }

    const tag = 'receiver-results[]';
    return new LocalSetStore(new Set(receiverResults), {
        debug: {
            log: services.logging.logger(`${TAG_BASE}.${tag}`),
            tag,
        },
    });
}
