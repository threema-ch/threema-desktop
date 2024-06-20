import * as chai from 'chai';

import {
    bytePadPkcs7,
    byteSplit,
    byteToHex,
    bytesToHex,
    hexToBytes,
    hexWithSeparatorToBytes,
} from '~/common/utils/byte';
import {ByteBuffer} from '~/common/utils/byte-buffer';
import chaiByteEqual from '~/test/common/plugins/byte-equal';

const {expect} = chai.use(chaiByteEqual);

/**
 * Test of random utils.
 */
export function run(): void {
    describe('utils::byte', function () {
        describe('bytePadPkcs7', function () {
            it('properly fills byte buffers', function () {
                const arr = new Uint8Array(6);
                const buf = new ByteBuffer(arr);
                bytePadPkcs7(buf, 4);
                expect(arr).to.byteEqual(Uint8Array.of(4, 4, 4, 4, 0, 0));
            });

            it('properly fills arrays', function () {
                const arr = new Uint8Array(6);
                bytePadPkcs7(arr, 5);
                expect(arr).to.byteEqual(Uint8Array.of(5, 5, 5, 5, 5, 0));
            });

            it('throws if destination buffer is smaller than requested length', function () {
                const buf = new ByteBuffer(new Uint8Array(5));
                expect(() => bytePadPkcs7(buf, 6)).to.throw(
                    'Could not create sub-array, length exhausted (remaining=5, requested=6)',
                );
            });

            it('throws if destination array is smaller than requested length', function () {
                const arr = new Uint8Array(5);
                expect(() => bytePadPkcs7(arr, 6)).to.throw(
                    'Requested length 6 is larger than the destination array size',
                );
            });
        });

        describe('hexToBytes', function () {
            it('validates the input character length', function () {
                expect(() => hexToBytes('0')).to.throw('Invalid hex string length');
                expect(() => hexToBytes('01')).not.to.throw('Invalid hex string length');
                expect(() => hexToBytes('012')).throw('Invalid hex string length');
                expect(() => hexToBytes('0123')).not.to.throw('Invalid hex string length');
            });

            it('validates the input characters', function () {
                expect(() => hexToBytes('0 ')).to.throw('Invalid hex character:  ');
                expect(() => hexToBytes('fg')).to.throw('Invalid hex character: g');
                expect(() => hexToBytes('gf')).to.throw('Invalid hex character: g');
                expect(() => hexToBytes('f00bäa')).to.throw('Invalid hex character: ä');
            });

            it('decodes lowercase, uppercase and mixed hex', function () {
                expect(hexToBytes('000102ff')).to.byteEqual(Uint8Array.of(0x00, 0x01, 0x02, 0xff));
                expect(hexToBytes('AABBCC')).to.byteEqual(Uint8Array.of(0xaa, 0xbb, 0xcc));
                expect(hexToBytes('0AbC42')).to.byteEqual(Uint8Array.of(0x0a, 0xbc, 0x42));
            });

            it('handles empty strings', function () {
                expect(hexToBytes('')).to.byteEqual(new Uint8Array(0));
            });
        });

        describe('hexWithSeparatorToBytes', function () {
            it('validates the input character length', function () {
                expect(() => hexWithSeparatorToBytes('0', 1)).to.throw('Invalid hex string length');
                expect(() => hexWithSeparatorToBytes('01', 1)).not.to.throw(
                    'Invalid hex string length',
                );
                expect(() => hexWithSeparatorToBytes('01:', 1)).throw('Invalid hex string length');
                expect(() => hexWithSeparatorToBytes('01:', 2)).throw('Invalid hex string length');
                expect(() => hexWithSeparatorToBytes('01:2', 2)).throw('Invalid hex string length');
                expect(() => hexWithSeparatorToBytes('01:23', 1)).not.to.throw(
                    'Invalid hex string length',
                );
                expect(() => hexWithSeparatorToBytes('01::23', 2)).not.to.throw(
                    'Invalid hex string length',
                );
                expect(() => hexWithSeparatorToBytes('01:23:', 1)).throw(
                    'Invalid hex string length',
                );
                expect(() => hexWithSeparatorToBytes('01::23:', 2)).throw(
                    'Invalid hex string length',
                );
                expect(() => hexWithSeparatorToBytes('01::23::', 2)).throw(
                    'Invalid hex string length',
                );
            });

            it('validates the input characters', function () {
                expect(() => hexWithSeparatorToBytes('0 ', 1)).to.throw('Invalid hex character:  ');
                expect(() => hexWithSeparatorToBytes('fg', 1)).to.throw('Invalid hex character: g');
                expect(() => hexWithSeparatorToBytes('gf', 1)).to.throw('Invalid hex character: g');
                expect(() => hexWithSeparatorToBytes('f0:0b:äa', 1)).to.throw(
                    'Invalid hex character: ä',
                );
            });

            it('decodes lowercase, uppercase and mixed hex', function () {
                expect(hexWithSeparatorToBytes('00:01:02:ff', 1)).to.byteEqual(
                    Uint8Array.of(0x00, 0x01, 0x02, 0xff),
                );
                expect(hexWithSeparatorToBytes('AA:BB:CC', 1)).to.byteEqual(
                    Uint8Array.of(0xaa, 0xbb, 0xcc),
                );
                expect(hexWithSeparatorToBytes('0A:bC:42', 1)).to.byteEqual(
                    Uint8Array.of(0x0a, 0xbc, 0x42),
                );
            });

            it('handles empty strings', function () {
                expect(hexWithSeparatorToBytes('', 1)).to.byteEqual(new Uint8Array(0));
                expect(hexWithSeparatorToBytes('', 2)).to.byteEqual(new Uint8Array(0));
                expect(hexWithSeparatorToBytes('', 3)).to.byteEqual(new Uint8Array(0));
            });
        });

        describe('byteToHex', function () {
            it('encodes bytes properly', function () {
                expect(byteToHex(0)).to.equal('00');
                expect(byteToHex(1)).to.equal('01');
                expect(byteToHex(10)).to.equal('0a');
                expect(byteToHex(15)).to.equal('0f');
                expect(byteToHex(16)).to.equal('10');
                expect(byteToHex(64)).to.equal('40');
                expect(byteToHex(254)).to.equal('fe');
                expect(byteToHex(255)).to.equal('ff');
            });

            it('validated input by default', function () {
                expect(() => byteToHex(-1)).to.throw('Value -1 is not a valid unsigned byte');
                expect(() => byteToHex(256)).to.throw('Value 256 is not a valid unsigned byte');
                expect(() => byteToHex(1000)).to.throw('Value 1000 is not a valid unsigned byte');
            });

            it('validation can be turned off, but results in undefined behavior', function () {
                expect(() => byteToHex(-1, false)).not.to.throw;
                expect(() => byteToHex(256, false)).not.to.throw;
            });
        });

        describe('bytesToHex', function () {
            it('encodes bytes properly', function () {
                expect(bytesToHex(new Uint8Array(0))).to.equal('');
                expect(bytesToHex(Uint8Array.of(0, 1, 10, 15, 16, 64, 254, 255))).to.equal(
                    '00010a0f1040feff',
                );
            });

            it('encodes bytes with separator', function () {
                expect(bytesToHex(new Uint8Array(0), ':')).to.equal('');
                expect(bytesToHex(Uint8Array.of(0, 1, 10, 15, 16, 64, 254, 255), ':')).to.equal(
                    '00:01:0a:0f:10:40:fe:ff',
                );
                expect(bytesToHex(new Uint8Array(0), 'lol')).to.equal('');
                expect(bytesToHex(Uint8Array.of(0, 1, 10, 15, 16, 64, 254, 255), 'lol')).to.equal(
                    '00lol01lol0alol0flol10lol40lolfelolff',
                );
            });
        });

        describe('byteSplit', function () {
            it('does not split an array smaller than maxChunkLength', function () {
                const arr = Uint8Array.of(0, 1, 2, 3);
                expect([...byteSplit(arr, 5)]).to.deep.equal([arr]);
                expect([...byteSplit(arr, 99)]).to.deep.equal([arr]);
                expect([...byteSplit(arr, 729834798273498)]).to.deep.equal([arr]);
            });

            it('does not split an array of size maxChunkLength', function () {
                const arr = Uint8Array.of(0, 1, 2, 3);
                expect([...byteSplit(arr, arr.byteLength)]).to.deep.equal([arr]);
            });

            it('splits larger chunks', function () {
                const arr = Uint8Array.of(1, 2, 3, 4, 5, 6);
                expect([...byteSplit(arr, 5)]).to.deep.equal([
                    Uint8Array.of(1, 2, 3, 4, 5),
                    Uint8Array.of(6),
                ]);
                expect([...byteSplit(arr, 3)]).to.deep.equal([
                    Uint8Array.of(1, 2, 3),
                    Uint8Array.of(4, 5, 6),
                ]);
                expect([...byteSplit(arr, 2)]).to.deep.equal([
                    Uint8Array.of(1, 2),
                    Uint8Array.of(3, 4),
                    Uint8Array.of(5, 6),
                ]);
            });
        });
    });
}
