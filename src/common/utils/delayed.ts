const UNSET = Symbol('unset');

/**
 * Represents an optional value that can be set at a later stage.
 */
export class Delayed<T, E extends Error = Error> {
    private readonly _createGetError: () => E;
    private readonly _createSetError: () => E;
    private _value: T | typeof UNSET = UNSET;

    /**
     * Create a new Delayed instance.
     *
     * @param createGetError Function that returns the error thrown when calling unwrap() before the
     *   value is set.
     * @param createSetError Function that returns the error thrown when calling set() more than
     *   once.
     */
    public constructor(createGetError: () => E, createSetError: () => E) {
        this._createGetError = createGetError;
        this._createSetError = createSetError;
    }

    /**
     * Create a new {@link Delayed} instance with static error messages of type {@link Error}.
     *
     * If {@link value} is not undefined, then it will be used to immediately set the delayed value.
     */
    public static simple<T>(
        getErrorMessage: string,
        setErrorMessage: string,
        value?: T,
    ): Delayed<T> {
        const delayed = new Delayed<T>(
            () => new Error(getErrorMessage),
            () => new Error(setErrorMessage),
        );
        if (value !== undefined) {
            delayed.set(value);
        }
        return delayed;
    }

    /**
     * Return whether or not the inner value has been set.
     */
    public isSet(): boolean {
        return this._value !== UNSET;
    }

    /**
     * Return the optional value or throw an error if the inner value is not available.
     *
     * @throws In case the inner value has not been set, yet.
     * @returns The inner value.
     */
    public unwrap(): T {
        if (this._value === UNSET) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw this._createGetError();
        }
        return this._value;
    }

    /**
     * Set the inner value.
     *
     * @param value The inner value.
     * @throws In case the inner value has already been set.
     */
    public set(value: T): void {
        if (this._value !== UNSET) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw this._createSetError();
        }
        this._value = value;
    }
}
