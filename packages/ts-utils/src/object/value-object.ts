/**
 * Wrap a primitive in a object to allow keeping references.
 */
export class ValueObject<TValue> implements ReadonlyValueObject<TValue> {
    public constructor(public value: TValue) {}
}

/**
 * Readonly interface to {@link ValueObject}.
 *
 * Note that this just makes the held value readonly (i.e. the primitive or reference, if value is
 * an object, its properties may still be writable.)
 */
export interface ReadonlyValueObject<TValue> {
    readonly value: TValue;
}
