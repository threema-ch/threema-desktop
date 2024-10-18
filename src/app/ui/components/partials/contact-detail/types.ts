import type * as v from '@badrap/valita';

import type {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import type {EditContactModalProps} from '~/app/ui/components/partials/modals/edit-contact-modal/props';
import type {ProfilePictureModalProps} from '~/app/ui/components/partials/modals/profile-picture-modal/props';
import type {Remote} from '~/common/utils/endpoint';
import type {ContactDetailViewModelBundle} from '~/common/viewmodel/receiver/detail/contact';

/**
 * Shape of the router's route params if it's an "aside" route.
 */
export type ContactDetailRouteParams = v.Infer<
    (typeof ROUTE_DEFINITIONS)['aside']['contactDetails']['params']
>;

/**
 * Type of the value contained in a `ContactDetailViewModelStore` transferred from {@link Remote}.
 */
export type RemoteContactDetailViewModelStoreValue = ReturnType<
    Remote<ContactDetailViewModelBundle>['viewModelStore']['get']
>;

export type RemoteContactDetailViewController =
    Remote<ContactDetailViewModelBundle>['viewModelController'];

export type ModalState = NoneModalState | EditContactModalState | ProfilePictureModalState;

interface NoneModalState {
    readonly type: 'none';
}

interface EditContactModalState {
    readonly type: 'edit-contact';
    readonly props: EditContactModalProps;
}

interface ProfilePictureModalState {
    readonly type: 'profile-picture';
    readonly props: ProfilePictureModalProps;
}
