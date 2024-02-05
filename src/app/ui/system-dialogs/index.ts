import type {AppServices} from '~/app/types';
import SystemDialogs from '~/app/ui/system-dialogs/SystemDialogs.svelte';
import type {LoggerFactory} from '~/common/logging';
import type {Delayed} from '~/common/utils/delayed';

/**
 * Attach global dialogs to DOM.
 */
export function attachSystemDialogs(
    logging: LoggerFactory,
    dialogs: HTMLElement,
    appServices: Delayed<AppServices>,
): SystemDialogs {
    dialogs.innerHTML = '';
    return new SystemDialogs({
        target: dialogs,
        props: {
            log: logging.logger('component.system-dialogs'),
            appServices,
        },
    });
}
