import type {Mutable} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
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
    type StoreDeactivator,
    type StoreOptions,
    type StoreSubscriber,
    type StoreUnsubscriber,
    WritableStore,
} from '~/common/utils/store';

export type QueryableStores = readonly IQueryableStore<unknown>[];

/**
 * Map a store array to an array of the value they emit.
 */
export type StoreValues<TStores extends readonly IQueryableStore<unknown>[]> = {
    [K in keyof TStores]: TStores[K] extends IQueryableStore<infer TStoreValue>
        ? TStoreValue
        : never;
};

/**
 * Map a store array to an array of the value they emit, or {@link NO_STORE_VALUE}.
 */
type StoreValuesOptional<TStores extends QueryableStores> = {
    [K in keyof TStores]: TStores[K] extends IQueryableStore<infer TStoreValue>
        ? TStoreValue | typeof NO_STORE_VALUE
        : never;
};

/**
 * Extracts the type of a store array at a specific index.
 *
 * Note that this is only useful if the value type of the store is known by the type system.
 */
type StoreValueType<
    TStores extends QueryableStores,
    TIndex extends keyof TStores,
> = IQueryableStoreValue<
    TStores[TIndex] extends IQueryableStore<unknown> ? TStores[TIndex] : never
>;

/**
 * Map an array to a same-sized array with a new value type.
 */
type MappedArray<TArray extends unknown[] | readonly unknown[], TMappedType> = {
    [K in keyof TArray]: TMappedType;
};

interface EnabledState<TSourceStores extends QueryableStores>
    extends LazyStoreState<typeof LAZY_STORE_ENABLED_STATE> {
    readonly sourceStoreUnsubscribers: Mutable<MappedArray<TSourceStores, StoreUnsubscriber>>;
    readonly valueStore: WritableStore<StoreValues<TSourceStores>>;
}

interface InitialConcentratingState<TSourceStores extends QueryableStores>
    extends LazyStoreState<typeof LAZY_STORE_INITIALIZING_STATE> {
    readonly sourceStoreUnsubscribers: Mutable<
        MappedArray<TSourceStores, StoreUnsubscriber | undefined>
    >;
    readonly initialSourceStoreValues: StoreValuesOptional<TSourceStores>;
}

/**
 * The states a {@link ConcentratorStore} can be in.
 */
export type States<TSourceStores extends QueryableStores> =
    | LazyStoreState<typeof LAZY_STORE_DISABLED_STATE>
    | InitialConcentratingState<TSourceStores>
    | EnabledState<TSourceStores>;

function assertStateEnabled<TSourceStores extends QueryableStores>(
    state: States<TSourceStores>,
): asserts state is EnabledState<TSourceStores> {
    assert(state.symbol === LAZY_STORE_ENABLED_STATE, `Expected store state to be enabled`);
}

function assertNoMissingValues<TSourceStores extends QueryableStores>(
    values: StoreValuesOptional<TSourceStores>,
    message?: string,
): asserts values is StoreValues<TSourceStores> {
    assert(
        values.every((value) => value !== NO_STORE_VALUE),
        message,
    );
}
function assertNoMissingUnsubscribers<TSourceStores extends QueryableStores>(
    values: MappedArray<TSourceStores, StoreUnsubscriber | undefined>,
    message?: string,
): asserts values is MappedArray<TSourceStores, StoreUnsubscriber> {
    assert(
        values.every((value) => value !== undefined),
        message,
    );
}

/**
 * Constructor for the {@link ConcentratorStore} to allow a more natural wrapping.
 *
 * @param stores The source stores.
 * @returns a {@link ConcentratorStore} of the {@param stores}.
 */
export function concentrate<const TSourceStores extends QueryableStores>(
    stores: TSourceStores,
): ConcentratorStore<TSourceStores> {
    return new ConcentratorStore(stores);
}

/**
 * A svelte-compatible readable store that attaches to an array of readable stores and collects the
 * values to an array.
 *
 *
 * ---> [ Store⟨value1⟩    \
 * --->   Store⟨value2⟩     > ==> ConcentratorStore⟨[value1, value2, value3]⟩
 * --->   Store⟨value3⟩ ]  /
 */
