import {type CryptoBackend} from '~/common/crypto';
import {randomPkcs7PaddingLength} from '~/common/crypto/random';
import {type LayerEncoder} from '~/common/network/protocol';
import {
    type Bare,
    type ByteLengthEncoder,
    type EncoderPick,
    type OpaquePick,
    type u8,
    type u53,
    type WeakOpaque,
} from '~/common/types';
import {bytePadPkcs7} from '~/common/utils/byte';

/**
 * Structbuf-compatible encoder codec.
 */
interface StructEncoder<T> {
    byteLength: (struct: EncoderPick<T, 'byteLength'>) => u53;
    encode: (struct: EncoderPick<T, 'encode'>, array: Uint8Array) => Uint8Array;
}

/**
 * Creates an encoder for a struct and binds the structs data.
 *
 * This encoder type allows to request the byte length of the resulting struct.
 * Note that this **may** be an expensive operation. Encoding directly into a
 * large buffer is preferred.
 *
 * @param struct Struct to be encoded.
 * @param data Struct data to be encoded.
 * @returns An encoder.
 */
export function encoder<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends WeakOpaque<Record<keyof any, any>, unknown>,
>(struct: StructEncoder<T>, data: Bare<T>): LayerEncoder<T> {
    return {
        byteLength: () => struct.byteLength(data),
        encode: (array) => struct.encode(data, array),
    } as LayerEncoder<T>;
}

/**
 * Creates a byte encoder for a struct and binds the structs data.
 *
 * @param struct Struct to be encoded.
 * @param data Struct data to be encoded.
 * @returns A byte encoder.
 */
export function byteEncoder<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends WeakOpaque<Record<keyof any, any>, unknown>,
>(
    struct: StructEncoder<T>,
    data: EncoderPick<Bare<T>, 'encode'>,
): OpaquePick<LayerEncoder<T>, 'encode'> {
    return {
        encode: (array) => struct.encode(data, array),
    } as OpaquePick<LayerEncoder<T>, 'encode'>;
}

/**
 * Encoder that adds PKCS#7 padding to source data.
 *
 * The padding will be calculated **once** and remains the same for subsequent calls to either of
 * the encoder functions.
 *
 * This encoder type allows to request the byte length of the resulting struct. Note that this
 * **may** be an expensive operation an encoder has been provided. Encoding directly into a large
 * buffer is preferred.
 */
export function pkcs7PaddedEncoder(
    crypto: Pick<CryptoBackend, 'randomBytes'>,
    minTotalLength: u8,
    dataOrEncoder: Uint8Array | ByteLengthEncoder,
): ByteLengthEncoder {
    let paddingLength: u53 | undefined;
    return {
        byteLength: () => {
            const byteLength =
                dataOrEncoder instanceof Uint8Array
                    ? dataOrEncoder.byteLength
                    : dataOrEncoder.byteLength();
            paddingLength ??= randomPkcs7PaddingLength(crypto, {
                currentLength: byteLength,
                minTotalLength,
            });
            return byteLength + paddingLength;
        },
        encode: (array) => {
            let offset;
            if (dataOrEncoder instanceof Uint8Array) {
                array.set(dataOrEncoder);
                offset = dataOrEncoder.byteLength;
            } else {
                offset = dataOrEncoder.encode(array).byteLength;
            }
            paddingLength ??= randomPkcs7PaddingLength(crypto, {
                currentLength: offset,
                minTotalLength,
            });
            offset += bytePadPkcs7(array.subarray(offset), paddingLength).byteLength;
            return array.subarray(0, offset);
        },
    };
}
