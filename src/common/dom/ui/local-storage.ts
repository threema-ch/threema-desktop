// Local storage keys
//
// Note: The local storage keys need to be in sync with the critical JS in
//       index.html

import {
    type DebugPanelState,
    ensureDebugPanelHeight,
    ensureDebugPanelState,
} from '~/common/dom/ui/debug';
import {type Theme, applyTheme, ensureTheme} from '~/common/dom/ui/theme';
import {type ISubscribableStore, type IWritableStore, WritableStore} from '~/common/utils/store';

const KEYS = {
    theme: 'theme',
    debugPanelState: 'debug-panel-state',
    debugPanelHeight: 'debug-panel-height',
} as const;

/**
 * Local storage controller.
 *
 * IMPORTANT: This storage is not encrypted!
 */
export class LocalStorageController {
    public readonly debugPanelState: IWritableStore<DebugPanelState> &
        ISubscribableStore<DebugPanelState>;
    public readonly debugPanelHeight: IWritableStore<string> & ISubscribableStore<string>;
    public readonly theme: IWritableStore<Theme> & ISubscribableStore<Theme>;

    public constructor(containers: HTMLElement[]) {
        // Debug panel
        this.debugPanelState = new WritableStore(
            ensureDebugPanelState(localStorage.getItem(KEYS.debugPanelState) ?? ''),
        );
        this.debugPanelState.subscribe((state) =>
            localStorage.setItem(KEYS.debugPanelState, state),
        );
        this.debugPanelHeight = new WritableStore(
            ensureDebugPanelHeight(localStorage.getItem(KEYS.debugPanelHeight) ?? ''),
        );
        this.debugPanelHeight.subscribe((height) =>
            localStorage.setItem(KEYS.debugPanelHeight, height),
        );

        // Theme
        this.theme = new WritableStore(ensureTheme(localStorage.getItem(KEYS.theme) ?? ''));
        this.theme.subscribe((theme) => {
            localStorage.setItem(KEYS.theme, theme);
            for (const container of containers) {
                applyTheme(theme, container);
            }
        });
    }
}
