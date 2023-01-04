import {toast} from '~/app/ui/snackbar';
import {type BackendController} from '~/common/dom/backend/controller';
import {ConnectionState} from '~/common/enum';

/**
 * Check whether contact creation is allowed.
 *
 * If it is not allowed, then – as a side effect – a toast will be shown.
 */
export function checkContactCreationAllowed(backend: BackendController): boolean {
    if (backend.connectionState.get() === ConnectionState.CONNECTED) {
        return true;
    }

    toast.addSimpleFailure('Unable to add contact. Please check your Internet connection.');
    return false;
}