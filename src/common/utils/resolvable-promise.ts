import {ensureError, unreachable} from '~/common/utils/assert';

export interface PromiseFn<V, E extends Error = Error> {
    resolve: (value: V) => void;
    reject: (reason: E) => void;
}

/**
 * Current state of a QueryablePromise.
 */
export type QueryablePromiseState<V, E extends Error = Error> =
    | {readonly type: 'pending'}
    | {readonly type: 'resolved'; readonly result: V}
    | {readonly type: 'rejected'; readonly result: E};

/**
 * A {Promise} that allows to query the current status.
 */
export interface QueryablePromise<V, E extends Error = Error> extends Promise<V> {
    readonly done: boolean;
    readonly state: QueryablePromiseState<V, E>;
}

/**
 * Defines uncaught rejection behavior.
 *
 * - 'default': Applies the default behavior where an uncaught rejection event will be raised if no
 *   catch handler exists.
 * - 'discard': Adds a default rejection handler so that uncaught rejections are silently discarded.
 */
type UncaughtBehavior = 'default' | 'discard';

/**
 * A {Promise} that allows to resolve or reject outside of the executor and query the current
 * status.
 *
 * WARNING: Are there any calls to `.reject` on your promise or does it wrap another `Promise` that
 * can throw? **If so, make sure that there is at least one usage that handles rejection with
 * `.catch` or in a `catch` block when `await`ing it**! If you can't ensure that, then you **MUST**
 * set the `UncaughtBehaviour` to 'discard' on construction to prevent the uncaught promise
 * rejection handler from being raised!
 */
export class ResolvablePromise<V, E extends Error = never>
    extends Promise<V>
    implements QueryablePromise<V>
{
    private readonly _inner: PromiseFn<V, E>;
    private _state: QueryablePromiseState<V, E>;

    public constructor(parameters: {
        readonly executor?: (resolve: (value: V) => void, reject: (reason: E) => void) => void;
        readonly uncaught: UncaughtBehavior;
    }) {
        // BIG FAT WARNING: The constructor is actually called with an `executor` parameter in any
        // `.then()` chain, including `await` calls (which are just sugar for `.then()`).
        //
        // Therefore, although we declare `parameters` to be an object, it will be an executor
        // function when `.then()` is called!
        //
        // `Promise` is full of black magic!
        let executor:
            | ((resolve: (value: V) => void, reject: (reason: E) => void) => void)
            | undefined;
        let uncaught: UncaughtBehavior | undefined;
        if (typeof parameters === 'function') {
            executor = parameters;
        } else {
            ({executor, uncaught} = parameters);
        }

        // We have to do this little dance here since `this` cannot be used
        // prior to having called `super`.
        const inner: PromiseFn<V, E> = {
            resolve: ResolvablePromise._fail,
            reject: ResolvablePromise._fail,
        };
        const outer: PromiseFn<V, E> = {
            resolve: (value) => this.resolve(value),
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            reject: (reason) => this.reject(reason),
        };
        super(
            (
                innerResolve: (value: V | PromiseLike<V>) => void,
                innerReject: (reason?: E) => void,
            ) => {
                inner.resolve = innerResolve;
                inner.reject = innerReject;
                if (executor !== undefined) {
                    executor(outer.resolve, outer.reject);
                }
            },
        );
        this._inner = {
            resolve: inner.resolve,
            reject: inner.reject,
        };
        this._state = {type: 'pending'};

        // Apply uncaught rejection behavior
        switch (uncaught) {
            case undefined:
            case 'default':
                // Nothing to do
                break;
            case 'discard':
                // Add default rejection handler that discards the error
                this.catch(() => {
                    // Ignore
                });
                break;
            default:
                unreachable(uncaught);
        }
    }

    /**
     * Creates a new resolvable promise that is immediately resolved.
     */
    public static override resolve<E extends Error = Error>(): ResolvablePromise<void, E>;
    public static override resolve<V, E extends Error = Error>(value: V): ResolvablePromise<V, E>;
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public static override resolve<V, E extends Error = Error>(value?: V): ResolvablePromise<V, E> {
        const promise = new ResolvablePromise<V, E>({uncaught: 'default'});
        promise.resolve(value as V);
        return promise;
    }

    /**
     * Wraps a normal promise with a resolvable promise.
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public static wrap<V, E extends Error>(
        inner: Promise<V>,
        options: {readonly uncaught: UncaughtBehavior},
    ): ResolvablePromise<V, E> {
        const promise = new ResolvablePromise<V, E>(options);
        inner
            .then((v) => {
                promise.resolve(v);
            })
            .catch((error) => {
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                promise.reject(ensureError(error) as E);
            });
        return promise;
    }

    /**
     * Called if the promise resolve/rejector methods were not available.
     * This should never happen!
     */
    private static _fail(): void {
        throw new Error('Promise resolve/reject not available');
    }

    /**
     * Return whether the promise is done (resolved or rejected).
     */
    public get done(): boolean {
        return this._state.type !== 'pending';
    }

    /**
     * Get the current state of the promise.
     */
    public get state(): QueryablePromiseState<V, E> {
        return this._state;
    }

    /**
     * Resolve the promise from the outside.
     */
    public resolve(value: V): void {
        this._state = {type: 'resolved', result: value};
        this._inner.resolve(value);
    }

    /**
     * Reject the promise from the outside.
     */
    public reject(reason: E): void {
        this._state = {type: 'rejected', result: reason};
        this._inner.reject(reason);
    }
}
