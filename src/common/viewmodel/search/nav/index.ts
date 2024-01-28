import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    type ISearchViewModelController,
    SearchViewModelController,
} from '~/common/viewmodel/search/nav/controller';
import {
    type SearchViewModelStore,
    getSearchViewModelStore,
} from '~/common/viewmodel/search/nav/store';

export interface SearchViewModelBundle extends PropertiesMarked {
    readonly viewModelController: ISearchViewModelController;
    readonly viewModelStore: SearchViewModelStore;
}

export function getSearchViewModelBundle(services: ServicesForViewModel): SearchViewModelBundle {
    const {endpoint} = services;

    const viewModelController = new SearchViewModelController();
    const viewModelStore = getSearchViewModelStore(services, viewModelController);

    return endpoint.exposeProperties({
        viewModelController,
        viewModelStore,
    });
}
