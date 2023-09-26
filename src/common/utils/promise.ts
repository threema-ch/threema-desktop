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
