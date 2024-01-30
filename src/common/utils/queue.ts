import type {u53} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {type QueryablePromise, ResolvablePromise} from '~/common/utils/resolvable-promise';

export interface QueueValue<V> {
    value: V;

    /**
     * Consume the value with an optional executor. This ensures that the value
     * is only consumed if the executor ran successfully. Any exception thrown
     * is forwarded to the caller and prevents consuming the value.
     */
    consume: (<T>(executor: (value: V) => T) => T) & (() => V);
}

export interface QueueProducer<V, E extends Error = Error> {
    put: (value: V) => Promise<void>;
    error: (reason: E) => void;
}

export interface QueueConsumer<V, E extends Error = Error> {
    get: () => Promise<QueueValue<V>>;
    error: (reason: E) => void;
}

export class Queue<V, E extends Error = Error> {
    private readonly _error: ResolvablePromise<never, E>;
    private _promise: ResolvablePromise<[value: V, promise: ResolvablePromise<void>]>;

    public constructor() {
        this._error = new ResolvablePromise();
        this._promise = new ResolvablePromise();
    }

    public get aborted(): QueryablePromise<never, E> {
        return this._error;
    }

    public get empty(): boolean {
        return !this._error.done && !this._promise.done;
    }

    public async put(value: V): Promise<void> {
        // Wait for the pending value to be consumed, if any
        while (this._promise.done) {
            const [, consumed] = await this._promise; // Resolves immediately
            await Promise.race([this._error, consumed]);
        }

        // Bubble any error
        if (this._error.done) {
            await this._error;
        }

        // Resolve
        this._promise.resolve([value, new ResolvablePromise()]);
    }

    public async get(): Promise<QueueValue<V>> {
        // Await the produced value
        const [value, consumed] = await Promise.race([this._error, this._promise]);

        // Let the value be consumed from the outside
        return {
            value,
            consume: <T>(executor?: (value: V) => T): T => {
                if (consumed.done) {
                    throw new Error('Value can only be consumed once!');
                }

                // Run the executor, if any
                const result = executor !== undefined ? executor(value) : value;

                // Consume the value and replace the promise
                consumed.resolve();
                this._promise = new ResolvablePromise();
                return result as T;
            },
        };
    }

    /**
     * Move the queue into an error state. Any further put or get operations
     * will then raise this error.
     *
     * Subsequent calls to this will be ignored.
     */
    public error(reason: E): void {
        if (this._error.done) {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        this._error.reject(reason);
    }
}

export class UnboundedQueue<V, E extends Error = Error> {
    private readonly _waiters: {
        readonly error: ResolvablePromise<never>;
        get: ResolvablePromise<void>;
    };
    private _values: [value: V, promise: ResolvablePromise<void>][];
    private _error?: E;

    public constructor(values?: readonly V[]) {
        this._waiters = {
            error: new ResolvablePromise(),
            get: new ResolvablePromise(),
        };
        this._values = (values ?? []).map((value) => [value, new ResolvablePromise()]);
        if (this._values.length > 0) {
            this._waiters.get.resolve();
        }
    }

    public get aborted(): Promise<never> {
        return this._waiters.error;
    }

    public get empty(): boolean {
        return this._error === undefined && !this._waiters.get.done;
    }

    public get length(): u53 {
        return this._values.length;
    }

    public all(): V[] {
        return this._values.map(([value]) => value);
    }

    public prepend(queue: UnboundedQueue<V, E>): void {
        // Bubble any error
        if (this._error !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw this._error;
        }

        // Prepend all values from the other queue
        if (!queue.empty) {
            this._values = [...queue._values, ...this._values];
            queue._values = [];
            this._waiters.get.resolve();
        }
    }

    public put(value: V): void {
        // Bubble any error
        if (this._error !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw this._error;
        }

        // Add the value to the array and let any waiter know
        this._values.push([value, new ResolvablePromise()]);
        this._waiters.get.resolve();
    }

    public async get(): Promise<QueueValue<V>> {
        for (;;) {
            // Await a value, bubble any error
            await Promise.race([this._waiters.error, this._waiters.get]);
            const [current] = this._values;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (current === undefined) {
                continue;
            }
            const [value, consumed] = current;

            // Let the value be consumed from the outside
            return {
                value,
                consume: <T>(executor?: (value: V) => T): T => {
                    if (consumed.done) {
                        throw new Error('Value can only be consumed once!');
                    }

                    // Run the executor, if any
                    const result = executor !== undefined ? executor(value) : value;

                    // Consume the value and remove it from the slot
                    assert(
                        current === this._values.shift(),
                        'Expected current value to be the first in line in queue',
                    );
                    consumed.resolve();

                    // Replace the waiter, if needed
                    if (this._values.length === 0) {
                        assert(this._waiters.get.done, 'Expected queue waiter to be done');
                        this._waiters.get = new ResolvablePromise();
                    }
                    return result as T;
                },
            };
        }
    }

    /**
     * Move the queue into an error state. Any further put or get operations
     * will then raise this error.
     *
     * Subsequent calls to this will be ignored.
     */
    public error(reason: E): void {
        if (this._error !== undefined) {
            return;
        }
        this._error = reason;
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        this._waiters.error.reject(reason);
    }
}
