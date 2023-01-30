import {type LocalModelStore} from '~/common/model/utils/model-store';
import {assert} from '~/common/utils/assert';
import {WeakValueMap} from '~/common/utils/map';
import {type LocalSetStore} from '~/common/utils/store/set-store';

/**
 * A lazily created {@link WeakRef} reference.
 */
export class LazyWeakRef<T extends object> {
    private _ref?: WeakRef<T>;

    public deref(): T | undefined {
        return this._ref?.deref();
    }

    public derefOrCreate(create: () => T): T {
        // Return cached T, if existing
        let ref = this._ref?.deref();
        if (ref !== undefined) {
            return ref;
        }

        // Fall back to creating a new cached T
        ref = create();
        this._ref = new WeakRef<T>(ref);
        return ref;
    }
}

/**
 * Caches model stores for their lifetime. It ensures that model stores are unique per (primary)
 * key. Therefore, there should only ever be one instance of this class per model.
 */
export class LocalModelStoreCache<
    TKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TModelStore extends LocalModelStore<any>,
> {
    protected readonly _stores: WeakValueMap<TKey, TModelStore> = new WeakValueMap();

    public constructor(public readonly setRef = new LazyWeakRef<LocalSetStore<TModelStore>>()) {}

    public getOrAdd(key: TKey, create: () => TModelStore): TModelStore;
    public getOrAdd(key: TKey, create: () => TModelStore | undefined): TModelStore | undefined;
    public getOrAdd(key: TKey, create: () => TModelStore | undefined): TModelStore | undefined {
        // Get an existing model or fall back to adding a new one and update the map
        const store = this._stores.getOrCreate(key, create);
        if (store === undefined) {
            return undefined;
        }
        this._addToSet(store);
        return store;
    }

    public add<TInConcreteStore extends TModelStore = TModelStore>(
        key: TKey,
        create: () => TInConcreteStore,
    ): TInConcreteStore {
        assert(this._stores.get(key) === undefined, 'Expected local model store key to be unique');

        // Add a new store and update the map
        const store = create();
        this._stores.set(key, store);
        this._addToSet(store);
        return store;
    }

    public remove(key: TKey): void {
        // Remove the store, if any
        const store = this._stores.get(key);
        if (store === undefined) {
            return;
        } else {
            this._stores.delete(key);
        }

        // IMPORTANT: Since the map has a reference to the store, the store cannot have been
        //            silently dropped from the map even though it is weakly referenced. This means
        //            we can safely assume that if the store exists, it must be removed from the
        //            map. If it does not exist, it was never in the map or there is no map.
        this._removeFromSet(store);
    }

    public clear(): void {
        this._stores.clear();
        this.setRef.deref()?.clear();
    }

    private _addToSet(store: TModelStore): void {
        this.setRef.deref()?.add(store);
    }

    private _removeFromSet(store: TModelStore): void {
        this.setRef.deref()?.delete(store);
    }
}
