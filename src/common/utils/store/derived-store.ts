import type {Logger} from '~/common/logging';
import {assert} from '~/common/utils/assert';
import {TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {
    type IQueryableStore,
    type IQueryableStoreValue,
    LAZY_STORE_DISABLED_STATE,
    LAZY_STORE_ENABLED_STATE,
    LAZY_STORE_INITIALIZING_STATE,
    type LazyStoreState,
    type LocalStore,
    NO_STORE_VALUE,
    STORE_TRANSFER_HANDLER,
    type StoreOptions,
    type StoreSubscriber,
    type StoreUnsubscriber,
    WritableStore,
    type StoreDeactivator,
    type StoreTransferDebug,
} from '~/common/utils/store';

/**
 * Get the current value of a store and implicitly subscribe to updates.
 */
export type GetAndSubscribeFunction = <TStore extends IQueryableStore<unknown>>(
    store: TStore,
) => IQueryableStoreValue<TStore>;

/**
 * Callback function of a derived store. Receives the current source store values, as well as a
 * {@link GetAndSubscribeFunction} that can be used to derive from additional stores in the
 * derivation function's body itself.
 */
export type DeriveFunction<
    TSourceStores extends readonly IQueryableStore<unknown>[],
    TDerivedValue,
> = (
    /**
     * The current values of the source stores to pass to the derive function. Contains an object
     * for each source store (in the same order) that holds the store's `currentValue`, as well as
     * the store itself.
     */
    currentSourceStoreValues: {
        readonly [K in keyof TSourceStores]: {
            readonly currentValue: IQueryableStoreValue<TSourceStores[K]>;
            readonly store: TSourceStores[K];
        };
    },

    /**
     * Function to get the value of additional stores while deriving. Implicitly subscribes the
     * {@link DerivedStore} to updates from the additional store, and rederives on updates.
     */
    getAndSubscribe: GetAndSubscribeFunction,
) => TDerivedValue;

/**
 * Constructor for the {@link DerivedStore} to allow a more natural wrapping.
 *
 * @example
 * ```ts
 * const example: string = derive([store1, store2], ([storeState1, storeState2]) => {
 *  const { currentValue: currentValue1, store: _store1 } = storeState1;
 *  const { currentValue: currentValue2, store: _store2 } = storeState2;
 *
 *  return `1: ${currentValue1}, 2: ${currentValue2}`;
 * });
 * ```
 * @param sourceStores Array of source stores to derive values from.
 * @param deriveFunction Transform function for aggregating values from the source store. See
 *   {@link DeriveFunction} for a description of the parameters.
 * @returns a {@link DerivedStore} of the {@link sourceStores}.
 */
export function derive<
    const TSourceStores extends IQueryableStore<unknown>[],
    TInDerivedValue extends TOutDerivedValue,
    TOutDerivedValue = TInDerivedValue,
>(
    sourceStores: TSourceStores,
    deriveFunction: DeriveFunction<TSourceStores, TInDerivedValue>,
    options?: StoreOptions<TOutDerivedValue>,
): DerivedStore<TSourceStores, TInDerivedValue, TOutDerivedValue> {
    return new DerivedStore(sourceStores, deriveFunction, options);
}

/**
 * Derives a new value from an array of source stores using a derive function. Whenever one of the
 * source stores or `getAndSubscribe`d stores updates, the given derive function is rerun.
 *
 * The derive function receives an array of objects containing the `currentValue` of each source
 * store, as well as the `store` itself. Additionally, it provides a `getAndSubscribe` function that
 * can be used to get and subscribe to additional stores in the derive function's body.
 *
 *  The {@param TOutDerivedValue} provides type variance for the output type inference.
 */
export class DerivedStore<
        const TSourceStores extends IQueryableStore<unknown>[],
        TInDerivedValue extends TOutDerivedValue,
        TOutDerivedValue = TInDerivedValue,
    >
    implements IQueryableStore<TOutDerivedValue>, LocalStore<TOutDerivedValue>
{
    public readonly [TRANSFER_HANDLER] = STORE_TRANSFER_HANDLER;
    public readonly debug: StoreTransferDebug;

    private readonly _log: Logger | undefined;
    private _state: States<TSourceStores, TInDerivedValue, TOutDerivedValue> = {
        symbol: LAZY_STORE_DISABLED_STATE,
    };
    private _deactivator: StoreDeactivator | undefined;

    /**
     * Create a derived store.
     *
     * @param _sourceStores The source stores to derive values from.
     * @param _derive Transform function for aggregating values from the source stores. See
     *   {@link DeriveFunction} for a description of the parameters.
     * @param _options Additional store options.
     */
    public constructor(
        private readonly _sourceStores: TSourceStores,
        private readonly _derive: DeriveFunction<TSourceStores, TInDerivedValue>,
        private readonly _options?: StoreOptions<TOutDerivedValue>,
    ) {
        this._log = _options?.debug?.log;
        this.debug = {
            prefix: _options?.debug?.log?.prefix,
            tag: _options?.debug?.tag,
        };
    }

    /** @inheritdoc */
    public subscribe(subscriber: StoreSubscriber<TOutDerivedValue>): StoreUnsubscriber {
        this._enable();
        assert(
            this._state.symbol === LAZY_STORE_ENABLED_STATE,
            `Expected store state to be enabled`,
        );

        const unsubscriber = this._state.derivedValueStore.subscribe(subscriber);

        return () => {
            unsubscriber();

            // If the last subscriber has unsubscribed, deactivate this store.
            if (
                this._state.symbol === LAZY_STORE_ENABLED_STATE &&
                this._state.derivedValueStore.subscribersCount === 0
            ) {
                this._disable();
            }
        };
    }

    /** @inheritdoc */
    public get(): TOutDerivedValue {
        const disabledAtEntrance = this._state.symbol === LAZY_STORE_DISABLED_STATE;

        this._enable();
        assert(
            this._state.symbol === LAZY_STORE_ENABLED_STATE,
            `Expected store state to be enabled`,
        );

        const value = this._state.derivedValueStore.get();

        if (disabledAtEntrance) {
            this._disable();
        }

        return value;
    }

    /**
     * Enable this store (if it is not enabled yet) and subscribe to the source store. Calls are
     * idempotent.
     */
    private _enable(): void {
        // If the store is not currently disabled (i.e., it's already enabled or still
        // initializing), there is nothing to do.
        if (this._state.symbol !== LAZY_STORE_DISABLED_STATE) {
            return;
        }

        if (import.meta.env.VERBOSE_LOGGING.STORES) {
            this._log?.debug('Enable DerivedStore');
        }

        // Initialize source store state.
        this._state = {
            isDeriving: false,
            symbol: LAZY_STORE_INITIALIZING_STATE,
            // As no derivation has happened yet, we don't have any additional stores at this point.
            additionalStoreSubscriptions: [],
        };

        if (import.meta.env.VERBOSE_LOGGING.STORES) {
            this._log?.debug('Subscribing to source stores');
        }

        const sourceStoreSubscriptions: StoreSubscriptionState<IQueryableStore<unknown>>[] = [];
        // Subscribe to each of the source stores and get the first derived values.
        for (const [storeIndex, sourceStore] of this._sourceStores.entries()) {
            // Subscribe to the store and get the initial state. Note: The callback will only run if
            // the `sourceStore`'s value changes after initialization, not on the initial
            // subscription.
            const initialState = subscribeAndGetInitialState(
                sourceStore,
                // Callback runs whenever this `sourceStore` updates.
                (value) => {
                    assert(
                        this._state.symbol === LAZY_STORE_ENABLED_STATE,
                        'DerivedStore: A source store subscription must only call back to an enabled derived store',
                    );

                    const currentState = this._state.sourceStoreSubscriptions.at(storeIndex);
                    assert(
                        currentState !== undefined,
                        `DerivedStore: Expected source store at index ${storeIndex}, but it was undefined`,
                    );

                    // Override source store state at the specified index with a copy that includes the
                    // new value.
                    this._state.sourceStoreSubscriptions[storeIndex] = {
                        ...currentState,
                        currentValue: value as IQueryableStoreValue<
                            TSourceStores[typeof storeIndex]
                        >,
                    };

                    // Rederive and update `derivedValueStore` with the result.
                    this._state.derivedValueStore.set(
                        this._deriveValue(this._state.sourceStoreSubscriptions),
                    );
                },
            );

            sourceStoreSubscriptions[storeIndex] = initialState;
        }

        assert(
            sourceStoreSubscriptions.length === this._sourceStores.length,
            'DerivedStore: Expected all source stores to be subscribed after initialization phase',
        );
        assert(
            sourceStoreSubscriptions.every(
                ({currentValue, unsubscriber}) =>
                    // Check if we have a `currentValue` and `unsubscriber` for every source store
                    // at runtime, even if it is guaranteed by the type system.
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    currentValue !== NO_STORE_VALUE && unsubscriber !== undefined,
            ),
            'DerivedStore: Expected all source stores to have a value and an unsubscriber after the initialization phase',
        );
        // The states are now initialized (and assertions ensure the preconditions), thus it is safe to cast
        const initializedSourceStoreSubscriptions =
            sourceStoreSubscriptions as StoreSubscriptionStates<TSourceStores>;

        if (import.meta.env.VERBOSE_LOGGING.STORES) {
            this._log?.debug('Deriving first value');
        }

        // Start the first derivation.
        const derivedValue = this._deriveValue(initializedSourceStoreSubscriptions);

        // Initialize the `derivedValueStore` and register the `deactivator` callback.
        const derivedValueStore = new WritableStore<TInDerivedValue, TOutDerivedValue>(
            derivedValue,
            {
                activator: () => {
                    const deactivator = this._options?.activator?.();
                    return () => {
                        this._disable();
                        deactivator?.();
                    };
                },
                debug: this._options?.debug,
            },
        );

        if (import.meta.env.VERBOSE_LOGGING.STORES) {
            this._log?.debug('Initialization finished, setting state to enabled');
        }

        this._state = {
            symbol: LAZY_STORE_ENABLED_STATE,
            derivedValueStore,
            isDeriving: false,
            sourceStoreSubscriptions: initializedSourceStoreSubscriptions,
            additionalStoreSubscriptions: this._state.additionalStoreSubscriptions,
        };

        this._deactivator = this._options?.activator?.();
    }

    /**
     * Derive a new value from the source- and additional stores' current values and return the
     * result.
     */
    private _deriveValue(
        sourceStoreSubscriptions: StoreSubscriptionStates<TSourceStores>,
    ): TInDerivedValue {
        assert(
            this._state.symbol !== LAZY_STORE_DISABLED_STATE,
            'DerivedStore: Cannot derive a values if store is disabled',
        );
        assert(
            sourceStoreSubscriptions.every(({currentValue}) => currentValue !== NO_STORE_VALUE),
            'DerivedStore: Expected all source stores to have a value',
        );
        assert(
            this._sourceStores.length === sourceStoreSubscriptions.length,
            'DerivedStore: Mismatch of source stores and subscribed source stores',
        );
        this._state.isDeriving = true;

        // Set to collect new source stores that are unwrapped during the derivation and need to be
        // subscribed to.
        const newAdditionalStores = new Set<IQueryableStore<unknown>>();

        // Execute the derive callback with the current source store values.
        const derivedValue = this._derive(
            sourceStoreSubscriptions.map(({currentValue, ref}) => ({
                currentValue,
                store: ref,
                // Cast is necessary here as the type system can't guarantee that the order of the
                // source store array and the input array for the derive function have the same order
                // and length.
            })) as {
                readonly [K in keyof TSourceStores]: {
                    readonly currentValue: IQueryableStoreValue<TSourceStores[K]>;
                    readonly store: TSourceStores[K];
                };
            },
            // The `getAndSubscribe` function, which can be used to subscribe to add additional
            // stores during derivation.
            ((store) => {
                newAdditionalStores.add(store);

                // Subscribe to the store (if it isn't already present) and get its current value.
                return this._getAndSubscribeAdditionalStore(store);
            }) as GetAndSubscribeFunction,
        );

        // Filter additional stores that are not used anymore and unsubscribe from them.
        this._state.additionalStoreSubscriptions = this._state.additionalStoreSubscriptions.filter(
            (subscription) => {
                if (newAdditionalStores.has(subscription.ref)) {
                    return true;
                }

                subscription.unsubscriber();
                return false;
            },
        );

        this._state.isDeriving = false;
        return derivedValue;
    }

    /**
     * Add a new subscription to {@link this._state.additionalStoreSubscriptions}.
     *
     * Note: Updating additional stores is only possible while deriving.
     *
     * @returns The current value of the additional store.
     */
    private _getAndSubscribeAdditionalStore<TAdditionalStoreValue>(
        store: IQueryableStore<TAdditionalStoreValue>,
    ): TAdditionalStoreValue {
        assert(
            this._state.symbol !== LAZY_STORE_DISABLED_STATE,
            'DerivedStore: Cannot update additional stores on a disabled store',
        );
        assert(
            this._state.isDeriving,
            'DerivedStore: An additional store can only be added while deriving',
        );

        // If the store is already subscribed, simply return it's current value.
        if (this._state.additionalStoreSubscriptions.find(({ref}) => ref === store) !== undefined) {
            return store.get();
        }

        // Subscribe to the store and get its initial state. Note: The callback will only run if the
        // `sourceStore`'s value changes after initialization, not on the initial subscription.
        const initialState = subscribeAndGetInitialState(store, () => {
            assert(
                this._state.symbol === LAZY_STORE_ENABLED_STATE,
                'DerivedStore: An additional store subscription must only call back to an enabled derived store',
            );

            // Rederive and update `derivedValueStore`.
            this._state.derivedValueStore.set(
                this._deriveValue(this._state.sourceStoreSubscriptions),
            );
        });

        // Add the new subscription to the state.
        this._state.additionalStoreSubscriptions = [
            ...this._state.additionalStoreSubscriptions,
            initialState,
        ];

        // Return the current value of the store.
        return initialState.currentValue;
    }

    /**
     * Disable the store and unsubscribe from the source store. Note: Must only be called on an
     * enabled store.
     */
    private _disable(): void {
        assert(
            this._state.symbol === LAZY_STORE_ENABLED_STATE,
            'Store must be in enabled state to be disabled',
        );
        assert(
            this._state.derivedValueStore.subscribersCount === 0,
            'Store cannot be disabled if it still has subscribers',
        );

        if (import.meta.env.VERBOSE_LOGGING.STORES) {
            this._log?.debug('Disabling store');
        }

        // Unsubscribe and delete from each subscribed store.
        for (const subscription of this._state.sourceStoreSubscriptions.values()) {
            subscription.unsubscriber();
        }
        for (const subscription of this._state.additionalStoreSubscriptions.values()) {
            subscription.unsubscriber();
        }
        // Clear subscription states.
        this._state.sourceStoreSubscriptions.length = 0;
        this._state.additionalStoreSubscriptions = [];

        // Note: The valueStore has no subscribers anymore at this point, so we just drop it quietly
        // here.
        this._state = {symbol: LAZY_STORE_DISABLED_STATE};
        this._deactivator?.();
    }
}

/**
 * Subscribes to a store and gathers the initial {@link StoreSubscriptionState}.
 *
 * Note: Unlike `store.subscribe(callback)`, the `onChange` callback doesn't run directly after the
 * store has been initially subscribed to, but only when the value has changed a second time (or
 * more). If you need the initial value, read it from this function's return value.
 *
 * @param store The store to subscribe to.
 * @param onChange Callback that runs whenever the store's value changes.
 * @returns Details about the subscription state in the form of a `StoreSubscriptionState` object.
 */
function subscribeAndGetInitialState<TStoreValue>(
    store: IQueryableStore<TStoreValue>,
    onChange?: (value: TStoreValue) => void,
): StoreSubscriptionState<typeof store> {
    let firstSubscriptionValue: TStoreValue | typeof NO_STORE_VALUE = NO_STORE_VALUE;
    const unsubscriber = store.subscribe((value) => {
        assert(
            value !== NO_STORE_VALUE,
            'DerivedStore: Expected value to be defined in subscription callback',
        );

        if (firstSubscriptionValue === NO_STORE_VALUE) {
            // Callback runs for the first time.
            firstSubscriptionValue = value;
        } else {
            // Runs on subsequent callback invocations.
            onChange?.(value);
        }
    });

    assert(
        firstSubscriptionValue !== NO_STORE_VALUE,
        'DerivedStore: Expected store value to be set after subscription. First callback after a subscription must run immediately!',
    );

    return {
        currentValue: firstSubscriptionValue,
        ref: store,
        unsubscriber,
    };
}

/**
 * Alias for a readonly array of unknown stores that satisfy the {@link IQueryableStore} interface.
 */
type QueryableStores = readonly IQueryableStore<unknown>[];

/**
 * State of a single store subscription.
 */
interface StoreSubscriptionState<TStore extends IQueryableStore<unknown>> {
    /**
     * Latest value emitted by the referenced store.
     */
    readonly currentValue: IQueryableStoreValue<TStore>;

    /**
     * Reference to the subscribed store itself.
     */
    readonly ref: IQueryableStore<unknown>;

    /**
     * Reference to the remembered unsubscriber to stop and release the subscription.
     */
    readonly unsubscriber: StoreUnsubscriber;
}

/**
 * An array of {@link StoreSubscriptionState}s.
 */
type StoreSubscriptionStates<TArray extends readonly IQueryableStore<unknown>[]> = {
    [K in keyof TArray]: StoreSubscriptionState<TArray[K]>;
};

/**
 * The states a {@link DerivedStore} can be in.
 */
type States<
    TSourceStores extends QueryableStores,
    TInDerivedValue extends TOutDerivedValue,
    TOutDerivedValue,
> =
    | DisabledDerivedStoreState
    | InitializingDerivedStoreState
    | EnabledDerivedStoreState<TSourceStores, TInDerivedValue, TOutDerivedValue>;

/**
 * Shape of {@link DerivedStore}'s state if it's disabled.
 */
type DisabledDerivedStoreState = LazyStoreState<typeof LAZY_STORE_DISABLED_STATE>;

/**
 * Shape of {@link DerivedStore}'s state while it's initializing.
 */
interface InitializingDerivedStoreState
    extends LazyStoreState<typeof LAZY_STORE_INITIALIZING_STATE> {
    /**
     * See {@link EnabledDerivedStoreState.unwrappedStoreSubscriptions}.
     */
    additionalStoreSubscriptions: StoreSubscriptionStates<QueryableStores>;
    /**
     * See {@link EnabledDerivedStoreState.isDeriving}.
     */
    isDeriving: boolean;
}

/**
 * Shape of {@link DerivedStore}'s state if it's enabled.
 */
interface EnabledDerivedStoreState<
    TSourceStores extends QueryableStores,
    TInDerivedValue extends TOutDerivedValue,
    TOutDerivedValue,
> extends LazyStoreState<typeof LAZY_STORE_ENABLED_STATE> {
    /**
     * The store which holds the most recent derived value, i.e., the value of this
     * {@link DerivedStore}. Subscribers of this {@link DerivedStore} will be subscribed to
     * {@link derivedValueStore} behind the scenes.
     */
    readonly derivedValueStore: WritableStore<TInDerivedValue, TOutDerivedValue>;
    /**
     * States of the source stores this {@link DerivedStore} is deriving from. Contains a
     * {@link StoreSubscriptionState} object for each source store that holds the store's
     * `currentValue`, as well as the store itself.
     */
    readonly sourceStoreSubscriptions: StoreSubscriptionStates<TSourceStores>;
    /**
     * States of the stores that this {@link DerivedStore} is deriving from (in addition to its
     * source stores), i.e., stores added using the {@link GetAndSubscribeFunction} during
     * derivation. Contains a {@link StoreSubscriptionState} object for each store that holds the
     * store's `currentValue`, as well as the store itself.
     */
    additionalStoreSubscriptions: StoreSubscriptionStates<QueryableStores>;
    /**
     * Flag to indicate whether a derivation is currently in progress.
     */
    isDeriving: boolean;
}
