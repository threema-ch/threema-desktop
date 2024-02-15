/**
 * Types defined here are fundamental and used throughout for the whole
 * project.
 */

/* eslint-disable @typescript-eslint/naming-convention, no-restricted-syntax */
// Unsigned and signed integer hint types.
//
// Note: These do not require explicit casting as that would be annoying when
//       doing math operations due to the lack of operator type overloading.
export type u8 = number;
export type i8 = number;
export type u16 = number;
export type i16 = number;
export type u32 = number;
export type i32 = number;
export type u53 = number;
export type i53 = number;
export type u64 = bigint;
export type i64 = bigint;
export type ubig = bigint;
export type ibig = bigint;
export type f64 = number;
/* eslint-enable @typescript-eslint/naming-convention, no-restricted-syntax */

/**
 * Type guard for {@link u8}.
 */
export function isU8(val: unknown): val is u8 {
    return typeof val === 'number' && Number.isInteger(val) && val >= 0 && val <= 255;
}

/**
 * Ensure value is a valid number in the {@link u8} range.
 */
// eslint-disable-next-line no-restricted-syntax
export function ensureU8(val: unknown): u8 {
    if (!isU8(val)) {
        throw new Error(`Value ${val} is not a valid unsigned byte (type is ${typeof val})`);
    }
    return val;
}

/**
 * Type guard for {@link u53}.
 */
export function isU53(val: unknown): val is u53 {
    return (
        typeof val === 'number' &&
        Number.isInteger(val) &&
        val >= 0 &&
        val <= Number.MAX_SAFE_INTEGER
    );
}

/**
 * Ensure value is a valid {@link u53}.
 */
// eslint-disable-next-line no-restricted-syntax
export function ensureU53(val: unknown): u53 {
    if (!isU53(val)) {
        throw new Error(`Value ${val} is not a valid integer in the u53 range`);
    }
    return val;
}

/**
 * Convert a u64 to a 53. Throw if the value is out of range.
 */
export function u64ToU53(val: u64): u53 {
    if (val < 0 || val > Number.MAX_SAFE_INTEGER) {
        throw new Error(`Value ${val} is not a valid integer in the u53 range`);
    }
    return Number(val);
}

/**
 * Type guard for {@link u64}.
 */
export function isU64(val: unknown): val is u64 {
    return typeof val === 'bigint' && val >= 0n && val < 2n ** 64n;
}

/**
 * Ensure value is a valid {@link u64}.
 */
// eslint-disable-next-line no-restricted-syntax
export function ensureU64(val: unknown): u64 {
    if (!isU64(val)) {
        throw new Error(`Value ${val} is not a valid integer in the u64 range`);
    }
    return val;
}

/**
 * Type guard for {@link f64}.
 */
export function isF64(val: unknown): val is f64 {
    return typeof val === 'number';
}

/**
 * Pick all keys of T where the value matches U.
 */
export type PickKeysForType<T, U> = {
    [P in keyof T]: T[P] extends U ? P : never;
}[keyof T];

// Taken from https://github.com/Microsoft/TypeScript/issues/4895
// Refinements inspired by https://github.com/gcanti/newtype-ts

/**
 * A generic tag.
 */
export interface OpaqueTag<UID> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    readonly __TAG__: UID;
}

/**
 * New-type with implicit conversion to the underlying type allowed.
 */
export type WeakOpaque<T, UID> = T & OpaqueTag<UID>;

/**
 * Retrieve the tag type from a new-type.
 */
export type TagOf<T> = [type: T] extends [newType: WeakOpaque<unknown, infer I>] ? I : never;

/**
 * Remove the new-type from a type. If the type is an object, it removes
 * all new-type properties of the object as well.
 */
export type Bare<T> =
    T extends WeakOpaque<infer I, TagOf<T>>
        ? I
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          T extends Record<keyof any, unknown>
          ? {[K in Exclude<keyof T, keyof OpaqueTag<unknown>>]: Bare<T[K]>}
          : never;

/**
 * Remove the new-type from a type. If the type is an object, it removes
 * all new-type properties of the object as well.
 */
