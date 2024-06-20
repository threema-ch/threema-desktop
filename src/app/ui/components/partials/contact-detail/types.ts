import type * as v from '@badrap/valita';

import type {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import type {EditContactModalProps} from '~/app/ui/components/partials/modals/edit-contact-modal/props';
import type {ProfilePictureModalProps} from '~/app/ui/components/partials/modals/profile-picture-modal/props';
import type {AnyReceiver} from '~/common/model';
import type {Remote} from '~/common/utils/endpoint';
import type {ContactDetailViewModelBundle} from '~/common/viewmodel/contact/detail';

/**
 * Shape of the router's route params if it's an "aside" route.
 */
export type ContactDetailRouteParams = v.Infer<
    (typeof ROUTE_DEFINITIONS)['aside']['receiverDetails']['params']
>;

/**
 * Type of the value contained in a `ContactDetailViewModelStore` transferred from {@link Remote}.
 */
export type RemoteContactDetailViewModelStoreValue = ReturnType<
    Remote<ContactDetailViewModelBundle<AnyReceiver>>['viewModelStore']['get']
>;

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
