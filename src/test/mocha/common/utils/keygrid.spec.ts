import * as chai from 'chai';

import {ensurePublicKey} from '~/common/crypto';
import {publicKeyGrid} from '~/common/dom/ui/fingerprint';
import chaiByteEqual from '~/test/common/plugins/byte-equal';

const {expect} = chai.use(chaiByteEqual);

/**
 * Test of random utils.
 */
export function run(): void {
    describe('PublicKey Helpers', () => {
        it('publicKeyGrid', function () {
            const publicKey = ensurePublicKey(
                new Uint8Array([
                    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
                    22, 23, 248, 249, 250, 251, 252, 253, 254, 255,
                ]),
            );
            expect(publicKeyGrid(publicKey)).equal(
                '0 0 0 1 0 2 0 3\n' +
                    '0 4 0 5 0 6 0 7\n' +
                    '0 8 0 9 0 a 0 b\n' +
                    '0 c 0 d 0 e 0 f\n' +
                    '1 0 1 1 1 2 1 3\n' +
                    '1 4 1 5 1 6 1 7\n' +
                    'f 8 f 9 f a f b\n' +
                    'f c f d f e f f',
            );
        });
    });
}
