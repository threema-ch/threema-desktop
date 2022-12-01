import * as chai from 'chai';

import {type u8} from '~/common/types';
import {base64ToU8a} from '~/common/utils/base64';
import chaiByteEqual from '~/test/common/plugins/byte-equal';

const {expect} = chai.use(chaiByteEqual);

/**
 * Test of random utils.
 */
export function run(): void {
    describe('utils::base64', function () {
        describe('base64ToU8a', function () {
            const testCases: [encoded: string, array: u8[]][] = [
                ['AQ==', [1]],
                ['AQ== ', [1]], // Ignore trailing whitespace
                ['AQ == ', [1]], // Ignore whitespace anywhere, as per https://infra.spec.whatwg.org/#forgiving-base64-decode
                ['AQI=', [1, 2]],
                ['AQID', [1, 2, 3]],
                ['AQIDBA==', [1, 2, 3, 4]],
                ['AQIDBAU=', [1, 2, 3, 4, 5]],
                ['AQIDBAUG', [1, 2, 3, 4, 5, 6]],
            ];
            for (const [encoded, array] of testCases) {
                it(`decodes base64-encoded data (${encoded})`, function () {
                    const decoded = base64ToU8a(encoded);
                    expect(decoded).to.byteEqual(new Uint8Array(array));
                });
            }

            it('throws when it encounters invalid data', function () {
                expect(() => base64ToU8a('AQ#==')).to.throw('Failed to decode base64 string');
                expect(() => base64ToU8a('AQ==##')).to.throw('Failed to decode base64 string');
            });

            it('allows specifying headroom', function () {
                const decoded0 = base64ToU8a('AQID', 0);
                const decoded2 = base64ToU8a('AQID', 2);
                const decoded5 = base64ToU8a('AQID', 5);
                expect(decoded0).to.byteEqual(Uint8Array.of(1, 2, 3));
                expect(decoded2).to.byteEqual(Uint8Array.of(0, 0, 1, 2, 3));
                expect(decoded5).to.byteEqual(Uint8Array.of(0, 0, 0, 0, 0, 1, 2, 3));
            });
        });
    });
}
