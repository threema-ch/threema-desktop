import {expect} from 'chai';

import {isU64, u64ToU53} from '~/common/types';

/**
 * Type tests.
 */
export function run(): void {
    describe('Types', function () {
        it('isU64', function () {
            // Validate type
            expect(isU64(123), '123').to.be.false;
            expect(isU64(123n), '123n').to.be.true;

            // Validate lower bound
            expect(isU64(0n), '0n').to.be.true;
            expect(isU64(-1n), '-1n').to.be.false;

            // Validate upper bound
            expect(isU64(2n ** 64n), '2**64').to.be.false;
            expect(isU64(2n ** 64n - 1n), '2**64-1').to.be.true;
        });

        it('u64ToU53', function () {
            // Valid
            expect(u64ToU53(1337n)).to.equal(1337);
            expect(u64ToU53(0n)).to.equal(0);

            // Valid u64 out of range
            expect(() => u64ToU53(9007199254740993n)).to.throw;

            // Non-u64 out of range
            expect(() => u64ToU53(-1n)).to.throw;
            expect(() => u64ToU53(87349872398479283479823749872347289347289347298374n)).to.throw;
        });
    });
}