export class ConcentratorStore<TSourceStores extends QueryableStores>
    implements IQueryableStore<StoreValues<TSourceStores>>, LocalStore<StoreValues<TSourceStores>>
{
    public readonly [TRANSFER_HANDLER] = STORE_TRANSFER_HANDLER;
    public readonly tag: string;

    /**
     * This class implements a state machine:
     *
     * {@link LAZY_STORE_DISABLED_STATE} ->
     * ({@link LAZY_STORE_INITIALIZING_STATE}) ->
     * {@link LAZY_STORE_ENABLED_STATE} ->
     * {@link LAZY_STORE_DISABLED_STATE}
     */
    protected _state: States<TSourceStores> = {
        symbol: LAZY_STORE_DISABLED_STATE,
    };
    private _deactivator: StoreDeactivator | undefined;

    /**
     * Create a concentrator store.
     *
     * @param _sourceStores The source stores to concentrate values from. A store may not be listed multiple times.
     * @param options Additional store options.
     */
    public constructor(
        private readonly _sourceStores: TSourceStores,
        public readonly options?: StoreOptions<StoreValues<TSourceStores>>,
    ) {
        this.tag = options?.debug?.tag ?? '';
    }

    /** @inheritdoc */
    public get(): StoreValues<TSourceStores> {
        const initialStateSymbol = this._state.symbol;
        this._enable();
        assertStateEnabled(this._state);

        /**
         * Current store value. Get operation on an enabled {@link WritableStore} is a noop.
         */
        const value = this._state.valueStore.get();

        if (initialStateSymbol === LAZY_STORE_DISABLED_STATE) {
            this._disable();
        }

        return value;
    }

    /** @inheritdoc */
    public subscribe(subscriber: StoreSubscriber<StoreValues<TSourceStores>>): StoreUnsubscriber {
        this._enable();
        assertStateEnabled(this._state);
        return this._state.valueStore.subscribe(subscriber);
    }

    /**
     * Subscribe to all source stores and update this store's values with {@link this._updateSourceStoreValue}
     */
    protected _subscribeToSourceStores(): void {
        assert(
            this._state.symbol === LAZY_STORE_INITIALIZING_STATE,
            'Cannot subscribe to source stores outside of initial concentrating state',
        );

        for (const [storeIndex, sourceStore] of this._sourceStores.entries()) {
            const unsubscriber = sourceStore.subscribe((value) => {
                // Note: This callback is called during the subscription to provide an initial
                // value as well
                this._updateSourceStoreValue(
                    storeIndex,
                    value as StoreValueType<TSourceStores, typeof storeIndex>,
                );
            });
            this._state.sourceStoreUnsubscribers[storeIndex] = unsubscriber;
        }
    }

    /**
     * Enable this store (if it is not enabled yet). Calls are idempotent.
     *
     * Changes the class state.
     */
    protected _enable(): void {
        if (this._state.symbol !== LAZY_STORE_DISABLED_STATE) {
            // Keep the current state
            return;
        }

        // Following unsubscribe/value "tuples", but in fact this is a dynamic Array creation, so we
        // promise typescript that we took care of length and default values.
        const initialSourceStoreValues = Array(this._sourceStores.length).fill(
            NO_STORE_VALUE,
        ) as StoreValuesOptional<TSourceStores>;
        const sourceStoreUnsubscribers = Array(this._sourceStores.length).fill(
            undefined,
        ) as MappedArray<TSourceStores, StoreUnsubscriber | undefined>;

        this._state = {
            symbol: LAZY_STORE_INITIALIZING_STATE,
            sourceStoreUnsubscribers,
            initialSourceStoreValues,
        };

        this.options?.debug?.log?.debug('Subscribing to source stores');
        this._subscribeToSourceStores();

        assertNoMissingValues(
            initialSourceStoreValues,
            'Source store values must be set after subscription phase.' +
                ' This is probably a bug in a source store!',
        );
        assertNoMissingUnsubscribers(
            sourceStoreUnsubscribers,
            'Source store unsubscibers must be set after subscription phase',
        );

        const valueStore = new WritableStore(initialSourceStoreValues, {
            debug: {tag: this.tag},
            activator: () => () => {
                // Deactivator, triggered when the valueStore has no subscribers anymore.
                this._disable();
            },
        });

        this._state = {
            symbol: LAZY_STORE_ENABLED_STATE,
            valueStore,
            sourceStoreUnsubscribers: this._state.sourceStoreUnsubscribers as MappedArray<
                TSourceStores,
                StoreUnsubscriber
            >,
        };

        this._deactivator = this.options?.activator?.();
    }

    /**
     * Update the values of a source store from a subscriber.
     *
     * If in {@link LAZY_STORE_INITIALIZING_STATE}, update the initial concentration value, if in
     * {@link LAZY_STORE_ENABLED_STATE}, update the {valueStore} directly.
     */
    protected _updateSourceStoreValue<TStoreIndex extends keyof TSourceStores>(
        sourceStorePosition: TStoreIndex,
        updatedStoreValue: StoreValueType<TSourceStores, TStoreIndex>,
    ): void {
        assert(
            this._state.symbol !== LAZY_STORE_DISABLED_STATE,
            'A source store subscription must not call a disabled concentrator store.',
        );

        switch (this._state.symbol) {
            case LAZY_STORE_INITIALIZING_STATE:
                this._state.initialSourceStoreValues[sourceStorePosition] = updatedStoreValue;
                break;
            case LAZY_STORE_ENABLED_STATE: {
                const newConcentratedValue = [
                    ...this._state.valueStore.get(),
                ] as unknown as StoreValues<TSourceStores>; // Trivially the same
                newConcentratedValue[sourceStorePosition] = updatedStoreValue;
                this._state.valueStore.set(newConcentratedValue);
                break;
            }
            default:
                unreachable(this._state);
        }
    }

    /**
     * Disable the store and unsubscribe from source stores. Must only be called on an enabled
     * store.
     *
     * Changes the class state
     */
    protected _disable(): void {
        assert(
            this._state.symbol === LAZY_STORE_ENABLED_STATE,
            'Only an enabled store cannot be disabled',
        );
        assert(
            this._state.valueStore.subscribersCount === 0,
            'Store with subscribers cannot be disabled',
        );

        this.options?.debug?.log?.debug('Unsubscribing from source stores');
        for (const unsubscriber of this._state.sourceStoreUnsubscribers) {
            unsubscriber();
        }

        // Note: The valueStore has no subscribers anymore at this point, so we just drop it quietly
        // here.
        this._state = {symbol: LAZY_STORE_DISABLED_STATE};

        this._deactivator?.();
    }
}
