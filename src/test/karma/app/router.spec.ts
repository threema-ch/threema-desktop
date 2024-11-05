import {expect} from 'chai';

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

    public assertRouteIds(expectedIds: {
        [TPanel in keyof RouterState]?: Exclude<RouterState[TPanel], undefined>['id'] | undefined;
    }): void {
        const actualIdsList = Object.fromEntries(
            Object.entries({...this.get()}).map(([panel, route]) => [panel, route?.id]),
        );
        const expectedIdsList = {...actualIdsList, ...expectedIds};
        expect(expectedIdsList).to.eql(actualIdsList);
    }
}

/**
 * Config tests.
 */
export function run(): void {
    describe('Router', function () {
        it('initial state', function () {
            const router = new TestRouter();
            router.assertRouteIds({
                nav: 'conversationList',
                main: 'welcome',
                aside: undefined,
                modal: undefined,
                activity: undefined,
            });
        });

        it('single-panel navigation', function () {
            const router = new TestRouter();
            router.assertRouteIds({
                nav: 'conversationList',
                main: 'welcome',
                aside: undefined,
                modal: undefined,
                activity: undefined,
            });

            // Nav
            router.go({nav: ROUTE_DEFINITIONS.nav.receiverList.withoutParams()});
            router.assertRouteIds({
                nav: 'receiverList',
                main: 'welcome',
                aside: undefined,
                modal: undefined,
                activity: undefined,
            });

            // Main
            router.go({
                main: ROUTE_DEFINITIONS.main.conversation.withParams({
                    receiverLookup: {type: ReceiverType.CONTACT, uid: 1n as DbContactUid},
                }),
            });
            router.assertRouteIds({
                nav: 'receiverList',
                main: 'conversation',
                aside: undefined,
                modal: undefined,
                activity: undefined,
            });

            // Aside
            router.go({
                aside: ROUTE_DEFINITIONS.aside.contactDetails.withParams({
                    type: ReceiverType.CONTACT,
                    uid: 1n as DbContactUid,
                }),
            });
            router.assertRouteIds({
                nav: 'receiverList',
                main: 'conversation',
                aside: 'contactDetails',
                modal: undefined,
                activity: undefined,
            });

            // Modal
            router.go({modal: ROUTE_DEFINITIONS.modal.changePassword.withoutParams()});
            router.assertRouteIds({
                nav: 'receiverList',
                main: 'conversation',
                aside: 'contactDetails',
                modal: 'changePassword',
                activity: undefined,
            });

            // Close aside
            router.go({aside: 'close'});
            router.assertRouteIds({
                nav: 'receiverList',
                main: 'conversation',
                aside: undefined,
                modal: 'changePassword',
                activity: undefined,
            });

            // Close modal
            router.go({modal: 'close'});
            router.assertRouteIds({
                nav: 'receiverList',
                main: 'conversation',
                aside: undefined,
                modal: undefined,
                activity: undefined,
            });
        });

        it('state from valid fragment', function () {
            const router = new TestRouter('/conversation/0/123/');
            expect(router.env.fragment).to.equal('/conversation/0/123/');
            router.assertRouteIds({nav: 'conversationList', main: 'conversation'});
            expect(router.assert('main', ['conversation']).receiverLookup).to.eql({
                type: ReceiverType.CONTACT,
                uid: 123n as DbContactUid,
            });
        });

        it('state from invalid fragment', function () {
            const router = new TestRouter('/consasdf/0/123/');
            expect(router.env.fragment).to.equal('/');
            router.assertRouteIds({nav: 'conversationList', main: 'welcome'});
        });

        it('state from fragment with invalid params', function () {
            const router = new TestRouter('/conversation/99/123/'); // Receiver type 99 does not exist
            expect(router.env.fragment).to.equal('/');
            router.assertRouteIds({nav: 'conversationList', main: 'welcome'});
        });

        describe('assert', function () {
            it('can successfully assert a route', function () {
                const router = new TestRouter();
                router.go({
                    main: ROUTE_DEFINITIONS.main.conversation.withParams({
                        receiverLookup: {
                            type: ReceiverType.CONTACT,
                            uid: 42n as DbContactUid,
                        },
                    }),
                });
                const assertedRoute = router.assert('main', ['conversation']);
                expect(assertedRoute.receiverLookup.type).to.equal(ReceiverType.CONTACT);
                expect(assertedRoute.receiverLookup.uid).to.equal(42n);
            });

            it('does not accept the wrong route type', function () {
                const router = new TestRouter();
                router.go({
                    main: ROUTE_DEFINITIONS.main.conversation.withParams({
                        receiverLookup: {
                            type: ReceiverType.CONTACT,
                            uid: 42n as DbContactUid,
                        },
                    }),
                });
                // @ts-expect-error The `receiverList` route is a nav route, not a main route
                expect(() => router.assert('main', ['receiverList'])).to.throw(
                    'Unexpected state for panel main (expected=receiverList, got=conversation)',
                );
            });
        });
    });
}

run();
