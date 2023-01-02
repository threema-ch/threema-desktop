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
    const key32 = pseudoRandomBytes(new Uint8Array(32));
    const key64 = pseudoRandomBytes(new Uint8Array(64));

    describe('RawKey', function () {
        it('should validate key length', () => {
            expect(() => wrapRawKey(new Uint8Array(31), 32)).to.throw(CryptoError);
            expect(() => wrapRawKey(key32, 64)).to.throw(CryptoError);
            expect(() => wrapRawKey(key64, 32)).to.throw(CryptoError);
        });

        it('should accept 32 byte keys', () => {
            const wrapped = wrapRawKey(key32, 32);
            expect(wrapped.unwrap()).to.equal(key32);
        });

        it('should accept 64 byte keys', () => {
            const wrapped = wrapRawKey(key64, 64);
            expect(wrapped.unwrap()).to.equal(key64);
        });

        it('should unwrap back to given data', () => {
            const wrapped = wrapRawKey(key32, 32);
            expect(wrapped.unwrap()).to.equal(key32);
        });

        it('should purge as expected', () => {
            const copy = key32.slice();
            const wrapped = wrapRawKey(copy, 32);
            wrapped.purge();
            const purged = new Uint8Array(32);
            purged.fill(0x23);
            expect(copy).to.byteEqual(purged);
        });

        it('should throw when unwrapping after purging', () => {
            const copy = key32.slice();
            const wrapped = wrapRawKey(copy, 32);
            expect(wrapped.unwrap()).to.byteEqual(key32);
            wrapped.purge();
            expect(() => wrapped.unwrap()).to.throw('Cannot unwrap, key purged');
        });
    });
}
