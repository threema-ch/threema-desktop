import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {LocalSetStore} from '~/common/utils/store/set-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ISearchViewModelController} from '~/common/viewmodel/search/nav/controller';
import {
    getConversationSearchResults,
    getMessageSearchResults,
    getReceiverSearchResults,
} from '~/common/viewmodel/search/nav/store/helpers';
import type {SearchViewModel} from '~/common/viewmodel/search/nav/store/types';

export type SearchViewModelStore = LocalStore<SearchViewModel & PropertiesMarked>;

export function getSearchViewModelStore(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    searchViewModelController: ISearchViewModelController,
): SearchViewModelStore {
    const {endpoint} = services;

    return derive(searchViewModelController.searchParams, (currentSearchParams, getAndSubscribe) =>
        endpoint.exposeProperties(
            currentSearchParams === undefined
                ? {...getDefaultSearchViewModel()}
                : {
                      conversationSearchResults: getConversationSearchResults(
                          services,
                          currentSearchParams,
                          getAndSubscribe,
                      ),
                      messageSearchResults: getMessageSearchResults(
                          services,
                          currentSearchParams,
                          getAndSubscribe,
                      ),
                      receiverSearchResults: getReceiverSearchResults(
                          services,
                          currentSearchParams,
                          getAndSubscribe,
                      ),
                  },
        ),
    );
}

function getDefaultSearchViewModel(): SearchViewModel {
    return {
        conversationSearchResults: new LocalSetStore(new Set()),
        messageSearchResults: new LocalSetStore(new Set()),
        receiverSearchResults: new LocalSetStore(new Set()),
    };
}
