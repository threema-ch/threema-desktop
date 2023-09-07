import {type u32, type u53, type u64} from '~/common/types';

/**
 * A generic 64-bit unsigned sequence number. Prevents wrapping.
 */
export class SequenceNumberU64<SNV extends u64> {
    private static readonly _MAX_VALUE = 2n ** 64n - 1n;
    private _value: u64;

    public constructor(start: u64) {
        this._value = start;
    }

    /**
     * Return the next sequence number (i.e. the current value plus one).
     * Increases the internal value by one.
     */
    public next(): SNV {
        if (this._value === SequenceNumberU64._MAX_VALUE) {
            throw new Error('Sequence number would overflow');
        }
        this._value += 1n;
        return this._value as SNV;
    }
}

/**
 * A generic unsigned sequence number in the range of 0 to 2**53 - 1.
 * Prevents wrapping.
 */
class SequenceNumberUXX<SNV extends u53> {
    private _value: u53;

    public constructor(
        start: SNV,
        private readonly _maxValue: SNV,
    ) {
        this._value = start;
    }

    /**
     * Return the current sequence number.
     */
    public get current(): SNV {
        return this._value as SNV;
    }

    /**
     * Return the next sequence number (i.e. the current value plus one).
     * Increases the internal value by one.
     */
    public next(): SNV {
        if (this._value === this._maxValue) {
            throw new Error('Sequence number would overflow');
        }
        this._value += 1;
        return this._value as SNV;
    }
}

/**
 * A generic 53-bit unsigned sequence number. Prevents wrapping.
 */
export class SequenceNumberU53<SNV extends u53> extends SequenceNumberUXX<SNV> {
    public constructor(start: SNV) {
        super(start, (2 ** 53 - 1) as SNV);
    }
}

/**
 * A generic 32-bit unsigned sequence number. Prevents wrapping.
 */
export class SequenceNumberU32<SNV extends u32> extends SequenceNumberUXX<SNV> {
    public constructor(start: SNV) {
        super(start, (2 ** 32 - 1) as SNV);
    }
}
