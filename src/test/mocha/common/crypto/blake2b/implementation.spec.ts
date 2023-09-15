import * as chai from 'chai';

import {
    BYTES,
    BYTES_MIN,
    createHash as blake2b,
    KEYBYTES,
} from '~/common/crypto/blake2b/implementation';
import {unwrap} from '~/common/utils/assert';
import chaiByteEqual from '~/test/common/plugins/byte-equal';
import {type Blake2bTestVector, testVectors} from '~/test/mocha/common/crypto/blake2b/test-vectors';

const {expect} = chai.use(chaiByteEqual);

function failureMessage(testVector: Blake2bTestVector, error?: unknown): string {
    const errorMessage = error === undefined ? '' : `Error: '${error}'\n     `;

    return (
        `${errorMessage}` +
        `Blake2b implementation failed for:\n` +
        `       outlen: '${testVector.outlen}'\n` +
        `       out: '${testVector.out}'\n` +
        `       input: '${testVector.input}'\n` +
        `       key: '${testVector.key}'\n` +
        `       salt: '${testVector.salt}'\n` +
        `       personal: '${testVector.personal}'\n`
    );
}

/**
 * Test suite and test vectors based on the original repo with as few modifications as possible.
 * Therefore the code style on this file slightly differs from the rest of the codebase, and some
 * linting rules are disabled.
 *
 * @see SOURCE: {@link https://github.com/emilbayes/blake2b/blob/1f63e02/test.js}
 */
export function run(): void {
    describe('Blake2b implementation', function () {
        it('should pass all tests from the original library', function () {
            for (const vector of testVectors) {
                expect(() => {
                    const out = new Uint8Array(vector.outlen);

                    const input = hexWrite(new Uint8Array(vector.input.length / 2), vector.input);
                    const key =
                        vector.key.length === 0
                            ? null
                            : hexWrite(new Uint8Array(vector.key.length / 2), vector.key);
                    const salt =
                        vector.salt.length === 0
                            ? null
                            : hexWrite(new Uint8Array(vector.salt.length / 2), vector.salt);
                    const personal =
                        vector.personal.length === 0
                            ? null
                            : hexWrite(new Uint8Array(vector.personal.length / 2), vector.personal);

                    const expected = Buffer.from(
                        hexWrite(new Uint8Array(vector.out.length / 2), vector.out),
                    );
                    const actual = Buffer.from(
                        // eslint-disable-next-line threema/ban-typed-array-length
                        blake2b(out.length, key, salt, personal, true).update(input).digest(out),
                    );

                    expect(actual, failureMessage(vector)).to.eql(expected);
                }).not.to.throw;
            }
        });

        describe('for buffers', function () {
            it('should work', function () {
                const vector = unwrap(testVectors.at(-1));

                const out = Buffer.allocUnsafe(vector.outlen);
                const input = Buffer.from(vector.input, 'hex');
                const key = Buffer.from(vector.key, 'hex');
                const salt = Buffer.from(vector.salt, 'hex');
                const personal = Buffer.from(vector.personal, 'hex');

                const expected = Buffer.from(vector.out, 'hex');
                // eslint-disable-next-line threema/ban-typed-array-length
                const actual = blake2b(out.length, key, salt, personal).update(input).digest(out);

                expect(actual).to.eql(expected);
            });
        });

        describe('for streaming', function () {
            it('should work without key', function () {
                const instance = blake2b(BYTES, null, null, null);
                const buf = Buffer.from('Hej, Verden');

                for (let i = 0; i < 10; i++) {
                    instance.update(buf);
                }

                const out = Buffer.alloc(BYTES);
                instance.digest(out);

                expect(out.toString('hex')).to.eql(
                    'cbc20f347f5dfe37dc13231cbf7eaa4ec48e585ec055a96839b213f62bd8ce00',
                    'streaming hash',
                );
            });

            it('should work with key', function () {
                const key = Buffer.alloc(KEYBYTES);
                key.fill('lo');

                const instance = blake2b(BYTES, key, null, null);
                const buf = Buffer.from('Hej, Verden');

                for (let i = 0; i < 10; i++) {
                    instance.update(buf);
                }

                const out = Buffer.alloc(BYTES);
                instance.digest(out);

                expect(out.toString('hex')).to.eql(
                    '405f14acbeeb30396b8030f78e6a84bab0acf08cb1376aa200a500f669f675dc',
                    'streaming keyed hash',
                );
            });

            it('should work with hash length', function () {
                const instance = blake2b(BYTES_MIN, null, null, null);
                const buf = Buffer.from('Hej, Verden');

                for (let i = 0; i < 10; i++) {
                    instance.update(buf);
                }

                const out = Buffer.alloc(BYTES_MIN);
                instance.digest(out);

                expect(out.toString('hex')).to.eql(
                    'decacdcc3c61948c79d9f8dee5b6aa99',
                    'streaming short hash',
                );
            });

            it('should work with key and hash length', function () {
                const key = Buffer.alloc(KEYBYTES);
                key.fill('lo');

                const instance = blake2b(BYTES_MIN, key, null, null);
                const buf = Buffer.from('Hej, Verden');

                for (let i = 0; i < 10; i++) {
                    instance.update(buf);
                }

                const out = Buffer.alloc(BYTES_MIN);
                instance.digest(out);

                expect(out.toString('hex')).to.eql(
                    'fb43f0ab6872cbfd39ec4f8a1bc6fb37',
                    'streaming short keyed hash',
                );
            });
        });
    });
}

function hexWrite(buf: Uint8Array, string: string): Uint8Array {
    // Must be an even number of digits
    const strLen = string.length;
    if (strLen % 2 !== 0) {
        throw new TypeError('Invalid hex string');
    }

    for (let i = 0; i < strLen / 2; ++i) {
        const parsed = parseInt(string.substr(i * 2, 2), 16);
        if (Number.isNaN(parsed)) {
            throw new Error('Invalid byte');
        }
        buf[i] = parsed;
    }
    return buf;
}
