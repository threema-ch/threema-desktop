import {ConversationCategory, ConversationVisibility} from '~/common/enum';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import {LocalSetStore} from '~/common/utils/store/set-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {getConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import {getMessageText} from '~/common/viewmodel/conversation/main/message/store/helpers';
import type {SearchParams} from '~/common/viewmodel/search/nav/controller';
import type {
    ConversationSearchResult,
    MessageSearchResult,
    ReceiverSearchResult,
    SearchViewModel,
} from '~/common/viewmodel/search/nav/store/types';
import {getCommonReceiverData, getReceiverData} from '~/common/viewmodel/utils/receiver';

const TAG_BASE = `search.nav.store`;

/**
 * Returns the {@link ConversationSearchResults}s that match the current search term in
 * {@link searchViewModelController}.
 */
export function getConversationSearchResults(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    searchParams: SearchParams,
    getAndSubscribe: GetAndSubscribeFunction,
): SearchViewModel['conversationSearchResults'] {
    const filteredConversations: ConversationSearchResult[] = [];
    if (searchParams.term !== undefined) {
        for (const conversationModelStore of services.model.conversations.getAll().get()) {
            const conversationController = conversationModelStore.get().controller;
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

            const lastMessage = conversationController.lastMessageStore().get()?.get();
            const lastMessageText =
                lastMessage === undefined ? undefined : getMessageText(services, lastMessage);

            if (
                lastMessageText?.raw.toLowerCase().includes(searchParams.term.toLowerCase()) ===
                true
            ) {
                filteredConversations.push(
                    getConversationSearchResult(services, conversationModelStore, getAndSubscribe),
                );

                if (
                    searchParams.limits.conversations !== undefined &&
                    filteredConversations.length >= searchParams.limits.conversations
                ) {
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
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    conversationModelStore: ConversationModelStore,
    getAndSubscribe: GetAndSubscribeFunction,
): ConversationSearchResult {
    const {endpoint} = services;

    const conversationModel = getAndSubscribe(conversationModelStore);
    const lastMessageModelStore = conversationModel.controller.lastMessageStore().get();

    return endpoint.exposeProperties({
        isArchived: conversationModel.view.visibility === ConversationVisibility.ARCHIVED,
        isPinned: conversationModel.view.visibility === ConversationVisibility.PINNED,
        isPrivate: conversationModel.view.category === ConversationCategory.PROTECTED,
        lastMessage:
            lastMessageModelStore === undefined
                ? undefined
                : getConversationMessageViewModelBundle(
                      services,
                      lastMessageModelStore,
                      conversationModelStore,
                      false,
                  ),
        receiver: getReceiverData(services, conversationModel, getAndSubscribe),
    });
}

/**
 * Returns the {@link MessageSearchResult}s that match the current search term in
 * {@link searchViewModelController}.
 */
export function getMessageSearchResults(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
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

        messageResults = [...getAndSubscribe(messageSetStore)].map((messageModelStore) => {
            const messageModel = getAndSubscribe(messageModelStore);
            const conversationModelStore = messageModel.controller.getConversationModelStore();
            const conversationModel = getAndSubscribe(conversationModelStore);

            return endpoint.exposeProperties({
                conversation: {
                    receiver: getReceiverData(services, conversationModel, getAndSubscribe),
                },
                message: getConversationMessageViewModelBundle(
                    services,
                    messageModelStore,
                    conversationModelStore,
                    true,
                ),
            });
        });
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
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    searchParams: SearchParams,
    getAndSubscribe: GetAndSubscribeFunction,
): SearchViewModel['receiverSearchResults'] {
    const {endpoint} = services;

    const receiverResults: ReceiverSearchResult[] = [];
    if (searchParams.term !== undefined) {
        const contactSet = services.model.contacts.getAll().get();
        const groupSet = services.model.groups.getAll().get();

        for (const contactOrGroupModelStore of [...contactSet, ...groupSet]) {
            const commonData = getCommonReceiverData(contactOrGroupModelStore.get());

            if (commonData.name.toLowerCase().includes(searchParams.term.toLowerCase())) {
                const model = getAndSubscribe(contactOrGroupModelStore);

                receiverResults.push(
                    endpoint.exposeProperties({
                        receiver: getReceiverData(
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
