import * as chai from 'chai';

import {wrapRawKey} from '~/common/crypto';
import {CryptoError} from '~/common/error';
import chaiByteEqual from '~/test/common/plugins/byte-equal';
import {pseudoRandomBytes} from '~/test/mocha/common/utils';

const {expect} = chai.use(chaiByteEqual);

/**
 * {@link RawKey} tests.
 */
export function run(): void {
    const key = pseudoRandomBytes(new Uint8Array(32));

    describe('RawKey', function () {
        it('should validate key length', () => {
            expect(() => wrapRawKey(new Uint8Array(31))).to.throw(CryptoError);
        });

        it('should unwrap back to given data', () => {
            const wrapped = wrapRawKey(key);
            expect(wrapped.unwrap()).to.equal(key);
        });

        it('should purge as expected', () => {
            const copy = key.slice();
            const wrapped = wrapRawKey(copy);
            wrapped.purge();
            const purged = new Uint8Array(32);
            purged.fill(0x23);
            expect(copy).to.byteEqual(purged);
        });

        it('should throw when unwrapping after purging', () => {
            const copy = key.slice();
            const wrapped = wrapRawKey(copy);
            expect(wrapped.unwrap()).to.byteEqual(key);
            wrapped.purge();
            expect(() => wrapped.unwrap()).to.throw('Cannot unwrap, key purged');
        });
    });
}
