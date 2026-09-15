/**
 * Fundamental types used by the generated protocol bindings.
 */
import type {ByteLengthEncoder} from '@threema/ts-utils/byte/byte-encoder';
import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

export type {u8} from '@threema/ts-utils/integer/u8';
export type {u16} from '@threema/ts-utils/integer/u16';
export type {u32} from '@threema/ts-utils/integer/u32';
export type {u53} from '@threema/ts-utils/integer/u53';
export type {u64} from '@threema/ts-utils/integer/u64';
export type {WeakOpaque} from '@threema/ts-utils/meta/newtype';
export type {
    ByteEncoder,
    ByteLengthEncoder,
    EncoderPick,
} from '@threema/ts-utils/byte/byte-encoder';
export type {BoundedIterable} from '@threema/ts-utils/array/bounded-iterable';

/**
 * An idempotent encoder to encode into bytes.
 */
export type LayerEncoder<T> = WeakOpaque<ByteLengthEncoder, {readonly Encoder: T}>;
