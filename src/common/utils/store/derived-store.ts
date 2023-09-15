import {assert} from '~/common/utils/assert';
import {TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {
    type IQueryableStore,
    type IQueryableStoreValue,
    LAZY_STORE_DISABLED_STATE,
    LAZY_STORE_ENABLED_STATE,
    LAZY_STORE_INITIALIZING_STATE,
    type LazyStoreState,
    type LazyStoreStates,
    type LocalStore,
    NO_STORE_VALUE,
    STORE_TRANSFER_HANDLER,
    type StoreOptions,
    type StoreSubscriber,
    type StoreUnsubscriber,
    WritableStore,
} from '~/common/utils/store';

type DisabledDeriveStoreState = LazyStoreState<typeof LAZY_STORE_DISABLED_STATE>;

export interface InitializingDerivedStoreState<TSourceStore extends IQueryableStore<unknown>>
    extends LazyStoreState<typeof LAZY_STORE_INITIALIZING_STATE> {
    /**
     * Map containing the stores unwrapped in the derivation function and their unsubscribers.
     */
    readonly unwrappedStoreSubscriptions: Map<IQueryableStore<unknown>, StoreUnsubscriber>;

    /**
     * Unsubscriber of the current {@link TSourceStore}
     */
    unsubscriber: StoreUnsubscriber | undefined;

    /**
     * Current source store value. Might be {@link NO_STORE_VALUE} during the initialization.
     */
    sourceStoreValue: IQueryableStoreValue<TSourceStore> | typeof NO_STORE_VALUE;

    /**
     * Whether the store is currently deriving a value
     */
    deriving: boolean;
}
export interface EnabledDerivedStoreState<
    TSourceStore extends IQueryableStore<unknown>,
    TInDerivedValue extends TOutDerivedValue,
    TOutDerivedValue,
> extends LazyStoreState<typeof LAZY_STORE_ENABLED_STATE> {
    /**
     * Derived value store with the subscribers.
     */
    readonly derivedValueStore: WritableStore<TInDerivedValue, TOutDerivedValue>;

    /**
     * Map containing the stores unwrapped in the derivation function and their unsubscribers.
     */
    readonly unwrappedStoreSubscriptions: Map<IQueryableStore<unknown>, StoreUnsubscriber>;

    /**
     * Unsubscriber of the current {@link TSourceStore}
     */
    unsubscriber: StoreUnsubscriber;

    /**
     * Current source store value.
     */
    sourceStoreValue: IQueryableStoreValue<TSourceStore>;

    /**
     * Whether the store is currently deriving a value
     */
    deriving: boolean;
}

export type States<
    TSourceStore extends IQueryableStore<unknown>,
    TInDerivedValue extends TOutDerivedValue,
    TOutDerivedValue,
> = (
    | DisabledDeriveStoreState
    | InitializingDerivedStoreState<TSourceStore>
    | EnabledDerivedStoreState<TSourceStore, TInDerivedValue, TOutDerivedValue>
) &
    LazyStoreStates;

function assertStateEnabled<
    TSourceStore extends IQueryableStore<unknown>,
    TInDerivedValue extends TOutDerivedValue,
    TOutDerivedValue,
>(
    state: States<TSourceStore, TInDerivedValue, TOutDerivedValue>,
): asserts state is EnabledDerivedStoreState<TSourceStore, TInDerivedValue, TOutDerivedValue> {
    assert(state.symbol === LAZY_STORE_ENABLED_STATE, `Expected store state to be enabled`);
}
/**
 * Unwrap/get the value of a store and implicitly subscribe to updates.
 */
export type GetAndSubscribeFunction = <TStore extends IQueryableStore<unknown>>(
    store: TStore,
) => IQueryableStoreValue<TStore>;

/**
 * Function to return a derived value from the source store's value.
 */
export type DeriveFunction<TSourceStore extends IQueryableStore<unknown>, TDerivedValue> = (
    /**
     * The value of the source store which can be derived from.
     */
    sourceValue: IQueryableStoreValue<TSourceStore>,

    /**
     * Function to get the value of additional stores. The function subscribes the DerivedStore to
     * updates from the additional store, and redoes the derivation on updates.
     *
     * Note that the most recent value of the store is fetched during the derivation (i.e. value
     * updates of these additional stores might be skipped for a newer one.)
     */
    getAndSubscribe: GetAndSubscribeFunction,
) => TDerivedValue;

/**
 * Constructor for the {@link DerivedStore} to allow a more natural wrapping.
 *
 * @param sourceStore The source store to derive values from.
 * @param deriveFunction Transform function for aggregating values from the source store. See
 *   {@link DeriveFunction} for a description of the parameters.
 * @returns a {@link DerivedStore} of the {@link sourceStore}.
 */
export function derive<
    TSourceStore extends IQueryableStore<unknown>,
    TInDerivedStore extends TOutDerivedValue,
    TOutDerivedValue = TInDerivedStore,
>(
    sourceStore: TSourceStore,
    deriveFunction: DeriveFunction<TSourceStore, TInDerivedStore>,
    options?: StoreOptions<TOutDerivedValue>,
): DerivedStore<TSourceStore, TInDerivedStore, TOutDerivedValue> {
    return new DerivedStore(sourceStore, deriveFunction, options);
}

/**
 * Derive a store's value using a derivation function.
 * ```
 * Store⟨value1⟩  ==[derive(value1): value1']==>  DerivedStore⟨value1'⟩
 * ```
 *
 * It is possible to get the value and subscribe to additional stores which trigger a rederivation:
 * ```
 * store2 = Store⟨value2⟩
 * deriveFunction = derive(value1, getAndSubscribe): value1' + getAndSubscribe(store2)
 * Store⟨value1⟩  ==[deriveFunction]==>  DerivedStore⟨value1' + value2⟩
 * ```
 *
 *  The {@param TOutDerivedValue} provides type variance for the output type inference.
 */
export class DerivedStore<
        TSourceStore extends IQueryableStore<unknown>,
        TDerivedValue extends TOutDerivedValue,
        TOutDerivedValue = TDerivedValue,
    >
    implements IQueryableStore<TOutDerivedValue>, LocalStore<TOutDerivedValue>
{
    public readonly [TRANSFER_HANDLER] = STORE_TRANSFER_HANDLER;
    public readonly tag: string;

    protected _state: States<TSourceStore, TDerivedValue, TOutDerivedValue> = {
        symbol: LAZY_STORE_DISABLED_STATE,
    };

    /**
     * Create a derived store.
     *
     * @param _sourceStore The source store to derive values from.
     * @param _derive Transform function for aggregating values from the source store. See
     *   {@link DeriveFunction} for a description of the parameters.
     * @param options Additional store options.
     */
    public constructor(
        protected _sourceStore: TSourceStore,
        protected readonly _derive: DeriveFunction<TSourceStore, TDerivedValue>,
        public readonly options?: StoreOptions<TOutDerivedValue>,
    ) {
        this.tag = options?.debug?.tag ?? '';
    }

    /** @inheritdoc */
    public subscribe(subscriber: StoreSubscriber<TOutDerivedValue>): StoreUnsubscriber {
        this._enable();
        assertStateEnabled(this._state);

        return this._state.derivedValueStore.subscribe(subscriber);
    }

    /** @inheritdoc */
    public get(): TOutDerivedValue {
        const disabledAtEntrance = this._state.symbol === LAZY_STORE_DISABLED_STATE;

        this._enable();
        assertStateEnabled(this._state);

        const value = this._state.derivedValueStore.get();

        if (disabledAtEntrance) {
            this._disable();
        }

        return value;
    }

    /**
     * Replace the {@link _sourceStore} of the derived store.
     *
     * This implicitly triggers an immediate update to the subscribers.
     *
     * @param sourceStore the new source stores
     */
    public replaceSourceStore(sourceStore: TSourceStore): void {
        this._sourceStore = sourceStore;
        if (this._state.symbol === LAZY_STORE_DISABLED_STATE) {
            return;
        }

        this._state.unsubscriber?.(); // The unsubscriber is replaced in _subscribeToSourceStore
        this._subscribeToSourceStore();
    }

    /**
     * Derive a new derived value from the sourceValue and return the result.
     */
    protected _deriveValue(): TDerivedValue {
        assert(
            this._state.symbol !== LAZY_STORE_DISABLED_STATE,
            'Cannot derive a value on a disabled store.',
        );
        assert(this._state.sourceStoreValue !== NO_STORE_VALUE);
        this._state.deriving = true;

        /**
         * New source stores that are unwrapped during the derivation and need to be subscribed to.
         */
        const newUnwrappedStores = new Set<IQueryableStore<unknown>>();

        const derivedValue = this._derive(this._state.sourceStoreValue, ((store) => {
            newUnwrappedStores.add(store);
            return this._addUnwrappedStore(store);
        }) as GetAndSubscribeFunction);

        this._removeOldUnwrappedStores(newUnwrappedStores);

        this._state.deriving = false;
        return derivedValue;
    }

    /**
     * Add a new subscription to {@link this._state.unwrappedStoreSubscriptions}.
     */
    protected _addUnwrappedStore<TUnwrappedStoreValue>(
        store: IQueryableStore<TUnwrappedStoreValue>,
    ): TUnwrappedStoreValue {
        assert(
            this._state.symbol !== LAZY_STORE_DISABLED_STATE,
            'Cannot update unwrapped stores on a disabled store.',
        );
        assert(this._state.deriving, 'A unwrapped store can only be added while deriving');

        if (this._state.unwrappedStoreSubscriptions.has(store)) {
            return store.get();
        }

        let firstSubscriptionValue: TUnwrappedStoreValue | typeof NO_STORE_VALUE = NO_STORE_VALUE;
        const unsubscriber = store.subscribe((value) => {
            assert(
                this._state.symbol !== LAZY_STORE_DISABLED_STATE,
                'A unwrappedSourceStore subscription may not call an disabled derived store.',
            );

            if (this._state.deriving) {
                firstSubscriptionValue = value;
            } else if (this._state.symbol === LAZY_STORE_ENABLED_STATE) {
                this._state.derivedValueStore.set(this._deriveValue());
            }
        });
        this._state.unwrappedStoreSubscriptions.set(store, unsubscriber);
        assert(
            firstSubscriptionValue !== NO_STORE_VALUE,
            'A unwrapped store value must be set after subscription. This is probably a bug in a unwrapped source store!',
        );

        return firstSubscriptionValue;
    }

    /**
     * Remove and unsubscribe from stores in {@link this._state.unwrappedStoreSubscriptions} which
     * are not in {@param newUnwrappedStores}.
     */
    protected _removeOldUnwrappedStores(newUnwrappedStores: Set<IQueryableStore<unknown>>): void {
        assert(
            this._state.symbol !== LAZY_STORE_DISABLED_STATE,
            'Cannot update unwrapped stores on a disabled store.',
        );

        for (const [store, unsubscriber] of this._state.unwrappedStoreSubscriptions.entries()) {
            if (!newUnwrappedStores.has(store)) {
                unsubscriber();
                this._state.unwrappedStoreSubscriptions.delete(store);
            }
        }
    }

    /**
     * Subscribe to the source store and update the {@link _state.sourceStoreValue}. The
     * subscription also calls {@link _deriveValue} if the store is in
     * {@link LAZY_STORE_ENABLED_STATE}.
     */
    protected _subscribeToSourceStore(): void {
        assert(
            this._state.symbol !== LAZY_STORE_DISABLED_STATE,
            'Cannot subscribe to source stores in disabled state',
        );

        this._state.unsubscriber = this._sourceStore.subscribe((sourceValue) => {
            assert(
                this._state.symbol !== LAZY_STORE_DISABLED_STATE,
                'A source store subscription may not call an disabled derived store.',
            );
            this._state.sourceStoreValue = sourceValue as IQueryableStoreValue<TSourceStore>;

            if (this._state.symbol === LAZY_STORE_ENABLED_STATE) {
                this._state.derivedValueStore.set(this._deriveValue());
            }
        });
    }

    /**
     * Enable this store (if it is not enabled yet) and subscribe to the source store. Calls are
     * idempotent.
     *
     * Changes the class state.
     */
    protected _enable(): void {
        if (this._state.symbol !== LAZY_STORE_DISABLED_STATE) {
            return;
        }
        this.options?.debug?.log?.debug('Enable Store');
        this._state = {
            symbol: LAZY_STORE_INITIALIZING_STATE,
            unwrappedStoreSubscriptions: new Map(),
            sourceStoreValue: NO_STORE_VALUE,
            unsubscriber: undefined,
            deriving: false,
        };

        // Subscribe to source store and get the first derived value
        this._subscribeToSourceStore();
        assert(
            this._state.sourceStoreValue !== NO_STORE_VALUE,
            'Source store value must be set after subscription. This is probably a bug in a source store!',
        );
        assert(
            this._state.unsubscriber !== undefined,
            'The unsubscriber must be set after the subscription',
        );

        const derivedValue = this._deriveValue();
        const derivedValueStore = new WritableStore<TDerivedValue, TOutDerivedValue>(derivedValue, {
            activator: () => {
                const deactivator = this.options?.activator?.();
                return () => {
                    this._disable();
                    deactivator?.();
                };
            },
            debug: this.options?.debug,
        });

        this._state = {
            symbol: LAZY_STORE_ENABLED_STATE,
            derivedValueStore,
            unsubscriber: this._state.unsubscriber,
            sourceStoreValue: this._state.sourceStoreValue,
            unwrappedStoreSubscriptions: this._state.unwrappedStoreSubscriptions,
            deriving: false,
        };
    }

    /**
     * Disable the store and unsubscribe from the source store. Must only be called on an enabled
     * store.
     *
     * Changes the class state
     */
    protected _disable(): void {
        assert(this._state.symbol === LAZY_STORE_ENABLED_STATE, 'Enabled store cannot be disabled');
        assert(
            this._state.derivedValueStore.subscribersCount === 0,
            'Store with subscribers cannot be disabled',
        );
        this.options?.debug?.log?.debug('Disable Store');

        // Unsubscribe and delete from each subscribed store
        for (const [store, unsubscriber] of this._state.unwrappedStoreSubscriptions) {
            unsubscriber();
            this._state.unwrappedStoreSubscriptions.delete(store);
        }

        this._state.unsubscriber();
        this._state = {symbol: LAZY_STORE_DISABLED_STATE};
    }
}
