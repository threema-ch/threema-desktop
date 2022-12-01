import {type RawKey, type ReadonlyRawKey, NACL_CONSTANTS, wrapRawKey} from '~/common/crypto';
import {
    type Blake2b,
    createHash,
    PERSONALBYTES,
    SALTBYTES,
} from '~/common/crypto/blake2b/implementation';
import {type ReadonlyUint8Array, type u8, type u53} from '~/common/types';
import {UTF8} from '~/common/utils/codec';

/** Blake2b hash parameters */
export interface Blake2bParameters {
    /**
     * The 'personal' to use for hashing, usually for namespacing. Limited to 8 bytes for
     * compatibility with the high-level libsodium API.
     */
    readonly personal: Uint8Array | string;

    /**
     * The 'salt' to use for hashing, usually for deriving different. Limited to 8 bytes for
     * compatibility with the high-level libsodium API.
     */
    readonly salt: Uint8Array | string;
}

function encodeAndZeroPad(
    parameter: string | ReadonlyUint8Array | undefined,
    length: u53,
): ReadonlyUint8Array | undefined {
    if (typeof parameter === 'string') {
        return UTF8.encodeFullyInto(parameter, new Uint8Array(length)).array;
    }
    return parameter;
}

/**
 * Create a {@link Blake2b} hasher with the specified output {@link length}.
 *
 * The {@link key} and {@link parameters} are optional.
 */
export function hash(
    length: u8,
    key: ReadonlyRawKey | undefined,
    parameters: Blake2bParameters | undefined,
): Blake2b {
    // UTF-8 encode and zeropad 'personal' and 'salt', if necessary.
    const encoded = {
        personal: encodeAndZeroPad(parameters?.personal, PERSONALBYTES),
        salt: encodeAndZeroPad(parameters?.salt, SALTBYTES),
    } as const;

    // Ensure that 'personal' and 'salt' only use the first 8 bytes (i.e. the remaining bytes must
    // be zero-padding).
    if (encoded.personal?.subarray(8)?.some((byte) => byte !== 0) ?? false) {
        throw new Error("Blake2b 'personal' too long");
    }
    if (encoded.salt?.subarray(8)?.some((byte) => byte !== 0) ?? false) {
        throw new Error("Blake2b 'salt' too long");
    }

    // Create hash
    return createHash(
        length,
        key?.unwrap() ?? null,
        encoded.salt ?? null,
        encoded.personal ?? null,
    );
}

/**
 * Derive a secret key from another key using the Blake2b hash function.
 *
 * @param key They key to use for hashing.
 * @param parameters Blake2b hash parameters to be applied.
 * @returns a derived NaCl {@link RawKey}.
 * @throws {Error} If `personal` or `salt` are too long to be used.
 * @throws {EncodingError} If `personal` or `salt` could not be UTF-8 encoded.
 */
export function deriveKey(key: RawKey, parameters: Blake2bParameters): RawKey {
    // Derive and immediately tag as a raw secure secret key
    return wrapRawKey(hash(NACL_CONSTANTS.KEY_LENGTH, key.asReadonly(), parameters).digest());
}
