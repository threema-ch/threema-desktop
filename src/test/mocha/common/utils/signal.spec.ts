import {expect} from 'chai';

import {AbortRaiser} from '~/common/utils/signal';

/**
 * Test of random utils.
 */
export function run(): void {
    describe('utils::signal', function () {
        describe('AbortRaiser', function () {
            it('exposes the "aborted" flag', function () {
                const abort = new AbortRaiser<string>();
                expect(abort.aborted).to.be.false;
                abort.raise('hi');
                expect(abort.aborted).to.be.true;
            });

            it('provides the "promise" property', function () {
                const abort = new AbortRaiser<string>();
                const promise = abort.promise;
                expect(promise.done).to.be.false;
                abort.raise('hi');
                expect(promise.done).to.be.true;
                expect(promise.state).to.eql({type: 'resolved', result: 'hi'});
            });
        });
    });
}
