import {ensureError} from '~/common/utils/assert';

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
 * A {Promise} that allows to resolve or reject outside of the executor and
 * query the current status.
 */
export class ResolvablePromise<V, E extends Error = Error>
    extends Promise<V>
    implements QueryablePromise<V>
{
    private readonly _inner: PromiseFn<V, E>;
    private _state: QueryablePromiseState<V, E>;

    public constructor(
        executor?: (resolve: (value: V) => void, reject: (reason: E) => void) => void,
    ) {
        // We have to do this little dance here since `this` cannot be used
        // prior to having called `super`.
        const inner: PromiseFn<V, E> = {
            resolve: ResolvablePromise._fail,
            reject: ResolvablePromise._fail,
        };
        const outer: PromiseFn<V, E> = {
            resolve: (value) => this.resolve(value),
            reject: (reason) => this.reject(reason),
        };
        super(
            (
                innerResolve: (value: V | PromiseLike<V>) => void,
                innerReject: (reason?: E) => void,
            ) => {
                inner.resolve = innerResolve;
                inner.reject = innerReject;
                if (executor) {
                    executor(outer.resolve, outer.reject);
                }
            },
        );
        this._inner = {
            resolve: inner.resolve,
            reject: inner.reject,
        };
        this._state = {type: 'pending'};
    }

    /**
     * Creates a new resolvable promise that is immediately resolved.
     */
    public static override resolve<E extends Error = Error>(): ResolvablePromise<void, E>;
    public static override resolve<V, E extends Error = Error>(value: V): ResolvablePromise<V, E>;
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public static override resolve<V, E extends Error = Error>(value?: V): ResolvablePromise<V, E> {
        const promise = new ResolvablePromise<V, E>();
        promise.resolve(value as V);
        return promise;
    }

    /**
     * Wraps a normal promise with a resolvable promise.
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public static wrap<V>(inner: Promise<V>): ResolvablePromise<V> {
        const promise = new ResolvablePromise<V>();
        inner
            .then((v) => {
                promise.resolve(v);
            })
            .catch((error) => {
                promise.reject(ensureError(error));
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
