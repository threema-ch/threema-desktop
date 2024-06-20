import {ROUTE_DEFINITIONS, type RouteInstanceFor, type RouteInstances} from '~/app/routing/routes';
import {display} from '~/common/dom/ui/state';
import {ReceiverType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import {assert} from '~/common/utils/assert';
import {ReadableStore} from '~/common/utils/store';
import {splitAtLeast} from '~/common/utils/string';

/**
 * Interface representing the current application routing state.
 */
export interface RouterState {
    readonly nav: RouteInstances['nav'];
    readonly main: RouteInstances['main'];
    readonly aside: RouteInstances['aside'] | undefined;
    readonly modal: RouteInstances['modal'] | undefined;
    readonly activity: RouteInstances['activity'] | undefined;
}

export interface UpdateRouterState {
    readonly nav?: RouteInstances['nav'];
    readonly main?: RouteInstances['main'];
    readonly aside?: RouteInstances['aside'] | 'close';
    readonly modal?: RouteInstances['modal'] | 'close';
    readonly activity?: RouteInstances['activity'] | 'close';
}

/**
 * Default router state, when no other state can be determined (e.g. from the URL fragment).
 */
const DEFAULT_STATE: RouterState = {
    nav: ROUTE_DEFINITIONS.nav.conversationList.withoutParams(),
    main: ROUTE_DEFINITIONS.main.welcome.withoutParams(),
    aside: undefined,
    modal: undefined,
    activity: undefined,
};

/**
 * Return a fragment for the specified main route with the specified params.
 */
export function getFragmentForRoute(route: RouterState['main'], log?: Logger): string | undefined {
    if (import.meta.env.VERBOSE_LOGGING.ROUTER) {
        log?.debug('getFragmentForRoute route', route);
    }

    // Look up route path
    const path = ROUTE_DEFINITIONS.main[route.id].path;

    // If there are no params, the fragment must be static
    if (route.params === undefined) {
        assert(
            !path.template.includes(':'),
            `A route without params may not contain any template placeholders! (template: "${path.template}")`,
        );
        return path.template;
    }

    // Otherwise replace placeholders with param values
    const templateParts = path.template.split('/').filter((part) => part.length > 0);
    let fragment = '/';
    for (const part of templateParts) {
        if (part.startsWith(':')) {
            // We found a placeholder. Replace it with the actual parameter value.
            const key = part.substring(1);
            let value: unknown = route.params;
            for (const segment of key.split('.')) {
                value = (value as Record<string, unknown>)[segment];
            }
            assert(value !== undefined, `Value for key ${key} must be defined`);
            fragment += `${value}`;
        } else {
            fragment += part;
        }
        fragment += '/';
    }
    return fragment;
}

/**
 * Parse the URL fragment. If it contains a valid route, then the corresponding router state is
 * returned.
 */
function stateFromUrlFragment(fragment: string, log: Logger): RouterState | undefined {
    // Try to find route corresponding to the current URL fragment
    const {
        items: [path],
    } = splitAtLeast(fragment, '?', 1);
    if (!path.startsWith('/')) {
        return undefined;
    }

    // Match path against routes
    for (const route of Object.values(ROUTE_DEFINITIONS.main)) {
        // Check if the path matches this route. If so, it returns us a route
        // instance directly.
        let instance;
        try {
            instance = route.matches(path, log);
        } catch (error) {
            log.warn(`Invalid route params: ${error}`);
        }
        if (instance !== undefined) {
            // Note: Right now, the navigation panel is always set to the initial route (i.e. the
            //       conversation list). Once we need to set the nav panel based on the main panel
            //       (e.g. for the settings), we need to change this logic. (For example, every
            //       route path could specify the required nav panel.)
            return {
                nav: DEFAULT_STATE.nav,
                main: instance,
                aside: undefined,
                modal: undefined,
                activity: undefined,
            };
        }
    }

    // No match
    return undefined;
}

/**
 * This interface abstracts the router's environment (i.e. the `window` APIs used).
 *
 * The abstraction makes the router independent from globals and allows for easier testing.
 */
export interface RouterEnvironment {
    /**
     * Return the URL fragment of the current window (without the leading `#`).
     *
     * For example, if the current location URL is `https://example.com/a/#asdf`, the returned value
     * is `asdf`.
     */
    getUrlFragment: () => string;

    /**
     * Overwrite the fragment of the current window location.
     *
     * Note: The `#` should not be part of the `fragment` argument.
     */
    setUrlFragment: (fragment: string) => void;

    /**
     * An implementation that pushes state to the window history.
     *
     * In the browser, this should be backed by `window.history.pushState`.
     */
    pushHistoryState: (state: RouterState, url?: string | URL) => void;

    /**
     * An implementation that replaces the current state in the window history.
     *
     * In the browser, this should be backed by `window.history.replaceState`.
     */
    replaceHistoryState: (state: RouterState, url?: string | URL) => void;

    /**
     * Set a handler for the `onpopstate` event.
     */
    setOnPopStateHandler: (handler: (event: PopStateEvent) => void) => void;
}

function needsUpdate<TPanel extends keyof RouterState>(
    current: RouterState[TPanel],
    updated: UpdateRouterState[TPanel],
): boolean {
    // Check if a change was requested
    if (updated === undefined) {
        return false;
    }

    // Close request: Close if a panel for that route exists
    if (updated === 'close') {
        return current !== undefined;
    }

    // Update request: Update if the ID or parameters changed
    return updated.id !== current?.id || updated.params !== current.params;
}

/**
 * A router that has the following responsibilities:
 *
 * - State based routing: Store which components are being displayed
 * - Browser history: Allow linear history-based back-navigation
 *
 * This router is also a Svelte store and can be subscribed to.
 *
 * The router will initialize the state from the browser URL fragment.
 *
 * ## Convention
 *
 * - A method with _reset_ in its name **resets** all panels to a specific new state, replacing them
 *   all at once.
 * - A method with _go_ in its name **updates** some of the panels but not all of them.
 *
 * ## State Based Routing
 *
 * The router stores internal state of type {@link RouterState}. This state object specifies what UI
 * elements are being loaded. By storing and restoring the state, you can navigate to any part of
 * the application. By subscribe to state changes, the application can ensure that the correct
 * components are being displayed.
 *
 * ## Browser History API
 *
 * Navigation events are persisted using the browser history API. This represents a linear history
 * based navigation path. Example:
 *
 * 1. Open a conversation
 * 2. Open settings
 * 3. Click on setting 1
 * 4. Click on setting 2
 * 5. Click on the "back"-button in the browser
 *
 * You are now back in the setting 1 view.
 */
export class Router extends ReadableStore<RouterState> {
    public constructor(
        protected override readonly _log: Logger,
        private readonly _environment: RouterEnvironment,
    ) {
        const fragment = _environment.getUrlFragment();

        // Initial state
        const stateFromFragment = stateFromUrlFragment(fragment, _log);
        const initialState = stateFromFragment ?? DEFAULT_STATE;

        // Replace invalid fragments
        if (stateFromFragment === undefined) {
            if (fragment.length > 0) {
                _log.warn(`No route matched fragment ${fragment}`);
            }
            _environment.setUrlFragment(getFragmentForRoute(initialState.main, _log) ?? '');
        }

        // Initialize store
        super(initialState);

        // Register browser history popstate handler
        this._environment.setOnPopStateHandler(this._onpopstate.bind(this));

        _log.debug('Created, initial state:', this.get());
    }

    /**
     * Set a completely new route state, updating the state of **all** panels.
     *
     * Note: This should only be used when **all parts** of the route need to be changed. Use
     * {@link go} for all other cases.
     */
    public replace(routes: RouterState): void {
        const routesString = Object.entries(routes)
            .map(([panel, route]) => `${panel}: ${route === undefined ? '<closed>' : route.id}`)
            .join(', ');
        this._log.debug(`Navigating to ${routesString} (full state replacement)`);
        this._setState(routes);
    }

    /**
     * Update the existing route with a change to only some parts of the route.
     */
    public go(routes: UpdateRouterState): void {
        const current = this.get();
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const routesList = Object.entries({...routes}).filter(([_, route]) => route !== undefined);
        if (
            routesList.some(([panel, updated]) =>
                needsUpdate(current[panel as keyof RouteInstances], updated),
            )
        ) {
            const routesString = routesList
                .map(([panel, route]) => `${panel}: ${route === 'close' ? '<closed>' : route.id}`)
                .join(', ');
            this._log.debug(`Navigating to ${routesString}`);
            this._setState({
                ...current,
                ...Object.fromEntries(
                    routesList.map(([panel, route]) =>
                        route === 'close' ? [panel, undefined] : [panel, route],
                    ),
                ),
            });
        }
    }

    /**
     * Asserts that a specific route state is present.
     */
    public assert<
        TPanel extends keyof RouterState,
        TIds extends keyof (typeof ROUTE_DEFINITIONS)[TPanel],
    >(panel: TPanel, ids: readonly TIds[]): RouteInstanceFor<TPanel, TIds>['params'] {
        const current = this.get()[panel];
        if (
            current === undefined ||
            !(ids as readonly (string | undefined)[]).includes(current.id)
        ) {
            throw new Error(
                `Unexpected state for panel ${panel} (expected=${ids.join(', ')}, got=${current?.id})`,
            );
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return current.params as RouteInstanceFor<TPanel, TIds>['params'];
    }

    /**
     * Navigate to the _welcome_ route on the main section.
     *
     * Any aside or modal panel will be closed.
     */
    public goToWelcome(routes?: Pick<UpdateRouterState, 'nav' | 'activity'>): void {
        this.go({
            ...routes,
            main: ROUTE_DEFINITIONS.main.welcome.withoutParams(),
            aside: 'close',
            modal: 'close',
        });
    }

    /**
     * Navigate to a conversation.
     *
     * Any modal will be closed. The associated conversation detail panel will be opened aside in
     * the large layout and otherwise closed.
     */
    public goToConversation(
        params: RouteInstanceFor<'main', 'conversation'>['params'],
        routes?: Omit<UpdateRouterState, 'main' | 'aside' | 'modal'>,
    ): void {
        assert(params.receiverLookup.type !== ReceiverType.DISTRIBUTION_LIST, 'TODO(DESK-236)');
        const current = this.get();

        // Navigate to the conversation
        this.go({
            ...routes,
            main: ROUTE_DEFINITIONS.main.conversation.withParams(params),
            aside:
                current.aside !== undefined && display.get() === 'large'
                    ? ROUTE_DEFINITIONS.aside.receiverDetails.withParams(params.receiverLookup)
                    : 'close',
            modal: 'close',
        });
    }

    /**
     * Navigate to the settings.
     *
     * Any aside or modal panel will be closed.
     */
    public goToSettings(
        params: RouteInstanceFor<'main', 'settings'>['params'],
        routes?: Omit<UpdateRouterState, 'nav' | 'main' | 'aside' | 'modal'>,
    ): void {
        this.go({
            ...routes,
            nav: ROUTE_DEFINITIONS.nav.settingsList.withoutParams(),
            // Note: When opening settings in small display mode, we want to see the settings
            //       categories, not the profile settings.
            main:
                display.get() === 'small'
                    ? ROUTE_DEFINITIONS.main.welcome.withoutParams()
                    : ROUTE_DEFINITIONS.main.settings.withParams(params),
            aside: 'close',
            modal: 'close',
        });
    }

    /**
     * Update the internal state and add an entry to the browser history and the
     * URL fragment as well.
     */
    private _setState(state: RouterState): void {
        if (import.meta.env.VERBOSE_LOGGING.ROUTER) {
            this._log.debug('Set state:', state);
        }
        if (!this._update(state)) {
            return;
        }
        this._dispatch(state);

        // Determine fragment
        let url: string | undefined = undefined;
        const fragment = getFragmentForRoute(state.main, this._log);
        if (fragment !== undefined) {
            if (import.meta.env.VERBOSE_LOGGING.ROUTER) {
                this._log.debug(`Set fragment: ${fragment}`);
            }
            url = `#${fragment}`;
        }

        // Push state to history API (and update fragment)
        this._environment.pushHistoryState(state, url);
    }

    /**
     * Handle the browser "popstate" event.
     */
    private _onpopstate(event: PopStateEvent): void {
        // A "popstate" event was triggered. This means that the user navigated through the
        // navigation history, or that the URL was updated by hand.
        if (import.meta.env.VERBOSE_LOGGING.ROUTER) {
            this._log.debug('onpopstate', event);
        }

        // Determine new state.
        let state: RouterState;
        if (event.state !== null && event.state !== undefined) {
            // If the popstate event contains a state, restore this.
            // (No need to update the URL, this will have already happened by now.)
            state = event.state as RouterState;
        } else {
            // Otherwise, try to recreate the state from the fragment.
            const fragment = this._environment.getUrlFragment();
            const stateFromFragment = stateFromUrlFragment(fragment, this._log);
            if (stateFromFragment === undefined) {
                // Fragment is invalid. Load initial state and use `replaceState` to update the
                // URL fragment.
                this._log.warn(
                    'Received popstate event without state and URL fragment is invalid as well. ' +
                        'Falling back to initial state.',
                );
                state = DEFAULT_STATE;
                const newFragment = getFragmentForRoute(state.main, this._log);
                this._environment.replaceHistoryState(state, `#${newFragment}`);
            } else {
                // Fragment is valid, load it
                state = stateFromFragment;
            }
        }

        if (import.meta.env.VERBOSE_LOGGING.ROUTER) {
            this._log.debug('Restore state', state);
        }
        if (this._update(state)) {
            this._dispatch(state);
        }
    }
}
