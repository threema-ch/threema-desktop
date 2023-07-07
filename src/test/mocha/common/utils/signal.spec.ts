import {expect} from 'chai';

import {AbortRaiser} from '~/common/utils/signal';

/**
 * Test of random utils.
 */
export function run(): void {
    describe('utils::signal', function () {
        describe('AbortRaiser', function () {
            it('exposes the "aborted" flag', function () {
                const abort = new AbortRaiser();
                expect(abort.aborted).to.be.false;
                abort.raise();
                expect(abort.aborted).to.be.true;
            });

            it('provides the "abortedPromise" method', function () {
                const abort = new AbortRaiser();
                const promise = abort.abortedPromise();
                expect(promise.done).to.be.false;
                abort.raise();
                expect(promise.done).to.be.true;
            });
        });
    });
}
