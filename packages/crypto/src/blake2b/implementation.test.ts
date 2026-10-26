import {bytesToHex} from '@threema/ts-utils/conversion/bytes-to-hex';
import {hexToBytes} from '@threema/ts-utils/conversion/hex-to-bytes';
import {unwrap} from '@threema/ts-utils/meta/unwrap';
import {describe, expect, it} from 'vitest';

import {BYTES, BYTES_MIN, createHash, KEYBYTES} from './implementation.js';
import {testVectors} from './test-vectors.js';

/**
 * Test suite and test vectors based on the original repo, ported to vitest.
 *
 * @see SOURCE: {@link https://github.com/emilbayes/blake2b/blob/1f63e02/test.js}
 */
describe('Blake2b implementation', () => {
    it('passes all test vectors from the original library', () => {
        for (const [index, vector] of testVectors.entries()) {
            // Arrange
            const input = hexToBytes(vector.input);
            const key = vector.key.length === 0 ? null : hexToBytes(vector.key);
            const salt = vector.salt.length === 0 ? null : hexToBytes(vector.salt);
            const personal = vector.personal.length === 0 ? null : hexToBytes(vector.personal);

            // Act
            const actual = createHash(vector.outlen, key, salt, personal, true)
                .update(input)
                .digest(new Uint8Array(vector.outlen));

            // Assert
            expect(
                bytesToHex(actual),
                `Blake2b implementation failed for test vector #${index}`,
            ).toBe(vector.out);
        }
    });

    it('works with buffers', () => {
        // Arrange
        const vector = unwrap(testVectors.at(-1));
        const out = Buffer.allocUnsafe(vector.outlen);
        const input = Buffer.from(vector.input, 'hex');
        const key = Buffer.from(vector.key, 'hex');
        const salt = Buffer.from(vector.salt, 'hex');
        const personal = Buffer.from(vector.personal, 'hex');

        // Act
        const actual = createHash(vector.outlen, key, salt, personal).update(input).digest(out);

        // Assert
        expect(bytesToHex(actual)).toBe(vector.out);
    });

    describe('for streaming', () => {
        it('works without key', () => {
            // Arrange
            const instance = createHash(BYTES, null, null, null);
            const buf = Buffer.from('Hej, Verden');

            // Act
            for (let i = 0; i < 10; i++) {
                instance.update(buf);
            }
            const out = instance.digest(Buffer.alloc(BYTES));

            // Assert
            expect(bytesToHex(out)).toBe(
                'cbc20f347f5dfe37dc13231cbf7eaa4ec48e585ec055a96839b213f62bd8ce00',
            );
        });

        it('works with key', () => {
            // Arrange
            const key = Buffer.alloc(KEYBYTES);
            key.fill('lo');
            const instance = createHash(BYTES, key, null, null);
            const buf = Buffer.from('Hej, Verden');

            // Act
            for (let i = 0; i < 10; i++) {
                instance.update(buf);
            }
            const out = instance.digest(Buffer.alloc(BYTES));

            // Assert
            expect(bytesToHex(out)).toBe(
                '405f14acbeeb30396b8030f78e6a84bab0acf08cb1376aa200a500f669f675dc',
            );
        });

        it('works with hash length', () => {
            // Arrange
            const instance = createHash(BYTES_MIN, null, null, null);
            const buf = Buffer.from('Hej, Verden');

            // Act
            for (let i = 0; i < 10; i++) {
                instance.update(buf);
            }
            const out = instance.digest(Buffer.alloc(BYTES_MIN));

            // Assert
            expect(bytesToHex(out)).toBe('decacdcc3c61948c79d9f8dee5b6aa99');
        });

        it('works with key and hash length', () => {
            // Arrange
            const key = Buffer.alloc(KEYBYTES);
            key.fill('lo');
            const instance = createHash(BYTES_MIN, key, null, null);
            const buf = Buffer.from('Hej, Verden');

            // Act
            for (let i = 0; i < 10; i++) {
                instance.update(buf);
            }
            const out = instance.digest(Buffer.alloc(BYTES_MIN));

            // Assert
            expect(bytesToHex(out)).toBe('fb43f0ab6872cbfd39ec4f8a1bc6fb37');
        });
    });
});
