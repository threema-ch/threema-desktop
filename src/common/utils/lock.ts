/**
 * An async lock implemented with promise chaining.
 *
 * @example
 * ```ts
 *   this._lock.with(async () => {
 *       await doThing1();
 *       await doThing2(a);
 *   });
 * ```
 */
export class AsyncLock<TContext = undefined, TGuardedValue = undefined> {
    private readonly _value: TGuardedValue;
    private _queue: Promise<unknown> = Promise.resolve();
    private _context: TContext | undefined = undefined;

    public constructor(
        ...[value]: TGuardedValue extends undefined ? [] : readonly [value: TGuardedValue]
    ) {
        this._value = value as TGuardedValue;
    }

    /** Get the current context that acquired the {@link AsyncLock}, if any. */
    public get context(): TContext | undefined {
        return this._context;
    }

    /**
     * IMPORTANT: UNSAFE! This circumvents the locking mechanism to retrieve the guarded value.
     */
    public unwrap(): TGuardedValue {
        return this._value;
    }

    /**
     * Run a function (the `executor`) within the scope of this lock.
     *
     * All enqueued executors are processed serially.
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public with<TResult>(
        executor: (value: TGuardedValue) => TResult,
        ...[context]: TContext extends undefined ? [] : readonly [context: TContext]
    ): TResult extends Promise<unknown> ? TResult : Promise<TResult> {
        this._queue = this._enqueue(this._queue, executor, context);
        return this._queue as TResult extends Promise<unknown> ? TResult : Promise<TResult>;
    }

    /** Await the queue, then await the executor and return the result.*/
    private async _enqueue<TResult>(
        queue: Promise<unknown>,
        executor: (value: TGuardedValue) => TResult | Promise<TResult>,
        context: TContext | undefined,
    ): Promise<TResult> {
        try {
            await queue;
        } catch {
            // Ignored
        }
        this._context = context;
        const result = await executor(this._value);
        this._context = undefined;
        return result;
    }
}
