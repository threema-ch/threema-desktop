import {type AnyRouteInstance, ROUTE_DEFINITIONS, type PreloadedFiles} from '~/app/routing/routes';
import type {DbReceiverLookup} from '~/common/db';
import {display} from '~/common/dom/ui/state';
import {ReceiverType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import {assert, assertUnreachable} from '~/common/utils/assert';
import {WritableStore} from '~/common/utils/store';
import {splitAtLeast} from '~/common/utils/string';

/**
 * Interface representing the current application routing state.
 */
export interface RouterState {
    nav: AnyRouteInstance['nav'];
    main: AnyRouteInstance['main'];
    aside: AnyRouteInstance['aside'] | undefined;
    modal: AnyRouteInstance['modal'] | undefined;
}

/**
 * Initial router state, when no other state can be determined (e.g. from the URL fragment).
 */
const INITIAL_STATE: RouterState = {
    nav: ROUTE_DEFINITIONS.nav.conversationList.withoutParams(),
    main: ROUTE_DEFINITIONS.main.welcome.withoutParams(),
    aside: undefined,
    modal: undefined,
};

/**
 * Return a fragment for the specified main route with the specified params.
 */
export function getFragmentForRoute(
    route: AnyRouteInstance['main'],
    log?: Logger,
): string | undefined {
    log?.debug('getFragmentForRoute route', route);

    // Look up route path
    const path = ROUTE_DEFINITIONS.main[route.id].path;

    // Route without path has no fragment
    //
    // Note: As long as not all routes are defined, ESLint returns "unnecessary conditional" errors
    //       based on the analysis of the existing routes. To avoid this, disable the check for now.
    //
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (path === undefined) {
        return undefined;
    }

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
            return {nav: INITIAL_STATE.nav, main: instance, aside: undefined, modal: undefined};
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

/**
 * A router that has the following responsibilities:
 *
 * - State based routing: Store which components are being displayed
 * - Browser history: Allow linear history-based back-navigation
 *
 * This router is also a Svelte store and can be subscribed to.
 *
 * When instantiated, the router will initialize the state from the browser URL fragment.
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
export class Router extends WritableStore<RouterState> {
    public constructor(
        protected override readonly _log: Logger,
        private readonly _environment: RouterEnvironment,
    ) {
        const fragment = _environment.getUrlFragment();

        // Initial state
        const stateFromFragment = stateFromUrlFragment(fragment, _log);
        const initialState = stateFromFragment ?? INITIAL_STATE;

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

        _log.debug('Router created, initial state:', this.get());
    }

    /**
     * Set a new route.
     *
     * @param nav the new nav panel route
     * @param main the new main panel route
     * @param aside the new aside panel route
     * @param modal the new modal route
     */
    public go(
        nav: AnyRouteInstance['nav'],
        main: AnyRouteInstance['main'],
        aside: AnyRouteInstance['aside'] | undefined,
        modal?: AnyRouteInstance['modal'],
    ): void {
        const current = this.get();
        if (
            main.id !== current.main.id ||
            main.params !== current.main.params ||
            nav.id !== current.nav.id ||
            nav.params !== current.nav.params ||
            aside?.id !== current.aside?.id ||
            aside?.params !== current.aside?.params ||
            modal?.id !== current.modal?.id ||
            modal?.params !== current.modal?.params
        ) {
            this._log.debug(
                `Router: Navigating to (${nav.id} ${main.id} ${aside?.id} ${modal?.id})`,
            );
            this._setState({nav, main, aside, modal});
        }
    }

    /**
     * Call {@link go} with the Welcome route on the main section, ensuring aside and modal are
     * closed.
     */
    public goToWelcome(): void {
        this.go(
            this.get().nav,
            ROUTE_DEFINITIONS.main.welcome.withoutParams(),
            undefined,
            undefined,
        );
    }

    /**
     * Call {@link go} with the current state and a new nav panel route.
     */
    public replaceNav(nav: AnyRouteInstance['nav']): void {
        const current = this.get();
        return this.go(nav, current.main, current.aside, current.modal);
    }

    /**
     * Call {@link go} with the current state and a new main panel route.
     */
    public replaceMain(main: AnyRouteInstance['main']): void {
        const current = this.get();
        return this.go(current.nav, main, current.aside, current.modal);
    }

    /**
     * Call {@link go} with the current state and a new aside panel route.
     */
    public replaceAside(aside: AnyRouteInstance['aside'] | undefined): void {
        const current = this.get();
        return this.go(current.nav, current.main, aside, current.modal);
    }

    /**
     * Close the aside panel and keep the rest of the route state.
     */
    public closeAside(): void {
        this.replaceAside(undefined);
    }

    /**
     * Call {@link go} with the current state and a new modal route.
     */
    public replaceModal(modal: AnyRouteInstance['modal'] | undefined): void {
        const current = this.get();
        return this.go(current.nav, current.main, current.aside, modal);
    }

    /**
     * Close the modal and keep the rest of the route state.
     */
    public closeModal(): void {
        this.replaceModal(undefined);
    }

    /**
     * Open the conversation with a list of files that will be added to the media message composer.
     *
     * By default, the aside panel is always closed in medium and small layout, unless
     * `options.keepAsidePanelOpen` is set to `true`.
     */
    public openConversationAndFileDialogForReceiver(
        receiverLookup: DbReceiverLookup,
        preloadedFiles: PreloadedFiles,
        options?: {readonly keepAsidePanelOpen?: boolean},
    ): void {
        assert(
            [ReceiverType.CONTACT, ReceiverType.GROUP].includes(receiverLookup.type),
            'TODO(DESK-236)',
        );
        const aside = this._getAside(receiverLookup, options?.keepAsidePanelOpen ?? false);

        this.go(
            ROUTE_DEFINITIONS.nav.conversationList.withoutParams(),
            ROUTE_DEFINITIONS.main.conversation.withTypedParams({
                receiverLookup,
                preloadedFiles,
            }),
            aside,
            undefined,
        );
    }

    /**
     * Open the conversation and the conversation details for the specified receiver.
     *
     * By default, the aside panel is always closed in medium and small layout, unless
     * `options.keepAsidePanelOpen` is set to `true`.
     */
    public openConversationAndDetailsForReceiver(
        receiverLookup: DbReceiverLookup,
        options?: {readonly keepAsidePanelOpen?: boolean},
    ): void {
        assert(
            [ReceiverType.CONTACT, ReceiverType.GROUP].includes(receiverLookup.type),
            'TODO(DESK-236)',
        );
        const aside = this._getAside(receiverLookup, options?.keepAsidePanelOpen ?? false);
        this.go(
            this.get().nav,
            ROUTE_DEFINITIONS.main.conversation.withTypedParams({receiverLookup}),
            aside,
            undefined,
        );
    }

    private _getAside(
        receiverLookup: DbReceiverLookup,
        keepAsidePanelOpen: boolean,
    ): AnyRouteInstance['aside'] | undefined {
        const currentState = this.get();
        const displayMode = display.get();

        // Determine what to show in aside panel. If the aside is currently closed, keep it closed.
        // If it is opened, then show it, but only if layout is in large mode (since otherwise the
        // chat view is hidden below the aside panel), or if the `keepAsidePanelOpen` option is set.
        let aside = undefined;
        if (currentState.aside !== undefined && (displayMode === 'large' || keepAsidePanelOpen)) {
            switch (receiverLookup.type) {
                case ReceiverType.CONTACT:
                    aside = ROUTE_DEFINITIONS.aside.contactDetails.withTypedParams({
                        contactUid: receiverLookup.uid,
                    });
                    break;
                case ReceiverType.GROUP:
                    aside = ROUTE_DEFINITIONS.aside.groupDetails.withTypedParams({
                        groupUid: receiverLookup.uid,
                    });
                    break;
                default:
                    assertUnreachable('TODO(DESK-236)');
            }
        }
        return aside;
    }

    /**
     * Update the internal state and add an entry to the browser history and the
     * URL fragment as well.
     */
    private _setState(state: RouterState): void {
        this._log.debug('Set state:', state);
        this.set(state);

        // Determine fragment
        let url: string | undefined = undefined;
        const fragment = getFragmentForRoute(state.main, this._log);
        if (fragment !== undefined) {
            this._log.debug(`Set fragment: ${fragment}`);
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
        this._log.debug('onpopstate', event);

        // Determine new state.
        let newState: RouterState;
        if (event.state !== null && event.state !== undefined) {
            // If the popstate event contains a state, restore this.
            // (No need to update the URL, this will have already happened by now.)
            newState = event.state as RouterState;
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
                newState = INITIAL_STATE;
                const newFragment = getFragmentForRoute(newState.main, this._log);
                this._environment.replaceHistoryState(newState, `#${newFragment}`);
            } else {
                // Fragment is valid, load it
                newState = stateFromFragment;
            }
        }

        this._log.debug('Restore state', newState);
        this.set(newState);
    }
}
