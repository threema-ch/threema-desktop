import {type RouterState} from '~/app/routing/router';
import {unreachable} from '~/common/utils/assert';
import {
    type IQueryableStore,
    type ISubscribableStore,
    type IWritableStore,
    type StoreUnsubscriber,
    type WritableStore,
} from '~/common/utils/store';
import {concentrate} from '~/common/utils/store/concentrator-store';

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

/**
 * Observe display mode and routes and update the layout mode accordingly.
 */
export function manageLayout(
    source: {
        readonly display: IQueryableStore<DisplayMode>;
        readonly router: IQueryableStore<RouterState>;
    },
    layout: WritableStore<LayoutMode>,
): StoreUnsubscriber {
    return concentrate([source.display, source.router] as const).subscribe(
        ([displayMode, routerState]) => {
            switch (displayMode) {
                case 'small':
                    layout.update((mode) => {
                        let small: LayoutMode['small'];
                        if (routerState.aside !== undefined) {
                            // Show the aside panel if present
                            small = 'aside';
                        } else if (routerState.main.id !== 'welcome') {
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
                    if (routerState.aside !== undefined) {
                        layout.update((mode) => ({
                            ...mode,
                            medium: 'nav-aside',
                            large: 'nav-main-aside',
                        }));
                    } else {
                        layout.update((mode) => ({
                            ...mode,
                            medium: 'nav-main',
                            large: 'nav-main',
                        }));
                    }
                    break;
                default:
                    unreachable(displayMode);
            }
        },
    );
}
