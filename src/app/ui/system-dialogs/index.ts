import SystemDialogs from '~/app/ui/system-dialogs/SystemDialogs.svelte';
import {type Config} from '~/common/config';
import {type LoggerFactory} from '~/common/logging';

/**
 * Attach global dialogs to DOM.
 */
export function attachSystemDialogs(
    config: Config,
    logging: LoggerFactory,
    dialogs: HTMLElement,
): SystemDialogs {
    dialogs.innerHTML = '';
    return new SystemDialogs({
        target: dialogs,
        props: {
            config,
            log: logging.logger('component.system-dialogs'),
        },
    });
}
