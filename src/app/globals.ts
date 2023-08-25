import {type GlobalHotkeyManager} from '~/app/ui/hotkey';
import {type SystemTimeStore} from '~/app/ui/time';
import {type LoggerFactory} from '~/common/logging';
import {Delayed} from '~/common/utils/delayed';

/**
 * Global utilities.
 */
export interface Globals {
    /**
     * The ui logging factory.
     *
     * As it can be challenging to log from a Svelte component that's deeply nested, without passing
     * loggers through half a dozen of layers, this factory is exported globally so that it is
     * easily accessible from UI components.
     */
    readonly uiLogging: LoggerFactory<Lowercase<`ui.component.${string}`>>;
    readonly hotkeyManager: GlobalHotkeyManager;
    readonly systemTime: SystemTimeStore;
}

export const globals: Delayed<Globals> = Delayed.simple(
    'Globals not yet set',
    'Globals already set',
);
