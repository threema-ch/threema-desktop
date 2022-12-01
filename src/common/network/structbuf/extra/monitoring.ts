// This file has been generated by structbuf. Do not modify it!
import * as base from '~/common/network/structbuf/base';
import type * as types from '~/common/types';

/**
 * ## Monitoring
 *
 * These structs can be used to monitor a network connection.
 */

/**
 * Contains a timestamp for RTT measurement by reflection.
 */
export interface RttMeasurementLike {
    /**
     * A Unix-ish timestamp in milliseconds (for start reference).
     */
    readonly timestamp: types.u64;
}

/**
 * Encodable of {@link RttMeasurementLike}.
 */
interface RttMeasurementEncodable_ {
    /**
     * 'timestamp' field value or encoder. See {@link RttMeasurementLike#timestamp} for
     * the field's description.
     */
    readonly timestamp: types.u64;
}

/**
 * New-type for RttMeasurementEncodable.
 */
export type RttMeasurementEncodable = types.WeakOpaque<
    RttMeasurementEncodable_,
    {readonly RttMeasurementEncodable: unique symbol}
>;

/** @inheritdoc */
export class RttMeasurement extends base.Struct implements RttMeasurementLike {
    private readonly _array: Uint8Array;
    private readonly _view: DataView;

    /**
     * Create a RttMeasurement from an array for accessing properties.
     *
     * Note: When accessing, attributes will be decoded on-the-fly which may be expensive.
     */
    private constructor(array: Uint8Array) {
        super();
        this._array = array;
        this._view = new DataView(array.buffer, array.byteOffset, array.byteLength);
    }

    /**
     * Decode a rtt-measurement struct from an array.
     *
     * @param array Array to decode from.
     * @returns RttMeasurement instance.
     */
    public static decode(array: Uint8Array): RttMeasurement {
        return new RttMeasurement(array);
    }

    /**
     * Encode a rtt-measurement struct into an array.
     *
     * @param struct RttMeasurementEncodable to encode.
     * @param array Array to encode into.
     * @returns A subarray of array containing the encoded struct.
     */
    public static encode(
        struct: types.EncoderPick<RttMeasurementEncodable, 'encode'>,
        array: Uint8Array,
    ): Uint8Array {
        const view = new DataView(array.buffer, array.byteOffset, array.byteLength);

        // Encode `timestamp`
        view.setBigUint64(0, struct.timestamp, true);

        return array.subarray(0, 8);
    }

    /**
     * Get the amount of bytes that would be written when encoding a rtt-measurement struct into an
     * array.
     *
     * @param struct RttMeasurementEncodable to encode.
     * @returns The amount of bytes that would be required to encode the struct.
     */
    public static byteLength(
        struct: types.EncoderPick<RttMeasurementEncodable, 'byteLength'>,
    ): types.u53 {
        return 8;
    }

    /**
     * 'timestamp' field accessor. See {@link RttMeasurementLike#timestamp} for the
     * field's description.
     */
    public get timestamp(): types.u64 {
        return this._view.getBigUint64(0, true);
    }

    /**
     * Create a snapshot of RttMeasurementLike.
     *
     * Note: This is **not** a deep-copy, so byte arrays will still be views of the underlying
     *       buffer.
     *
     * @returns RttMeasurementLike snapshot.
     */
    public snapshot(): RttMeasurementLike {
        return {
            timestamp: this.timestamp,
        };
    }

    /**
     * Create a clone of RttMeasurementLike.
     *
     * Note: This is a deep-copy that will copy the underlying buffer.
     *
     * @returns RttMeasurementLike clone.
     */
    public clone(): RttMeasurement {
        const array = new Uint8Array(this._array.byteLength);
        array.set(this._array);
        return new RttMeasurement(array);
    }
}
