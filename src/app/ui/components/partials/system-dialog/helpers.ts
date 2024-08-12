import type {AppServices} from '~/app/types';
import SystemDialog from '~/app/ui/components/partials/system-dialog/SystemDialog.svelte';
import type {Delayed} from '~/common/utils/delayed';

/**
 * Attach global dialogs to DOM.
 */
export function attachSystemDialogs(
    target: HTMLElement,
    services: Delayed<AppServices>,
): SystemDialog {
    target.innerHTML = '';

    return new SystemDialog({
        target,
        props: {
            services,
            target,
        },
    });
}