export type BareFromTag<T, TOpaque extends OpaqueTag<unknown>> =
    T extends WeakOpaque<infer I, TagOf<TOpaque>>
        ? I
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          T extends Record<any, any>
          ? {[K in Exclude<keyof T, keyof OpaqueTag<unknown>>]: BareFromTag<T[K], TOpaque>}
          : T;

/**
 * From a new-type object T, pick a set of properties by its keys K.
 */
export type OpaquePick<T extends WeakOpaque<unknown, TagOf<T>>, K extends keyof T> = Pick<
    T,
    K | keyof OpaqueTag<unknown>
>;

/**
 * From object T, make all properties K mutable.
 *
 * If K is not supplied, this is the inverse of {@link Readonly}.
 */
export type Mutable<T, K extends keyof T = keyof T> = Omit<T, K> & {-readonly [P in K]: T[P]};

// eslint-disable-next-line @typescript-eslint/ban-types, no-restricted-syntax
export type Primitive = undefined | null | boolean | string | number | bigint;

/**
 * Transform each Y of T (being an object or tuple) into X depending on the
 * mode M.
 */
type IntoXIfYMap<T, Y, M extends 'args' | 'args+return', X> = {
    readonly [K in keyof T]: IntoXIfY<T[K], Y, M, X>;
};

/**
 * Transform each Y of T into X depending on the mode M.
 *
 * This allows to find and replace field and function (argument and return)
 * types on an interface.
 */
type IntoXIfY<T, Y, M extends 'args' | 'args+return', X> = T extends Y
    ? X
    : T extends Primitive | IterableIterator<unknown>
      ? T
      : T extends (...args: infer A) => infer R
        ? (
              ...args: M extends 'args' | 'args+return' ? IntoXIfYMap<A, Y, M, X> : A
          ) => M extends 'args+return' ? IntoXIfY<R, Y, M, X> : R
        : IntoXIfYMap<T, Y, M, X>;

/**
 * Uint8Array methods that do not modify the underlying data including those
 * that return views into the data.
 */
type ReadonlyUint8ArrayMethods = Pick<
    Uint8Array,
    // From lib.es5.d.ts
    | 'BYTES_PER_ELEMENT'
    | 'byteLength'
    | 'byteOffset'
    | 'every'
    | 'find'
    | 'findIndex'
    | 'forEach'
    | 'indexOf'
    | 'join'
    | 'lastIndexOf'
    | 'length'
    | 'some'
    | 'subarray'
    | 'toLocaleString'
    | 'toString'
    // From lib.es2015.iterable.d.ts
    | 'entries'
    | 'keys'
    | 'values'
    // From lib.es2016.array.include.d.ts
    | 'includes'
>;

/**
 * Uint8Array methods that do not modify the underlying data and return a
 * copy of the (mutated) data.
 */
type CopyUint8ArrayMethods = Pick<
    Uint8Array,
    // From lib.es5.d.ts
    'filter' | 'map' | 'slice'
>;

/**
 * A read-only {@link Uint8Array}.
 */
export type ReadonlyUint8Array = {
    readonly [K in keyof ReadonlyUint8ArrayMethods]: IntoXIfY<
        ReadonlyUint8ArrayMethods[K],
        Uint8Array,
        'args+return',
        ReadonlyUint8Array
    >;
} & {
    readonly [K in keyof CopyUint8ArrayMethods]: IntoXIfY<
        CopyUint8ArrayMethods[K],
        Uint8Array,
        'args',
        ReadonlyUint8Array
    >;
} & {
    /* eslint-disable no-restricted-syntax,@typescript-eslint/member-ordering */
    // From lib.es5.d.ts
    readonly [index: number]: number;
    readonly valueOf: () => Uint8Array;
    reduce: <U>(
        callbackfn: (
            previousValue: U,
            currentValue: number,
            currentIndex: number,
            array: ReadonlyUint8Array,
        ) => U,
        initialValue: U,
    ) => U;
    reduceRight: <U>(
        callbackfn: (
            previousValue: U,
            currentValue: number,
            currentIndex: number,
            array: ReadonlyUint8Array,
        ) => U,
        initialValue: U,
    ) => U;
    // From lib.es2015.iterable.d.ts
    readonly [Symbol.iterator]: () => IterableIterator<u8>;
    // From lib.es2015.symbol.wellknown.d.ts
    readonly [Symbol.toStringTag]: 'Uint8Array';
    /* eslint-enable no-restricted-syntax,@typescript-eslint/member-ordering */
};

