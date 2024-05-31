import {TRANSFER_HANDLER} from '~/common/index';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';

/**
 * Return a promise that never resolves.
 */
// eslint-disable-next-line @typescript-eslint/promise-function-async
export function eternalPromise(): Promise<never> {
    return Promise.race([]);
}

export interface TaggedPromise<TTag, TValue> {
    tag: TTag;
    promise: Promise<TValue>;
}

/**
 * Race two promises. Return the first one that resolves, along with the tag.
 *
 * Note that an error results in an immediate rejection of the combined promise. The error is not
 * tagged.
 */
// eslint-disable-next-line @typescript-eslint/promise-function-async
export function taggedRace<const TTag1, const TValue1, const TTag2, const TValue2>(
    promise1: TaggedPromise<TTag1, TValue1>,
    promise2: TaggedPromise<TTag2, TValue2>,
): Promise<{tag: TTag1; value: TValue1} | {tag: TTag2; value: TValue2}> {
    return Promise.race([
        promise1.promise.then((value) => ({tag: promise1.tag, value})),
        promise2.promise.then((value) => ({tag: promise2.tag, value})),
    ]);
}

/**
 * The ReusablePromise contains an internal promise, which can be awaited:
 *
 *     const reusablePromise = new ReusablePromise<string>();
 *     // ...
 *     const value = await reusablePromise.value();
 *
 * Once a value is passed to the ReusablePromise, it will be dispatched to all subscribers.
 *
 *     reusablePromise.resolve("hello world");
 *
 * At the same time, the promise is replaced with a new promise, which can be awaited again.
 */
export class ReusablePromise<TValue> implements ProxyMarked {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    private _promise = new ResolvablePromise<TValue>({uncaught: 'discard'});

    public resolve(password: TValue): void {
        this._promise.resolve(password);
        this._promise = new ResolvablePromise({uncaught: 'discard'});
    }

    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public value(): Promise<TValue> {
        return this._promise;
    }
}
