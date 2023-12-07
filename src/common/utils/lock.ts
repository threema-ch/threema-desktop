/**
 * A TypeScript async lock implemented with promise chaining.
 *
 * @example
 * ```ts
 *   this._lock.with(async () => {
 *       await doThing1();
 *       await doThing2(a);
 *   });
 * ```
 */
export class AsyncLock {
    private _queue: Promise<unknown> = Promise.resolve();

    /**
     * Run an async function (the `executor`) within the scope of this lock.
     *
     * All enqueued executors are processed serially.
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public with<T>(executor: () => Promise<T>): Promise<T> {
        this._queue = this._enqueue(this._queue, executor);
        return this._queue as Promise<T>;
    }

    /**
     * Await the queue, then await and return the executor.
     */
    private async _enqueue<T>(queue: Promise<unknown>, executor: () => Promise<T>): Promise<T> {
        try {
            await queue;
        } catch {
            // Ignored
        }
        return await executor();
    }
}
