import {expect} from 'chai';

import {assertRoute} from '~/app/routing';
import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import type {DbContactUid} from '~/common/db';
import {ReceiverType} from '~/common/enum';

export function run(): void {
    describe('assertRoute', function () {
        it('can successfully assert a route', function () {
            const route = ROUTE_DEFINITIONS.main.conversation.withTypedParams({
                receiverLookup: {
                    type: ReceiverType.CONTACT,
                    uid: 42n as DbContactUid,
                },
            });
            const assertedRoute = assertRoute('main', route, ['conversation']);
            expect(assertedRoute.id).to.equal('conversation');
            expect(assertedRoute.params.receiverLookup.type).to.equal(ReceiverType.CONTACT);
            expect(assertedRoute.params.receiverLookup.uid).to.equal(42n);
        });

        it('does not accept the wrong route type', function () {
            const route = ROUTE_DEFINITIONS.main.conversation.withTypedParams({
                receiverLookup: {
                    type: ReceiverType.CONTACT,
                    uid: 42n as DbContactUid,
                },
            });
            // @ts-expect-error The "route" type does not match "aside"
            assertRoute('aside', route, ['conversation']);
            // @ts-expect-error The "route" type does not match "nav"
            assertRoute('nav', route, ['conversation']);
            // @ts-expect-error The "contactList" route is a nav route, not a main route
            expect(() => assertRoute('main', route, ['contactList'])).to.throw(
                "Unexpected main route id 'conversation'",
            );
        });
    });
}
