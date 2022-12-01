import {expect} from 'chai';

import {type u53} from '~/common/types';
import {AsyncWeakValueMap} from '~/common/utils/map';
import {GlobalTimer} from '~/common/utils/timer';

/**
 * Test map utils.
 */
export function run(): void {
    describe('AsyncWeakValueMap', function () {
        describe('getOrCreate', function () {
            it('is async safe for multiple invocations', async function () {
                interface Value {
                    callId: u53;
                }
                const map: AsyncWeakValueMap<string, Value> = new AsyncWeakValueMap();
                const timer = new GlobalTimer();

                // Without a lock, there's potential for async races in getOrCreate:
                //
                // 1. Look up value: miss
                // 2. Generate value asynchronously
                // 3. Another call with the same key
                // 4. Generate value asynchronusly
                // 5. First async call is done, generated value is set in cache
                // 6. Second async call is done, generated value is overwritten in cache
                const key = 'key';
                let call1Missed = false;
                const call1 = map.getOrCreate(key, async () => {
                    call1Missed = true;
                    await timer.sleep(1);
                    return {callId: 1};
                });
                let call2Missed = false;
                const call2 = map.getOrCreate(key, async () => {
                    call2Missed = true;
                    await timer.sleep(20);
                    return {callId: 2};
                });

                // Call 1 finishes faster than call 2, so the call 2 `miss` function should not get
                // called. Instead, the value from call 1 should be returned. Without a lock, this
                // is not the case and the value will be overwritten by the `miss` function from
                // call 2.
                const [call1Value, call2Value] = await Promise.all([call1, call2]);
                expect(call1Missed, 'Call 1 `miss` function should have been called').to.be.true;
                expect(call2Missed, 'Call 2 `miss` function should not have been called').to.be
                    .false;
                expect(call1Value.callId).to.equal(1);
                expect(call2Value.callId).to.equal(1);
            });
        });
    });
}
