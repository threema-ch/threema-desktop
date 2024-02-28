import type {SystemInfo} from '~/common/electron-ipc';
import type {Logger} from '~/common/logging';
import {ReadableStore} from '~/common/utils/store';

export interface Hotkey {
    readonly control: boolean;
    readonly shift: boolean;
    readonly alt: boolean;
    readonly code: string;
}

type HotkeyHandler = () => void;
export type GlobalHotkeyState = Map<string, HotkeyHandler[]>;

/**
 * This interface abstracts the `GlobalHotkeysManager`'s environment (i.e. the `window` APIs used).
 *
 * The abstraction makes the `GlobalHotkeysManager` independent from globals and allows for easier
 * testing.
 */
export interface GlobalHotkeyManagerEnvironment {
    /**
     * Set a handler for `keydown` events.
     */
    readonly setOnKeyDownHandler: (handler: (ev: KeyboardEvent) => void) => void;
}

/**
 * A store that manages hotkeys. Note: if the same hotkey is registered by multiple components, the
 * last one wins (LIFO).
 */
export class GlobalHotkeyManager extends ReadableStore<GlobalHotkeyState> {
    private _isSuspended = false;

    public constructor(
        protected override readonly _log: Logger,
        private readonly _systemInfo: SystemInfo,
        private readonly _environment: GlobalHotkeyManagerEnvironment,
    ) {
        // Initial state
        const initialState = new Map<string, []>();

        // Initialize store
        super(initialState);

        // Register event handler
        this._environment.setOnKeyDownHandler(this._onKeyDown.bind(this));

        _log.debug('GlobalHotkeyManager created, initial state:', this.get());
    }

    /**
     * Add a new hotkey listener.
     *
     * @param hotkey The key combination to subscribe to.
     * @param handler A function that is called when the specified hotkey is pressed.
     */
    public registerHotkey(hotkey: Partial<Hotkey>, handler: HotkeyHandler): void {
        const key = hotkeyToKey(hotkey);

        const state = new Map(this.get());
        const existingHandlers = state.get(key);

        if (import.meta.env.VERBOSE_LOGGING.HOTKEY) {
            this._log.debug(`Hotkey registration requested:`, hotkey);
        }

        state.set(key, (existingHandlers ?? []).concat(handler));

        if (this._update(state)) {
            this._dispatch(state);
            if (import.meta.env.VERBOSE_LOGGING.HOTKEY) {
                this._log.debug(`Hotkey registered successfully in state:`, state);
            }
        } else {
            this._log.error(`Failed to register hotkey`);
        }
    }

    /**
     * Remove a hotkey listener.
     *
     * @param handler The function to remove from the hotkey's handlers.
     */
    public unregisterHotkey(handler: HotkeyHandler): void {
        const state = new Map(this.get());

        // Find the key in the state map which contains this `handler`, and get the updated value
        // (i.e. the array of handlers with this `handler` removed)
        const [key, updatedHandlers] = [...state.entries()].reduce<
            [accKey: string | undefined, accHandlers: HotkeyHandler[]]
        >(
            ([accKey, accHandlers], [currKey, currHandlers]) =>
                currHandlers.includes(handler)
                    ? [currKey, currHandlers.filter((h) => h !== handler)]
                    : [accKey, accHandlers],
            [undefined, []],
        );

        if (key === undefined) {
            this._log.error(`The provided handler hasn't been found`);
            return;
        }

        const hotkey = keyToHotkey(key);
        if (import.meta.env.VERBOSE_LOGGING.HOTKEY) {
            this._log.debug(`Hotkey deregistration requested:`, hotkey);
        }

        if (updatedHandlers.length > 0) {
            state.set(key, updatedHandlers);
        } else {
            state.delete(key);
        }

        if (this._update(state)) {
            this._dispatch(state);
            if (import.meta.env.VERBOSE_LOGGING.HOTKEY) {
                this._log.debug(`Hotkey unregistered successfully from state:`, state);
            }
        } else {
            this._log.error(`Hotkey couldn't be unregistered`);
        }
    }

    /**
     * Suspend listening for shortcuts and firing shortcut handlers.
     */
    public suspend(): void {
        if (!this._isSuspended) {
            this._isSuspended = true;
            if (import.meta.env.VERBOSE_LOGGING.HOTKEY) {
                this._log.debug('GlobalHotkeyManager suspended');
            }
        }
    }

    /**
     * Resume listening for shortcuts and firing shortcut handlers.
     */
    public resume(): void {
        if (this._isSuspended) {
            this._isSuspended = false;
            if (import.meta.env.VERBOSE_LOGGING.HOTKEY) {
                this._log.debug('GlobalHotkeyManager resumed');
            }
        }
    }

    /**
     * Handle the browser "keydown" event.
     */
    private _onKeyDown(event: KeyboardEvent): void {
        // If handling is suspended, skip this event
        if (this._isSuspended) {
            return;
        }

        // If no modifier keys are used, skip this event
        if (!(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) {
            return;
        }

        // If *only* a modifier (without another key) is pressed, skip this event
        if (
            event.key === 'Control' ||
            event.key === 'Meta' ||
            event.key === 'Shift' ||
            event.key === 'Alt'
        ) {
            return;
        }

        const hotkey: Hotkey = {
            control: this._systemInfo.os === 'macos' ? event.metaKey : event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            code: event.code,
        };

        const key = hotkeyToKey(hotkey);
        const handlers = this.get().get(key);

        // If the hotkey has no potential consumers, skip this event
        if (handlers === undefined) {
            return;
        }

        event.preventDefault();

        // Call the last handler that was added for this hotkey
        handlers.at(-1)?.();

        if (import.meta.env.VERBOSE_LOGGING.HOTKEY) {
            this._log.debug(`Known hotkey pressed:`, hotkey);
        }
    }
}

function hotkeyToKey(hotkey: Partial<Hotkey>): string {
    return `${hotkey.control === true ? 1 : 0}${hotkey.shift === true ? 1 : 0}${
        hotkey.alt === true ? 1 : 0
    }${hotkey.code}`;
}

function keyToHotkey(key: string): Partial<Hotkey> {
    return {
        // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
        control: key[0] === '1',
        shift: key[1] === '1',
        alt: key[2] === '1',
        code: key.length > 3 ? key.substring(3) : undefined,
    };
}
