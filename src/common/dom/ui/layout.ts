import {type RouterState} from '~/app/routing/router';
import {unreachable} from '~/common/utils/assert';
import {
    type IQueryableStore,
    type ISubscribableStore,
    type IWritableStore,
    type WritableStore,
} from '~/common/utils/store';

/**
 * Display modes and associated minimum pixel values of width.
 */
export const DISPLAY_MODES = {
    large: 1024,
    medium: 640,
    small: 400,
} as const;

/**
 * Display mode, defining which layout mode can be used.
 */
export type DisplayMode = keyof typeof DISPLAY_MODES;

/**
 * Layout modes, defined by the user and narrowed down by the display mode.
 */
export interface LayoutMode {
    // Only display one pane at once in small mode
    small: 'nav' | 'main' | 'aside';
    // Display two panes at once in medium mode
    medium: 'nav-main' | 'nav-aside';
    // Allow to display either two or three panes at once in large mode
    large: 'nav-main' | 'nav-main-aside';
}

/**
 * Default layout mode.
 */
export const DEFAULT_LAYOUT_MODE: LayoutMode = {
    small: 'nav',
    medium: 'nav-main',
    large: 'nav-main-aside',
} as const;

type DisplayModeMediaQueries = {readonly [K in DisplayMode]: MediaQueryList};

/**
 * Observe changes to the display mode via media queries and write changes to
 * a store.
 */
export class DisplayModeObserver {
    private readonly _store: IWritableStore<DisplayMode> & ISubscribableStore<DisplayMode>;
    private readonly _queries: DisplayModeMediaQueries;

    public constructor(store: IWritableStore<DisplayMode> & ISubscribableStore<DisplayMode>) {
        this._store = store;
        this._queries = {
            small: window.matchMedia(`screen and (max-width: ${DISPLAY_MODES.medium}px)`),
            medium: window.matchMedia(`screen and (min-width: ${DISPLAY_MODES.medium}px)`),
            large: window.matchMedia(`screen and (min-width: ${DISPLAY_MODES.large}px)`),
        };
        for (const query of Object.values(this._queries)) {
            query.addEventListener('change', this.update.bind(this));
        }
    }

    /**
     * Trigger a layout update.
     *
     * Note: It should only be necessary to trigger this manually in order to calculate the initial
     *       display mode.
     */
    public update(): void {
        if (this._queries.large.matches) {
            this._store.set('large');
        } else if (this._queries.medium.matches) {
            this._store.set('medium');
        } else {
            this._store.set('small');
        }
    }
}

export class LayoutManager {
    private _displayMode: DisplayMode;
    private _routerState: RouterState;

    public constructor(
        displayStore: IQueryableStore<DisplayMode>,
        router: IQueryableStore<RouterState>,
        private readonly _layoutStore: WritableStore<LayoutMode>,
    ) {
        this._displayMode = displayStore.get();
        this._routerState = router.get();
        displayStore.subscribe((displayMode) => {
            this._displayMode = displayMode;
            this._updateLayout();
        });
        router.subscribe((routerState) => {
            this._routerState = routerState;
            this._updateLayout();
        });
    }

    private _updateLayout(): void {
        switch (this._displayMode) {
            case 'small':
                this._layoutStore.update((mode) => {
                    let small: LayoutMode['small'];
                    if (this._routerState.aside !== undefined) {
                        // Show the aside panel if present
                        small = 'aside';
                    } else if (this._routerState.main.id !== 'welcome') {
                        // Show the main panel if it's not the welcome page
                        small = 'main';
                    } else {
                        // Otherwise, show nav
                        small = 'nav';
                    }
                    return {...mode, small};
                });
                break;
            case 'medium':
            case 'large':
                // Only show the aside panel in medium/large mode if there is an aside defined for it.
                if (this._routerState.aside !== undefined) {
                    this._layoutStore.update((mode) => ({
                        ...mode,
                        medium: 'nav-aside',
                        large: 'nav-main-aside',
                    }));
                } else {
                    this._layoutStore.update((mode) => ({
                        ...mode,
                        medium: 'nav-main',
                        large: 'nav-main',
                    }));
                }
                break;
            default:
                unreachable(this._displayMode);
        }
    }
}
