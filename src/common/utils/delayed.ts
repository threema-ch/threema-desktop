import {TransferTag} from '~/common/enum';
import {BaseError, type BaseErrorOptions} from '~/common/error';
import {TRANSFER_HANDLER} from '~/common/index';
import {unreachable} from '~/common/utils/assert';
import {registerErrorTransferHandler} from '~/common/utils/endpoint';

const UNSET = Symbol('unset');

type DelayedErrorType = 'get' | 'set';

const DELAYED_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    DelayedError,
    TransferTag.DELAYED_ERROR,
    [type: DelayedErrorType, title: string]
>({
    tag: TransferTag.DELAYED_ERROR,
    serialize: (error) => [error.type, error.title],
    deserialize: (message, cause, [type, title]) => new DelayedError(type, title, {from: cause}),
});

/**
 * Error when unwrapping too early or setting a {@link Delayed} more than once.
 */
export class DelayedError extends BaseError {
    public [TRANSFER_HANDLER] = DELAYED_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: DelayedErrorType,
        public readonly title: string,
        options?: BaseErrorOptions,
    ) {
        let message;
        switch (type) {
            case 'get':
                message = `Delayed '${title}' not yet set`;
                break;
            case 'set':
                message = `Delayed '${title}' already set`;
                break;
            default:
                unreachable(type);
        }
        super(message, options);
    }
}

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
     * @param name Function that returns the error thrown when calling unwrap() before the
     *   value is set.
     * @param createSetError Function that returns the error thrown when calling set() more than
     *   once.
     */
    public constructor(createGetError: () => E, createSetError: () => E) {
        this._createGetError = createGetError;
        this._createSetError = createSetError;
    }

    /**
     * Create a new {@link Delayed} instance with static error messages of type {@link DelayedError}
     *
     * @param title Title to be used when throwing an error via {@link DelayedError}.
     * @param value If defined, it will be used to immediately set the delayed value.
     */
    public static simple<T>(title: string, value?: T): Delayed<T> {
        const delayed = new Delayed<T>(
            () => new DelayedError('get', title),
            () => new DelayedError('set', title),
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
