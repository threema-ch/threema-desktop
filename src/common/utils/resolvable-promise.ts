import {ensureError} from '~/common/utils/assert';

export interface PromiseFn<V, E extends Error = Error> {
    resolve: (value: V) => void;
    reject: (reason?: E) => void;
}

/**
 * A {Promise} that allows to query the current status.
 */
export interface QueryablePromise<V> extends Promise<V> {
    readonly done: boolean;
}

/**
 * A {Promise} that allows to resolve or reject outside of the executor and
 * query the current status.
 */
export class ResolvablePromise<V, E extends Error = Error>
    extends Promise<V>
    implements QueryablePromise<V>
{
    private _done: boolean;
    private readonly _inner: PromiseFn<V | PromiseLike<V>, E>;

    public constructor(
        executor?: (
            resolve: (value: V | PromiseLike<V>) => void,
            reject: (reason?: E) => void,
        ) => void,
    ) {
        // We have to do this little dance here since `this` cannot be used
        // prior to having called `super`.
        const inner: PromiseFn<V | PromiseLike<V>, E> = {
            resolve: ResolvablePromise._fail,
            reject: ResolvablePromise._fail,
        };
        const outer: PromiseFn<V | PromiseLike<V>, E> = {
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
                    return;
                }
            },
        );
        this._inner = {
            resolve: inner.resolve,
            reject: inner.reject,
        };
        this._done = false;
    }

    /**
     * Creates a new resolvable promise that is immediately resolved.
     */
    public static resolve<E extends Error = Error>(): ResolvablePromise<void, E>;
    public static resolve<V, E extends Error = Error>(value: V): ResolvablePromise<V, E>;
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public static resolve<V, E extends Error = Error>(value?: V): ResolvablePromise<V, E> {
        const promise = new ResolvablePromise();
        promise.resolve(value);
        return promise as ResolvablePromise<V, E>;
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
            .catch((e) => {
                promise.reject(ensureError(e));
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
        return this._done;
    }

    /**
     * Resolve the promise from the outside.
     */
    public resolve(value: V | PromiseLike<V>): void {
        this._done = true;
        this._inner.resolve(value);
    }

    /**
     * Reject the promise from the outside.
     */
    public reject(reason?: E): void {
        this._done = true;
        this._inner.reject(reason);
    }
}