/**
 * A generic byte encoder, storing bytes inside a sub-array.
 *
 * The returned array **must** be a sub-array and point into a portion of the
 * given array! It **must** have the same starting offset as the given array
 * as many of our APIs depend on it!
 */
export type ByteEncoder = (array: Uint8Array) => Uint8Array;

/**
 * A generic byte encoder that also supplies an additional function to query the
 * resulting byte length of the encoded data.
 */
export interface ByteLengthEncoder {
    /**
     * Retrieve the amount of bytes that would be written in case
     * {@link ByteLengthEncoder#encode} were called.
     */
    byteLength: () => u53;

    /**
     * Encode the data in the supplied array. See {@link ByteEncoder}.
     */
    encode: ByteEncoder;
}

/**
 * From T, pick a set of encoder properties and leave the rest as is.
 * See {@link ByteLengthEncoder} on which properties can be picked.
 */
export type EncoderPick<T, P extends keyof ByteLengthEncoder> = {
    [K in keyof T]: T[K] extends Uint8Array | ByteLengthEncoder
        ? Uint8Array | Pick<ByteLengthEncoder, P>
        : T[K];
};

/**
 * Finite iterable with a specific length.
 */
export interface BoundedIterable<T> extends Iterable<T> {
    /**
     * The amount of items the iterable yields.
     */
    length: u53;
}

/**
 * Definition of possible icon sets.
 */
export type IconSet = 'md-icon' | 'threema-icon';

/**
 * This type allows to verify at compile time that `TPartial` contains only properties from type
 * `T`, all optional. It's similar to recursively applying {@link Partial} while ensuring that no
 * extra keys are present.
 */
export type StrictPartial<TPartial, T extends TPartial> = TPartial extends object
    ? {
          [P in keyof TPartial]?: P extends keyof TPartial
              ? StrictPartial<TPartial[P], T[P]>
              : never;
      }
    : TPartial;

/**
 * Like {@link Extract} but ensures that all types provided in the union type U exist in type T.
 */
export type StrictExtract<T, U extends T> = Extract<T, U>;

/**
 * Like {@link Omit} but ensures that all keys provided in the union type U are keys of T.
 */
export type StrictOmit<T, U extends keyof T> = Omit<T, U>;

/**
 * A tuple containing `T` exactly `N` times.
 */
export type RepeatedTuple<T, N extends u53, R extends readonly T[] = []> = R['length'] extends N
    ? R
    : // eslint-disable-next-line no-restricted-syntax
      RepeatedTuple<T, N, readonly [T, ...R]>;

export interface DomainCertificatePin {
    /** The domain the certificates belong to (e.g. `*.example.com`). */
    readonly domain: string;

    /**
     * The SPKI fingerprints (SHA-256-hashed and Base64-encoded public keys) of the certificates
     * that are whitelisted for the specified `domain`.
     */
    readonly fingerprints: string[];
}

/**
 * Dimensions (height and width) of a 2D object.
 */
export interface Dimensions {
    readonly height: u53;
    readonly width: u53;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const KiB = 1024;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const MiB = 1024 * KiB;

/**
 * Represents a union of the `string` type with additional string literals while retaining all type
 * information (i.e., preventing it from collapsing the union into `string` and erasing the string
 * literals).
 *
 * @example
 * ```ts
 * type Example1 = string | "foo" | "bar" // string
 * type Example2 = StringOrLiteral<"foo" | "bar"> // string | "foo" | "bar"
 * ```
 */
export type StringOrLiteral<T extends string> = (string & NonNullable<unknown>) | T;
