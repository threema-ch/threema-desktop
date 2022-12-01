import {type ByteEncoder, type u53} from '~/common/types';

/**
 * A byte buffer claim.
 */
export class ByteBufferClaim {
    private readonly _end: (length: u53) => void;
    private _array?: Uint8Array;

    public constructor(array: Uint8Array, end: (length: u53) => void) {
        this._array = array;
        this._end = end;
    }

    /**
     * Claimed byte buffer sub-array.
     */
    public get array(): Uint8Array {
        if (!this._array) {
            throw new Error('Buffer claim already ended!');
        }
        return this._array;
    }

    /**
     * End the claim with the amount of bytes that have actually been used.
     *
     * @param length Amount of bytes used.
     */
    public end(length: u53): void {
        this._array = undefined;
        this._end(length);
    }
}

/**
 * Wrap an array to be used as a general purpose byte buffer.
 */
export class ByteBuffer {
    private readonly _array: Uint8Array;
    private _offset: u53 = 0;
    private _claim?: ByteBufferClaim;

    public constructor(array: Uint8Array) {
        this._array = array;
    }

    /**
     * Return the offset.
     */
    public get offset(): u53 {
        return this._offset;
    }

    /**
     * Reset the byte buffer. This will rewind the offset to `0` and end any remaining claims.
     */
    public reset(): this {
        // Bogus-fill in debug mode (with a debug-friendly '.')
        if (import.meta.env.DEBUG) {
            this._array.fill(0x2e);
        }

        // End claim (if any)
        if (this._claim) {
            this._claim.end(0);
        }
        this._claim = undefined;

        // Reset offset
        this._offset = 0;
        return this;
    }

    /**
     * Claim the remaining sub-array of the underlying byte buffer. Need to
     * call {@link ByteBufferClaim#end} to end the claim with the amount of
     * bytes that have actually been used.
     *
     * @returns A byte buffer claim.
     * @throws {Error} If the buffer is already claimed.
     */
    public claim(): ByteBufferClaim {
        // Ensure there is no claim
        if (this._claim) {
            throw new Error('Cannot claim buffer as it is already claimed!');
        }

        // Create and return claim
        this._claim = new ByteBufferClaim(
            this._array.subarray(this._offset),
            (length) => (this._claim = undefined),
        );
        return this._claim;
    }

    /**
     * Return a non-overlapping sub-array from the current offset with the requested length.
     *
     * @param length Byte length of the resulting array.
     * @returns A sub-array with the requested byte length.
     * @throws {Error} If the buffer is claimed.
     * @throws {Error} If the requested length is longer than the available array size.
     */
    public bytes(length: u53): Uint8Array {
        // Ensure there is no claim
        if (this._claim) {
            throw new Error('Cannot create sub-array, buffer is claimed!');
        }

        // Create sub-array
        const array = this._array.subarray(this._offset, this._offset + length);
        if (array.byteLength !== length) {
            throw new Error(
                `Could not create sub-array, length exhausted (remaining=${
                    this._array.byteLength - this._offset
                }, requested=${length})`,
            );
        }

        // Update offset
        this._offset += length;

        // Return sub-array
        return array;
    }

    /**
     * Run an encoder that will get the remaining sub-array of the underlying byte buffer. The
     * encoder needs to return a sub-array that represents the array that has been actually used.
     *
     * @throws {Error} If the buffer is claimed.
     */
    public with(encoder: ByteEncoder): Uint8Array {
        // Ensure there is no claim
        if (this._claim) {
            throw new Error('Cannot run consumer with sub-array, buffer is claimed!');
        }

        // Run consumer, update offset and return the consumer's result
        const result = encoder(this._array.subarray(this._offset));
        this._offset += result.byteLength;
        return result;
    }

    /**
     * Copy the given array into the underlying byte buffer and return the sub-array region the
     * array has been copied into.
     *
     * @param array The array to be copied.
     * @returns A sub-array with a copy of the array.
     */
    public copy(array: Uint8Array): Uint8Array {
        const copy = this.bytes(array.byteLength);
        copy.set(array);
        return copy;
    }
}
