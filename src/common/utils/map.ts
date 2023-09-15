import {type u53} from '~/common/types';
import {AsyncLock} from '~/common/utils/lock';

/**
 * A weak map where the value is weakly referenced [1].
 *
 * When the value is garbage collected, the key and the weak reference are purged from the map [2].
 *
 * [1] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef
 * [2] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
 */
export class WeakValueMap<TKey, TValue extends object> {
    private readonly _map = new Map<TKey, WeakRef<TValue>>();
    private readonly _registry = new FinalizationRegistry((key: TKey) => this._map.delete(key));

    /**
     * The current amount of references in the map.
     *
     * IMPORTANT: Do not rely on this number beyond debugging purposes! A
     *            reference may disappear silently between calls!
     */
    public get size(): u53 {
        return this._map.size;
    }

    /**
     * Return the value associated with the specified key, or `undefined` if the key is not defined
     * or if the value has already been reclaimed.
     *
     * @param key The lookup key.
     */
    public get(key: TKey): TValue | undefined {
        return this._map.get(key)?.deref();
    }

    /**
     * Look up the value associated with the specified key and run the {@link hit} function (if the
     * value was found in the map) or the {@link miss} function (if the value was not found in the
     * map or has already been reclaimed).
     *
     * @param key The lookup key.
     * @param miss Will be called if the key is not found in the map. If the return value of the
     *   miss function is not undefined, it will be stored in the map and returned.
     * @param hit Will be called if the key is found in the map.
     * @returns The lookup value (on hit) or the return value of the {@link miss} function (on
     *   miss).
     */
    public getOrCreate<TCreated extends TValue | undefined>(
        key: TKey,
        miss: () => TCreated,
        hit?: () => void,
    ): TCreated {
        let value = this._map.get(key)?.deref();
        if (value === undefined) {
            value = miss();
            if (value !== undefined) {
                this.set(key, value);
            }
        } else {
            hit?.();
        }
        return value as TCreated;
    }

    /**
     * Store the value in the map and return it.
     */
    public set(key: TKey, value: TValue): TValue {
        // Unregister the previous value to prevent it from removing the new
        // value from the map when the previous value is being GCed.
        this._unregister(this._map.get(key));

        // Register and set the (new) value.
        this._registry.register(value, key);
        this._map.set(key, new WeakRef(value));

        // Return value for convenience
        return value;
    }

    /**
     * Remove all values from the map.
     */
    public clear(): void {
        for (const ref of this._map.values()) {
            this._unregister(ref);
        }
        this._map.clear();
    }

    /**
     * Delete the specified key from the map.
     */
    public delete(key: TKey): boolean {
        this._unregister(this._map.get(key));
        return this._map.delete(key);
    }

    /**
     * Deregister the specified ref from the finalization registry.
     */
    private _unregister(ref: WeakRef<TValue> | undefined): void {
        const value = ref?.deref();
        if (value !== undefined) {
            this._registry.unregister(value);
        }
    }
}

/**
 * A map where the value is weakly referenced. Async reduced version of {@link WeakValueMap}.
 *
 * This implementation is async safe, meaning that all async methods guarantee that other async
 * methods called concurrently cannot see incomplete state.
 */
export class AsyncWeakValueMap<TKey, TValue extends object> {
    private readonly _map = new Map<TKey, WeakRef<TValue>>();
    private readonly _registry = new FinalizationRegistry((key: TKey) => this._map.delete(key));
    private readonly _locks = new WeakValueMap<TKey, AsyncLock>();

    /**
     * Return the value associated with the specified key, or `undefined` if the key is not defined
     * or if the value has already been reclaimed.
     *
     * @param key The lookup key.
     */
    public async get(key: TKey): Promise<TValue | undefined> {
        return await this._locks
            .getOrCreate(key, () => new AsyncLock())
            // eslint-disable-next-line @typescript-eslint/require-await
            .with(async () => this._map.get(key)?.deref());
    }

    /**
     * Look up the value associated with the specified key and run the {@link hit} function (if the
     * value was found in the map) or the {@link miss} function (if the value was not found in the
     * map or has already been reclaimed).
     *
     * @param key The lookup key.
     * @param miss Will be called if the key is not found in the map. If the return value of the
     *   miss function is not undefined, it will be stored in the map and returned.
     * @param hit Will be called if the key is found in the map.
     * @returns The lookup value (on hit) or the return value of the {@link miss} function (on
     *   miss).
     */
    public async getOrCreate<TCreated extends TValue | undefined>(
        key: TKey,
        miss: () => Promise<TCreated>,
        hit?: () => Promise<void>,
    ): Promise<TCreated> {
        return await this._locks
            .getOrCreate(key, () => new AsyncLock())
            .with(async () => {
                let value = this._map.get(key)?.deref();
                if (value === undefined) {
                    value = await miss();
                    if (value !== undefined) {
                        this._set(key, value);
                    }
                } else {
                    await hit?.();
                }
                return value as TCreated;
            });
    }

    /**
     * Store the value in the map and return it.
     */
    private _set(key: TKey, value: TValue): TValue {
        // Unregister the previous value to prevent it from removing the new
        // value from the map when the previous value is being GCed.
        this._unregister(this._map.get(key));

        // Register and set the (new) value.
        this._registry.register(value, key);
        this._map.set(key, new WeakRef(value));

        // Return value for convenience
        return value;
    }

    /**
     * Deregister the specified ref from the finalization registry.
     */
    private _unregister(ref: WeakRef<TValue> | undefined): void {
        const value = ref?.deref();
        if (value !== undefined) {
            this._registry.unregister(value);
        }
    }
}

/**
 * A map containing items that are lazily created when accessing.
 *
 * Note: Lazily created values will linger until explicitly removed via {@link pop}.
 */
export class LazyMap<TKey, TValue> {
    private readonly _map = new Map<TKey, TValue>();

    public constructor(private readonly _create: () => TValue) {}

    /**
     * Get or lazily create a value.
     */
    public get(key: TKey): TValue {
        let cache = this._map.get(key);
        if (cache === undefined) {
            cache = this._create();
            this._map.set(key, cache);
        }
        return cache;
    }

    /**
     * Remove and return a value (if existing).
     */
    public pop(key: TKey): TValue | undefined {
        const cache = this._map.get(key);
        this._map.delete(key);
        return cache;
    }

    /**
     * Returns an iterable of key, value pairs for every entry in the map.
     */
    public entries(): IterableIterator<[key: TKey, value: TValue]> {
        return this._map.entries();
    }
}
