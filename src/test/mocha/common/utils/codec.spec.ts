import * as chai from 'chai';

import {EncodingError, UTF8} from '~/common/utils/codec';
import chaiByteEqual from '~/test/common/plugins/byte-equal';

const {expect} = chai.use(chaiByteEqual);

/**
 * Codec tests.
 */
export function run(): void {
    describe('Codec', function () {
        describe('Utf8TextEncoderDecoderCodec', function () {
            // Note: Some tests depend on this exact string.
            const testString = 'Hi 😎􏿿'; // Valid utf-8
            const testBytes = new Uint8Array([
                0x48, 0x69, 0x20, 0xf0, 0x9f, 0x98, 0x8e, 0xf4, 0x8f, 0xbf, 0xbf,
            ]);
            describe('#decode', function () {
                it('should convert a valid Uint8Array correctly to string', function () {
                    const result = UTF8.decode(testBytes);
                    expect(result).to.be.a('string');
                    expect(result).to.equal(testString);
                });
                it('should throw an typeerror if invalid utf8 characters are passed', function () {
                    // From https://www.cl.cam.ac.uk/~mgk25/ucs/examples/UTF-8-test.txt
                    const invalidUtf8Bytes = new Uint8Array([0xed, 0xa0, 0x80, 0xed, 0xb0, 0x80]);
                    expect(() => UTF8.decode(invalidUtf8Bytes)).to.throw(TypeError);
                });
            });
            describe('#encode', function () {
                it('should convert a string correctly to a Uint8Array', function () {
                    const result = UTF8.encode(testString);
                    expect(result).to.be.a('Uint8Array');
                    expect(result).to.byteEqual(testBytes);
                });
            });
            describe('#encodeFullyInto', function () {
                it('should convert a string correctly into a correctly sized Uint8Array', function () {
                    const result = UTF8.encodeFullyInto(
                        testString,
                        new Uint8Array(testBytes.byteLength),
                    );
                    expect(result.encoded).to.be.a('Uint8Array');
                    expect(result.encoded).to.byteEqual(testBytes);
                });
                it('should convert a string correctly into a larger Uint8Array', function () {
                    const result = UTF8.encodeFullyInto(
                        testString,
                        new Uint8Array(testBytes.byteLength + 4),
                    );
                    expect(result.encoded).to.be.a('Uint8Array');
                    expect(result.encoded).to.byteEqual(testBytes);
                });
                it('should throw an error if the buffer is too small', function () {
                    const array = new Uint8Array(testBytes.byteLength - 1);
                    expect(() => UTF8.encodeFullyInto(testString, array)).to.throw(
                        EncodingError,
                        'insufficient space',
                    );
                });
                it('should alias the provided Uint8Array', function () {
                    const array = new Uint8Array(4);
                    const result = UTF8.encodeFullyInto('foo', array);
                    expect(result.array).to.equal(array);
                });
                it('should provide a subarray to the encoded bytes', function () {
                    const array = new Uint8Array(4);
                    const result = UTF8.encodeFullyInto('foo', array);
                    expect(result.encoded).to.eql(array.subarray(0, 3));
                });
                it('should provide a subarray to the remaining bytes', function () {
                    const array = new Uint8Array(4);
                    const result = UTF8.encodeFullyInto('foo', array);
                    expect(result.rest).to.eql(array.subarray(3));
                });
            });
            describe('#encodePartiallyInto', function () {
                it('should convert a string fully into a large enough Uint8Array', function () {
                    const result = UTF8.encodePartiallyInto(
                        testString,
                        new Uint8Array(testBytes.byteLength),
                    );
                    expect(result.encoded).to.be.a('Uint8Array');
                    expect(result.encoded).to.byteEqual(testBytes);
                });
                it('should convert a string partially into a shorter Uint8Array', function () {
                    const result = UTF8.encodePartiallyInto(
                        testString,
                        new Uint8Array(testBytes.byteLength - 4),
                    );
                    expect(result.encoded).to.be.a('Uint8Array');
                    expect(result.encoded).to.byteEqual(testBytes.subarray(0, -4));
                });
                it('should not convert partial characters into a Uint8Array', function () {
                    const partialTestBytes = testBytes.slice(0, -2);
                    partialTestBytes[partialTestBytes.byteLength - 1] = 0;
                    partialTestBytes[partialTestBytes.byteLength - 2] = 0;

                    const result = UTF8.encodePartiallyInto(
                        testString,
                        new Uint8Array(partialTestBytes.byteLength),
                    );

                    expect(result.array).to.be.a('Uint8Array');
                    expect(result.array).to.byteEqual(partialTestBytes);

                    expect(result.encoded).to.be.a('Uint8Array');
                    expect(result.encoded).to.byteEqual(
                        partialTestBytes.subarray(0, partialTestBytes.byteLength - 2),
                    );

                    expect(result.rest).to.be.a('Uint8Array');
                    expect(result.rest).to.byteEqual(new Uint8Array(2));
                });
                it('should alias the provided Uint8Array', function () {
                    const array = new Uint8Array(4);
                    const result = UTF8.encodePartiallyInto('foo', array);
                    expect(result.array).to.equal(array);
                });
                it('should provide a subarray to the encoded bytes', function () {
                    const array = new Uint8Array(4);
                    const result = UTF8.encodePartiallyInto('foo', array);
                    expect(result.encoded).to.eql(array.subarray(0, 3));
                });
                it('should provide a subarray to the remaining bytes', function () {
                    const array = new Uint8Array(4);
                    const result = UTF8.encodePartiallyInto('foo', array);
                    expect(result.rest).to.eql(array.subarray(3));
                });
            });
        });
    });
}
