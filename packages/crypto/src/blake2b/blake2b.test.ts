import {UTF8} from '@threema/ts-utils/codec/utf8';
import {bytesToHex} from '@threema/ts-utils/conversion/bytes-to-hex';
import {describe, expect, it} from 'vitest';

import {wrapRawKey} from '../index.js';

import {blake2bHash} from './blake2b.js';

describe('blake2bHash', () => {
    it('computes the standard Blake2b-512 digest of the empty input', () => {
        // Act
        const digest = blake2bHash(64, undefined, undefined).digest();

        // Assert
        //
        // Official Blake2b test vector for the empty input at 64-byte output length.
        expect(bytesToHex(digest)).toBe(
            '786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419' +
                'd25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce',
        );
    });

    it('computes the standard Blake2b-256 digest of the empty input', () => {
        // Act
        const digest = blake2bHash(32, undefined, undefined).digest();

        // Assert
        //
        // Official Blake2b test vector for the empty input at 32-byte output length.
        expect(bytesToHex(digest)).toBe(
            '0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8',
        );
    });

    it('supports streaming updates', () => {
        // Act
        const oneShot = blake2bHash(32, undefined, undefined).update(UTF8.encode('abc')).digest();
        const streamed = blake2bHash(32, undefined, undefined)
            .update(UTF8.encode('a'))
            .update(UTF8.encode('bc'))
            .digest();

        // Assert
        expect(bytesToHex(streamed)).toBe(bytesToHex(oneShot));
    });

    it('derives distinct digests for distinct salts', () => {
        // Act
        const a = blake2bHash(32, undefined, {personal: '3ma-test', salt: 'a'}).digest();
        const b = blake2bHash(32, undefined, {personal: '3ma-test', salt: 'b'}).digest();

        // Assert
        expect(bytesToHex(a)).not.toBe(bytesToHex(b));
    });

    it('derives distinct digests for distinct personals', () => {
        // Act
        const a = blake2bHash(32, undefined, {personal: 'aaa', salt: 's'}).digest();
        const b = blake2bHash(32, undefined, {personal: 'bbb', salt: 's'}).digest();

        // Assert
        expect(bytesToHex(a)).not.toBe(bytesToHex(b));
    });

    it('is deterministic for the same parameters and input', () => {
        // Arrange
        const params = {personal: '3ma-call', salt: 'ic'} as const;

        // Act
        const a = blake2bHash(32, undefined, params)
            .update(Uint8Array.of(1, 2, 3))
            .digest();
        const b = blake2bHash(32, undefined, params)
            .update(Uint8Array.of(1, 2, 3))
            .digest();

        // Assert
        expect(bytesToHex(a)).toBe(bytesToHex(b));
    });

    it('hashes with a wrapped key (unwrapping it for the underlying implementation)', () => {
        // Regression test: the key is a wrapped `SecretKey`, not a raw `Uint8Array`. It must be
        // unwrapped before being handed to the underlying Blake2b implementation, otherwise the
        // implementation rejects it with "key must be Uint8Array or Buffer".

        // Arrange
        const key = wrapRawKey(new Uint8Array(32).fill(7), 32).asReadonly();

        // Act
        const keyed = blake2bHash(32, key, {personal: '3ma-mdev', salt: 'p'}).digest();
        const unkeyed = blake2bHash(32, undefined, {personal: '3ma-mdev', salt: 'p'}).digest();

        // Assert
        //
        // A keyed hash must differ from the unkeyed one and be the expected length.
        expect(keyed).toHaveLength(32);
        expect(bytesToHex(keyed)).not.toBe(bytesToHex(unkeyed));
    });

    it('is deterministic for the same wrapped key', () => {
        // Arrange
        const params = {personal: '3ma-mdev', salt: 'p'} as const;

        // Act
        const a = blake2bHash(
            32,
            wrapRawKey(new Uint8Array(32).fill(9), 32).asReadonly(),
            params,
        ).digest();
        const b = blake2bHash(
            32,
            wrapRawKey(new Uint8Array(32).fill(9), 32).asReadonly(),
            params,
        ).digest();

        // Assert
        expect(bytesToHex(a)).toBe(bytesToHex(b));
    });

    it('accepts pre-encoded Uint8Array personal and salt parameters', () => {
        // Arrange
        const personal = UTF8.encodeFullyInto('3ma-test', new Uint8Array(16)).array;
        const salt = UTF8.encodeFullyInto('s', new Uint8Array(16)).array;

        // Act
        const fromBytes = blake2bHash(32, undefined, {personal, salt}).digest();
        const fromStrings = blake2bHash(32, undefined, {personal: '3ma-test', salt: 's'}).digest();

        // Assert
        expect(bytesToHex(fromBytes)).toBe(bytesToHex(fromStrings));
    });

    it('throws if a Uint8Array personal parameter uses more than the first 8 bytes', () => {
        // Arrange
        const personal = new Uint8Array(16);
        personal[8] = 1;

        // Assert
        expect(() => blake2bHash(32, undefined, {personal, salt: new Uint8Array(16)})).toThrow(
            "Blake2b 'personal' too long",
        );
    });

    it('throws if the personal parameter exceeds 8 bytes', () => {
        // Assert
        expect(() => blake2bHash(32, undefined, {personal: '123456789', salt: 's'})).toThrow(
            "Blake2b 'personal' too long",
        );
    });

    it('throws if the salt parameter exceeds 8 bytes', () => {
        // Assert
        expect(() => blake2bHash(32, undefined, {personal: 'p', salt: '123456789'})).toThrow(
            "Blake2b 'salt' too long",
        );
    });
});
