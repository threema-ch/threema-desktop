import {expect} from 'chai';

import {assertRoute} from '~/app/routing';
import {Router, type RouterEnvironment, type RouterState} from '~/app/routing/router';
import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import type {DbContactUid} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import {type Logger, NOOP_LOGGER} from '~/common/logging';

const log: Logger = NOOP_LOGGER;

class TestEnvironment implements RouterEnvironment {
    private readonly _historyStack: [state: RouterState, url: string | URL | undefined][] = [];
    private _onpopstate: ((event: PopStateEvent) => void) | undefined;

    public constructor(public fragment: string = '') {}

    public getUrlFragment(): string {
        return this.fragment;
    }

    public setUrlFragment(fragment: string): void {
        this.fragment = fragment;
    }

    public pushHistoryState(state: RouterState, url?: string | URL): void {
        this._historyStack.push([state, url]);
    }

    public replaceHistoryState(state: RouterState, url?: string | URL): void {
        this._historyStack.pop();
        this._historyStack.push([state, url]);
    }

    public setOnPopStateHandler(handler: (event: PopStateEvent) => void): void {
        this._onpopstate = handler;
    }

    public navigateBack(): void {
        this._historyStack.pop();
        const event = new PopStateEvent('popstate', {
            state: this._historyStack.at(-1),
        });
        this._onpopstate?.(event);
    }
}

class TestRouter extends Router {
    public env: TestEnvironment;

    public constructor(initialFragment = '') {
        const env = new TestEnvironment(initialFragment);
        super(log, env);
        this.env = env;
    }

    public assertRoutes(
        nav: RouterState['nav']['id'],
        main: RouterState['main']['id'],
        aside?: Exclude<RouterState['aside'], undefined>['id'],
        modal?: Exclude<RouterState['modal'], undefined>['id'],
    ): void {
        const state = this.get();
        const ids = [state.nav.id, state.main.id, state.aside?.id, state.modal?.id] as const;
        expect([nav, main, aside, modal]).to.eql(ids);
    }
}

/**
 * Config tests.
 */
export function run(): void {
    describe('Router', function () {
        it('initial state', function () {
            const router = new TestRouter();
            router.assertRoutes('conversationList', 'welcome', undefined, undefined);
        });

        it('single-panel navigation', function () {
            const router = new TestRouter();
            router.assertRoutes('conversationList', 'welcome', undefined, undefined);

            // Nav
            router.replaceNav(ROUTE_DEFINITIONS.nav.contactList.withoutParams());
            router.assertRoutes('contactList', 'welcome', undefined, undefined);

            // Main
            router.replaceMain(
                ROUTE_DEFINITIONS.main.conversation.withTypedParams({
                    receiverLookup: {type: ReceiverType.CONTACT, uid: 1n as DbContactUid},
                }),
            );
            router.assertRoutes('contactList', 'conversation', undefined, undefined);

            // Aside
            router.replaceAside(
                ROUTE_DEFINITIONS.aside.contactDetails.withTypedParams({
                    contactUid: 1n as DbContactUid,
                }),
            );
            router.assertRoutes('contactList', 'conversation', 'contactDetails', undefined);

            // Modal
            router.replaceModal(ROUTE_DEFINITIONS.modal.changePassword.withoutParams());
            router.assertRoutes('contactList', 'conversation', 'contactDetails', 'changePassword');

            // Close aside
            router.closeAside();
            router.assertRoutes('contactList', 'conversation', undefined, 'changePassword');

            // Close modal
            router.closeModal();
            router.assertRoutes('contactList', 'conversation', undefined, undefined);
        });

        it('state from valid fragment', function () {
            const router = new TestRouter('/conversation/0/123/');
            expect(router.env.fragment).to.equal('/conversation/0/123/');
            router.assertRoutes('conversationList', 'conversation');
            const state = router.get();
            expect(assertRoute('main', state.main, ['conversation']).params.receiverLookup).to.eql({
                type: ReceiverType.CONTACT,
                uid: 123n as DbContactUid,
            });
        });

        it('state from invalid fragment', function () {
            const router = new TestRouter('/consasdf/0/123/');
            expect(router.env.fragment).to.equal('/');
            router.assertRoutes('conversationList', 'welcome');
        });

        it('state from fragment with invalid params', function () {
            const router = new TestRouter('/conversation/99/123/'); // Receiver type 99 does not exist
            expect(router.env.fragment).to.equal('/');
            router.assertRoutes('conversationList', 'welcome');
        });
    });
}

run();
