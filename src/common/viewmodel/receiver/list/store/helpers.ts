import type {Contact, Group} from '~/common/model';
import {LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import type {ContactListViewModel} from '~/common/viewmodel/contact/list/store/types';

/**
 * Returns a {@link ContactListItemSetStore} containing {@link ContactListItemViewModelBundle}s of
 * all contacts.
 */
export function getContactListItemSetStore(
    services: Pick<ServicesForViewModel, 'logging' | 'model'>,
    viewModelRepository: IViewModelRepository,
): ContactListViewModel['contactListItemSetStore'] {
    const {logging, model} = services;

    // Options for all derived stores below.
    const tag = `contact.contact-list.item[]`;
    const storeOptions = {
        debug: {
            log: logging.logger(`viewmodel.${tag}`),
            tag,
        },
    };

    const contactSetStore = model.contacts.getAll();

    // Fetch the `ContactListItemViewModelBundle` for every contact in the set store.
    const contactListItemSetStore = new LocalDerivedSetStore(
        contactSetStore,
        (contactModelStore) => viewModelRepository.contactListItem<Contact>(contactModelStore),
        storeOptions,
    );

    return contactListItemSetStore;
}

/**
 * Returns a {@link ContactListItemSetStore} containing {@link ContactListItemViewModelBundle}s of
 * all groups.
 */
export function getGroupContactListItemSetStore(
    services: Pick<ServicesForViewModel, 'logging' | 'model'>,
    viewModelRepository: IViewModelRepository,
): ContactListViewModel['groupContactListItemSetStore'] {
    const {logging, model} = services;

    // Options for all derived stores below.
    const tag = `contact.group-contact-list.item[]`;
    const storeOptions = {
        debug: {
            log: logging.logger(`viewmodel.${tag}`),
            tag,
        },
    };

    const groupSetStore = model.groups.getAll();

    // Fetch the `ContactListItemViewModelBundle` for every group in the set store.
    const groupContactListItemSetStore = new LocalDerivedSetStore(
        groupSetStore,
        (groupModelStore) => viewModelRepository.contactListItem<Group>(groupModelStore),
        storeOptions,
    );

    return groupContactListItemSetStore;
}
