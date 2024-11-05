import type {Contact, Group} from '~/common/model';
import {LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import type {ReceiverListViewModel} from '~/common/viewmodel/receiver/list/store/types';

/**
 * Returns a {@link ReceiverListItemSetStore} containing {@link ReceiverListItemViewModelBundle}s of
 * all contacts.
 */
export function getContactListItemSetStore(
    services: Pick<ServicesForViewModel, 'logging' | 'model'>,
    viewModelRepository: IViewModelRepository,
): ReceiverListViewModel['contactListItemSetStore'] {
    const {logging, model} = services;

    // Options for all derived stores below.
    const tag = `receiver-list.contact[]`;
    const storeOptions = {
        debug: {
            log: logging.logger(`viewmodel.${tag}`),
            tag,
        },
    };

    const contactSetStore = model.contacts.getAll();

    // Fetch the `ReceiverListItemViewModelBundle` for every contact in the set store.
    const contactListItemSetStore = new LocalDerivedSetStore(
        contactSetStore,
        (contactModelStore) => viewModelRepository.receiverListItem<Contact>(contactModelStore),
        storeOptions,
    );

    return contactListItemSetStore;
}

/**
 * Returns a {@link ReceiverListItemSetStore} containing {@link ReceiverListItemViewModelBundle}s of
 * all groups.
 */
export function getGroupListItemSetStore(
    services: Pick<ServicesForViewModel, 'logging' | 'model'>,
    viewModelRepository: IViewModelRepository,
): ReceiverListViewModel['groupListItemSetStore'] {
    const {logging, model} = services;

    // Options for all derived stores below.
    const tag = `receiver-list.grou[[]`;
    const storeOptions = {
        debug: {
            log: logging.logger(`viewmodel.${tag}`),
            tag,
        },
    };

    const groupSetStore = model.groups.getAll();

    // Fetch the `ReceiverListItemViewModelBundle` for every group in the set store.
    const groupListItemSetStore = new LocalDerivedSetStore(
        groupSetStore,
        (groupModelStore) => viewModelRepository.receiverListItem<Group>(groupModelStore),
        storeOptions,
    );

    return groupListItemSetStore;
}
