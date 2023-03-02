import type * as v from '@badrap/valita';
import type Long from 'long';
import {Writer} from 'protobufjs/minimal';

import {type LayerEncoder} from '~/common/network/protocol';
import {type Bare, type OpaquePick, type TagOf, type u53, type WeakOpaque} from '~/common/types';

import type * as tag from './tag';

type ProtobufProperty<T> = T extends
    | boolean
    | string
    // eslint-disable-next-line no-restricted-syntax
    | number
    | Long
    | Uint8Array
    | readonly unknown[]
    ? T
    : WeakOpaque<T, tag.ProtobufMessage> | undefined;

/**
 * Ensures that the provided properties shallowly matches the protobuf message interface.
 */
type ProtobufProperties<T> = {
    [K in keyof Required<T>]: ProtobufProperty<T[K]>;
};

/**
 * Protobuf-compatible constructor.
 */
export interface ProtobufConstructor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encode: (message: any, writer?: Writer) => Writer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (properties: any, ...rest: never[]): any;
}

/**
 * Inferred encodable of a {@link ProtobufConstructor}.
 */
type ProtobufEncodableOf<T extends ProtobufConstructor> = Parameters<T['encode']>[0];

/**
 * Ensures that all properties of a protobuf message are declared explicitly, even if they may be
 * undefined.
 *
 * Note: This intentionally does not match tagged protobuf message instances.
 */
type EntireProtobufPropertiesOf<TProto extends ProtobufConstructor> = ProtobufProperties<
    Bare<ProtobufEncodableOf<TProto>>
>;

/**
 * Tagged instance of a protobuf message where all properties have been explicitly defined.
 */
export type ProtobufInstanceOf<TProto extends ProtobufConstructor> = WeakOpaque<
    InstanceType<TProto>,
    TagOf<ProtobufEncodableOf<TProto>>
>;

/**
 * Tagged instance of a protobuf repeated message where all properties have been explicitly defined.
 */
export type ProtobufArrayInstanceOf<TProto extends ProtobufConstructor> = WeakOpaque<
    InstanceType<TProto>[],
    TagOf<ProtobufEncodableOf<TProto>>
>;

function createInPlaceWriter(array: Uint8Array): Writer {
    class InPlaceWriter extends Writer {
        /**
         * Creates a view on top of the underlying array for the specified size.
         * @param size Requested buffer size.
         * @returns The underlying buffer view.
         * @throws {Error} in case the underlying buffer is too small.
         */
        public static alloc(size: u53): Uint8Array {
            if (size > array.byteLength) {
                throw new Error(
                    `Underlying buffer too small for protobuf message of length ${size}`,
                );
            }
            return array.subarray(0, size);
        }
    }
    return new InPlaceWriter();
}

/**
 * Creates an encoder for a protobuf message and binds the protobuf's message data.
 *
 * This encoder type allows to request the byte length of the resulting message. Note that even
 * though the encoded data is cached, this **may** be an expensive operation. Encoding directly into
 * a large buffer is preferred.
 *
 * @param protobuf Protobuf message to be encoded.
 * @param data Protobuf message instance or property tuple.
 * @returns An encoder.
 */
export function encoder<TProto extends ProtobufConstructor>(
    protobuf: TProto,
    data: ProtobufInstanceOf<TProto> | EntireProtobufPropertiesOf<TProto>,
): LayerEncoder<ProtobufEncodableOf<TProto>> {
    let encoded: Uint8Array | undefined;
    function encode(array: Uint8Array | undefined): Uint8Array {
        if (array === undefined) {
            // Check if we calculcated the byte length before. If so, we just return the same
            // temporary buffer again.
            if (encoded !== undefined) {
                return encoded;
            }

            // We never calculcated the byte length, so we encode the data into a temporary buffer.
            encoded = protobuf.encode(data).finish();
            return encoded;
        } else {
            // Check if we calculcated the byte length before. If so, we need to copy the data from
            // the temporary buffer and return the written subarray.
            if (encoded !== undefined) {
                array.set(encoded);
                return array.subarray(0, encoded.byteLength);
            }

            // We never calculcated the byte length, so we encode the data directly into the final
            // buffer.
            return protobuf.encode(data, createInPlaceWriter(array)).finish();
        }
    }

    return {
        byteLength: () => encode(undefined).byteLength,
        encode,
    } as LayerEncoder<ProtobufEncodableOf<TProto>>;
}

/**
 * Creates a byte encoder for a protobuf message and binds the protobuf's message data.
 *
 * Prefer this over {@link encoder} if you just need a {@link ByteEncoder} and not a
 * {@link ByteLengthEncoder}.
 *
 * @param protobuf Protobuf message to be encoded.
 * @param data Protobuf message instance or property tuple.
 * @returns A byte encoder.
 */
export function byteEncoder<TProto extends ProtobufConstructor>(
    protobuf: TProto,
    data: ProtobufInstanceOf<TProto> | EntireProtobufPropertiesOf<TProto>,
): OpaquePick<LayerEncoder<ProtobufEncodableOf<TProto>>, 'encode'> {
    return {
        encode: (array) => protobuf.encode(data, createInPlaceWriter(array)).finish(),
    } as OpaquePick<LayerEncoder<ProtobufEncodableOf<TProto>>, 'encode'>;
}

/**
 * Validate input data for a protobuf message and construct it.
 *
 * This prevents property mismatches due to typos or when a property has been renamed in the
 * protocol.
 *
 * IMPORTANT: This only inspects the provided object on the first level!
 */
export function creator<TProto extends ProtobufConstructor>(
    protobuf: TProto,
    data: readonly EntireProtobufPropertiesOf<TProto>[],
): ProtobufArrayInstanceOf<TProto>;
export function creator<TProto extends ProtobufConstructor>(
    protobuf: TProto,
    data: EntireProtobufPropertiesOf<TProto>,
): ProtobufInstanceOf<TProto>;

export function creator<TProto extends ProtobufConstructor>(
    protobuf: TProto,
    data: unknown,
): unknown {
    return data;
}

/**
 * Create a valita object schema for a protobuf message, guaranteeing that the schema parses all
 * properties available on the protobuf message.
 *
 * This prevents property mismatches due to typos or when a property has been renamed in the
 * protocol.
 *
 * IMPORTANT: This only inspects the provided object on the first level!
 */
export function validator<
    TProto extends ProtobufConstructor,
    TSchema extends
        | v.ObjectType<{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [K in keyof Required<NonNullable<ConstructorParameters<TProto>[0]>>]: any;
          }>
        | v.Type<{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [K in keyof Required<NonNullable<ConstructorParameters<TProto>[0]>>]: any;
          }>
        | {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [K in keyof Required<NonNullable<ConstructorParameters<TProto>[0]>>]: any;
          },
>(protobuf: TProto, schema: TSchema): TSchema {
    return schema;
}
