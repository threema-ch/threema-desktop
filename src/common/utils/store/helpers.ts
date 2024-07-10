import type {IQueryableStore} from '~/common/utils/store';

/**
 * Ensure the value of a nullable {@link IQueryableStore} is present.
 */
export function ensureStoreValue<TValue>(
    store: IQueryableStore<TValue>,
): IQueryableStore<NonNullable<TValue>> {
    if (!hasValue(store)) {
        throw new Error(`Store value assertion violated: value is ${store.get()}`);
    }

    return store;
}

/**
 * Type guard for a defined value of a {@link IQueryableStore}.
 */
function hasValue<TValue>(
    store: IQueryableStore<TValue>,
): store is IQueryableStore<NonNullable<TValue>> {
    const currentValue = store.get();

    return currentValue !== null && currentValue !== undefined;
}
