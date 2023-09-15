import {TransferTag} from '~/common/enum';
import {type Logger, type LogPrefix} from '~/common/logging';
import {ensureU53, type u53} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {
    type CreatedEndpoint,
    type CustomTransferable,
    type CustomTransferredRemoteMarker,
    type DomTransferable,
    type Endpoint,
    type EndpointFor,
    type EndpointService,
    type MessageEvent,
    type ObjectId,
    type RegisteredTransferHandler,
    registerTransferHandler,
    TRANSFER_HANDLER,
    TRANSFERRED_MARKER,
    type WireValue,
} from '~/common/utils/endpoint';
import {type AbortRaiser} from '~/common/utils/signal';

/**
 * Symbol to mark a remote as a store.
 */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const STORE_REMOTE_MARKER: symbol = Symbol('store-remote-marker');

/**
 * A svelte-compatible store event subscriber.
 */
export type StoreSubscriber<in TValue> = (value: TValue) => void;

/**
 * A svelte-compatible store event unsubscriber.
 */
export type StoreUnsubscriber = () => void;

/**
 * A svelte-compatible store which can be subscribed to.
 */
export interface ISubscribableStore<out TValue> {
    /**
     * Subscribe to store update events.
     * The subscriber function must be called with an initial value during subscription.
     *
     * @param subscriber An update event subscriber.
     * @returns An unsubscriber for this specific subscriber.
     */
    readonly subscribe: (subscriber: StoreSubscriber<TValue>) => StoreUnsubscriber;
}

/**
 * A svelte-compatible listenable store of which the current state can be queried for the current
 * value.
 */
export interface IQueryableStore<out TValue> extends ISubscribableStore<TValue> {
    /**
     * Get the current value.
     *
     * Note: Prefer permanent subscriptions over calling this repetitively. Depending on the store
     *       implementation, this may be an expensive operation.
     */
    readonly get: () => TValue;
}

/**
 * Returns the type of the item in the store.
 */
export type IQueryableStoreValue<TStore extends IQueryableStore<unknown>> =
    TStore extends IQueryableStore<infer TStoreValue> ? TStoreValue : never;

/**
 * A svelte-compatible writable store.
 */
export interface IWritableStore<in TValue> {
    /**
     * Set the current value.
     *
     * @param value The new value.
     */
    readonly set: (value: TValue) => void;
}

/**
 * A deactivator is called when the last subscriber unsubscribers from an
 * activated store.
 */
export type StoreDeactivator = () => void;

/**
 * An activator/deactivator of a store.
 *
 * This function is called when the first subscription is being made.
 * The returned deactivator function will then be called when the last
 * unsubscription happens.
 */
export type StoreActivator = () => StoreDeactivator;

/**
 * Store debug interface.
 */
export interface StoreDebug<TValue> {
    readonly log?: Logger;
    readonly tag?: string;
    readonly representation?: (value: TValue) => string;
}

/**
 * Store options interface.
 */
export interface StoreOptions<TValue> {
    /**
     * An optional store activator/deactivator
     */
    activator?: StoreActivator;

    /**
     * Optional store debug interface.
     */
    debug?: StoreDebug<TValue>;
}

/**
 * A store marked as a store will be automatically serialised into a remote
 * store on a remote endpoint.
 */
export interface LocalStore<
    TValue,
    TTransferHandler extends RegisteredTransferHandler<
        /* eslint-disable @typescript-eslint/no-explicit-any */
        any,
        any,
        any,
        any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        TransferTag
    > = typeof STORE_TRANSFER_HANDLER,
> extends IQueryableStore<TValue>,
        CustomTransferable<TTransferHandler> {
    /**
     * A tag that will be assigned to the associated debug logger.
     */
    readonly tag: string;

    /**
     * Store options.
     */
    readonly options?: StoreOptions<TValue>;
}

// Determines that the store did not emit a value yet.
export const NO_STORE_VALUE = Symbol('no-store-value');

function defaultRepresentation<TValue>(value: TValue): string {
    return `${value}`;
}

/**
 * The store is currently disabled and waiting on subscribers.
 */
export const LAZY_STORE_DISABLED_STATE: unique symbol = Symbol('disabled-state');

/**
 * The store is currently initializing and has a pending subscriber (or get).
 */
export const LAZY_STORE_INITIALIZING_STATE: unique symbol = Symbol('initializing-state');

/**
 * The store has active subscriptions and the value is ready.
 */
export const LAZY_STORE_ENABLED_STATE: unique symbol = Symbol('enabled-state');

/**
 * States of a lazy store which initializes the value on demand (i.e. on the first subscription)
 */
export interface LazyStoreState<
    TSymbol extends
        | typeof LAZY_STORE_DISABLED_STATE
        | typeof LAZY_STORE_INITIALIZING_STATE
        | typeof LAZY_STORE_ENABLED_STATE,
> {
    readonly symbol: TSymbol;
}

/**
 * Possible States of a lazy store which initializes the value on demand (i.e. on the first subscription)
 */
export type LazyStoreStates =
    | LazyStoreState<typeof LAZY_STORE_DISABLED_STATE>
    | LazyStoreState<typeof LAZY_STORE_INITIALIZING_STATE>
    | LazyStoreState<typeof LAZY_STORE_ENABLED_STATE>;

/**
 * A svelte-compatible readable store..
 *
 * The split between {@param TInValue} and {@param TOutValue} allows returning a subtype of the
 * input type when reading the store (e.g. for returning a readonly version of the type). However,
 * the two type variables themselves are invariant. The "in out" annotations are left here both to
 * document that this is the case, and to speed up the type checker a tiny bit.
 */
export class ReadableStore<in out TInValue extends TOutValue, in out TOutValue = TInValue>
    implements IQueryableStore<TOutValue>
{
    protected readonly _representation: (value: TInValue) => string;
    protected readonly _subscribers = new Set<StoreSubscriber<TOutValue>>();
    private _deactivator?: StoreDeactivator;

    /**
     * Create a readable store.
     *
     * @param _value The initial value.
     * @param options Additional store options.
     */
    public constructor(
        protected _value: TInValue,
        public readonly options?: StoreOptions<TInValue | TOutValue>,
    ) {
        this._representation = options?.debug?.representation ?? defaultRepresentation;
    }

    /**
     * Get the current subscriber count.
     */
    public get subscribersCount(): u53 {
        return ensureU53(this._subscribers.size);
    }

    /**
     * Return the current value.
     */
    public get(): TOutValue {
        return this._value;
    }

    /**
     * Subscribe to store update events.
     *
     * @param subscriber An update event subscriber.
     * @returns An unsubscriber for this specific subscriber.
     */
    public subscribe(subscriber: StoreSubscriber<TOutValue>): StoreUnsubscriber {
        // Activate the store when the first subscription is being made
        if (this.options?.activator !== undefined && this._subscribers.size === 0) {
            if (import.meta.env.VERBOSE_LOGGING.STORES) {
                this.options.debug?.log?.debug('Activating');
            }
            this._deactivator = this.options.activator();
        }

        // Subscribe
        if (import.meta.env.VERBOSE_LOGGING.STORES && this.options?.debug?.log !== undefined) {
            const subscribers = this._subscribers.size;
            this.options.debug.log.debug(`Subscribed (${subscribers} -> ${subscribers + 1})`);
        }
        this._subscribers.add(subscriber);

        // Notify of the current value
        subscriber(this._value);

        // Return unsubscribe function
        return (): void => {
            if (this._subscribers.delete(subscriber)) {
                if (
                    import.meta.env.VERBOSE_LOGGING.STORES &&
                    this.options?.debug?.log !== undefined
                ) {
                    const subscribers = this._subscribers.size;
                    this.options.debug.log.debug(
                        `Unsubscribed (${subscribers + 1} -> ${subscribers})`,
                    );
                }
            } else {
                this.options?.debug?.log?.warn('Unsubscriber called twice!', subscriber);
            }

            // Deactivate the store when the last unsubscription is being made
            if (this._deactivator !== undefined && this._subscribers.size === 0) {
                if (import.meta.env.VERBOSE_LOGGING.STORES) {
                    this.options?.debug?.log?.debug('Deactivating');
                }
                this._deactivator();
                this._deactivator = undefined;
            }
        };
    }

    /**
     * Value will be updated if it is not equal to the current value.
     *
     * @param value The new value.
     * @returns Whether the value has been updated.
     */
    protected _update(value: TInValue): boolean {
        if (this._value !== value) {
            if (this.options?.debug?.log !== undefined) {
                this.options.debug.log.debug(
                    `${this._representation(this._value)} -> ${this._representation(value)}`,
                );
            }
            this._value = value;
            return true;
        }
        return false;
    }

    /**
     * Dispatch a value to the subscribers.
     *
     * @param value The value to be dispatched.
     */
    protected _dispatch(value: TOutValue): void {
        if (this.options?.debug?.log !== undefined && import.meta.env.VERBOSE_LOGGING.STORES) {
            this.options.debug.log.debug(
                `Dispatching value to ${this._subscribers.size} subscribers`,
            );
        }
        for (const subscriber of this._subscribers) {
            subscriber(value);
        }
    }
}

/**
 * A svelte-compatible writable store.
 *
 * The {@param TOutValue} provides type variance for the output type inference.
 */
export class WritableStore<TInValue extends TOutValue, TOutValue = TInValue>
    extends ReadableStore<TInValue, TOutValue>
    implements IWritableStore<TInValue>, IQueryableStore<TOutValue>, LocalStore<TOutValue>
{
    public readonly [TRANSFER_HANDLER] = STORE_TRANSFER_HANDLER;
    public readonly tag: string;

    /**
     * Create a writable store.
     *
     * @param initial The initial value.
     * @param options Additional store options.
     */
    public constructor(initial: TInValue, options?: StoreOptions<TOutValue>) {
        super(initial, options);
        this.tag = options?.debug?.tag ?? '';
    }

    /**
     * Set and replace the current value.
     *
     * @param value The new value.
     */
    public set<TSetValue extends TInValue>(value: TSetValue): TSetValue {
        // Update the underlying value and dispatch value to subscribers
        // (if updated).
        if (this._update(value)) {
            this._dispatch(value);
        }
        return this._value as TSetValue;
    }

    /**
     * Update a non-primitive value value in a callback function.
     *
     * This method is intended to be used to update the content inside of a non-primitive value,
     * e.g. an array, object or an instance.
     *
     * @param fn A function which will be called with the current value. Once it returns, the
     *   modified value will be dispatched to all subscribers.
     */
    public update(fn: (value: TInValue) => TInValue): TInValue {
        this._value = fn(this._value);
        this._dispatch(this._value);
        return this._value;
    }
}

/**
 * Indicates that the store value is to be reset.
 */
const RESET_TOKEN = Symbol('reset-store');

/**
 * A monotonically increasing enum store.
 *
 * Its internal value will only be updated if the new value is greater than the current value. An
 * attempt to decrease the internal value is considered an error condition and will throw.
 *
 * The only way to decrease the value again is by calling {@link MonotonicEnumStore#reset}.
 */
export class MonotonicEnumStore<TValue extends u53>
    extends ReadableStore<TValue>
    implements IWritableStore<TValue>, LocalStore<TValue>
{
    public readonly [TRANSFER_HANDLER] = STORE_TRANSFER_HANDLER;
    public readonly tag: string;

    /**
     * Create a monotonically increasing enum store.
     *
     * @param initial The initial value.
     * @param options Additional store options.
     */
    public constructor(initial: TValue, options?: StoreOptions<TValue>) {
        super(initial, options);
        this.tag = options?.debug?.tag ?? '';
    }

    /**
     * Set and replace the current value.
     *
     * @param value The new value.
     */
    public set<TSetValue extends TValue>(value: TSetValue): TSetValue {
        // Update the underlying value and dispatch value to subscribers (if updated)
        if (this._update(value)) {
            this._dispatch(value);
        }
        return this._value as TSetValue;
    }

    /**
     * Reset and replace the current value with a new initial value.
     */
    public reset<TSetValue extends TValue>(initial: TSetValue): TSetValue {
        // Reset the underlying value and dispatch initial value to subscribers (if updated)
        if (this._update(initial, RESET_TOKEN)) {
            this._dispatch(initial);
        }
        return this._value as TSetValue;
    }

    /**
     * Value will be updated iff it's greater than the current value
     * (unless it's reset).
     *
     * @param value The new value or a `reset´ token.
     * @returns Whether the value has been updated.
     * @throws {Error} in case an attempt was made to decrease the value.
     */
    protected override _update(value: TValue, token?: typeof RESET_TOKEN): boolean {
        // Special case: Reset
        if (token === RESET_TOKEN) {
            if (this._value !== value) {
                if (this.options?.debug?.log !== undefined) {
                    this.options.debug.log.debug(
                        `${this._representation(this._value)} -> ` +
                            `${this._representation(value)} (reset)`,
                    );
                }
                this._value = value;
                return true;
            }
            return false;
        }

        // Normal case: Monotonically increasing
        if (value > this._value) {
            if (this.options?.debug?.log !== undefined) {
                this.options.debug.log.debug(
                    `${this._representation(this._value)} -> ${this._representation(value)}`,
                );
            }
            this._value = value;
            return true;
        } else if (this._value === value) {
            return false;
        }

        // Error case: Attempt to decrease
        const error =
            'Attempted to decrease enum ' +
            `${this._representation(this._value)} to ` +
            `${this._representation(value)}`;
        this.options?.debug?.log?.error(error);
        throw new Error(error);
    }
}

/**
 * A strict monotonically increasing enum store.
 *
 * This is just a {@link MonotonicEnumStore} with the {@link MonotonicEnumStore#reset} omitted.
 */
export type StrictMonotonicEnumStore<TValue extends u53> = Omit<
    MonotonicEnumStore<TValue>,
    'reset'
>;

/**
 * Map all stores to a tuple of the store and the value they emit.
 */
type ReadableStoresValues<TStores extends readonly IQueryableStore<unknown>[]> = {
    -readonly [K in keyof TStores]: TStores[K] extends IQueryableStore<infer TValue>
        ? readonly [store: TStores[K], value: TValue]
        : never;
};

/**
 * A svelte-compatible readable store that attaches to another readable store and transforms the
 * values.
 *
 * @deprecated this store was deprecated by the new {@link DerivedStore}
 */
export class DeprecatedDerivedStore<
        const TStores extends readonly IQueryableStore<unknown>[],
        TTransformed,
    >
    implements IQueryableStore<TTransformed>, LocalStore<TTransformed>
{
    public readonly [TRANSFER_HANDLER] = STORE_TRANSFER_HANDLER;
    public readonly tag: string;
    private _state?: {
        subscribers: Set<StoreSubscriber<TTransformed>>;
        unsubscribe: StoreUnsubscriber;
        value: TTransformed;
    };

    /**
     * Create a derived store.
     *
     * @param _stores The source stores to derive values from.
     * @param _transform Transform function for aggregating values from the source stores.
     * @param options Additional store options.
     */
    public constructor(
        private _stores: TStores,
        private readonly _transform: (
            values: Readonly<ReadableStoresValues<TStores>>,
        ) => TTransformed,
        public readonly options?: StoreOptions<TTransformed>,
    ) {
        this.tag = options?.debug?.tag ?? '';
    }

    /**
     * Replace the source stores. This will immediately trigger an update of the store with all
     * aggregated transformed values derived from the new source stores.
     */
    public replace(stores: TStores): void {
        this._stores = stores;

        // We don't need to do anything else if there is no active state
        if (this._state === undefined) {
            return;
        }

        // We have an activate state, so replace it with a new one but with the existing
        // subscribers. This will implicitly generate a new value and dispatch that to all existing
        // subscribers.
        this._replaceState(this._state.subscribers);
    }

    /**
     * Return the current value.
     */
    public get(): TTransformed {
        let value: TTransformed | typeof NO_STORE_VALUE = NO_STORE_VALUE;
        if (this._state === undefined) {
            // Subscribe to get a transformed value, then immediately unsubscribe
            const unsubscriber = this.subscribe((value_) => (value = value_));
            unsubscriber();
        }
        assert(value !== NO_STORE_VALUE, 'Value should not be NO_STORE_VALUE');
        return value;
    }

    /**
     * Subscribe to store update events.
     *
     * @param subscriber An update event subscriber.
     * @returns An unsubscriber for this specific subscriber.
     */
    public subscribe(subscriber: StoreSubscriber<TTransformed>): StoreUnsubscriber {
        const subscribers = this._state?.subscribers ?? new Set();

        // Subscribe
        if (this.options?.debug?.log !== undefined) {
            this.options.debug.log.debug(
                `Subscribed (${subscribers.size} -> ${subscribers.size + 1})`,
            );
        }
        subscribers.add(subscriber);

        // Subscribe on the underlying stores on first subscription, otherwise notify of the current
        // value directly.
        if (this._state === undefined) {
            this._replaceState(subscribers);
        } else {
            subscriber(this._state.value);
        }

        // Return unsubscribe function
        return () => {
            if (this._state?.subscribers.delete(subscriber) ?? false) {
                if (this.options?.debug?.log !== undefined) {
                    assert(this._state !== undefined, 'this._state should not be undefined');
                    const subscriptions = this._state.subscribers.size;
                    this.options.debug.log.debug(
                        `Unsubscribed (${subscriptions + 1} -> ${subscriptions})`,
                    );
                }
            } else {
                this.options?.debug?.log?.warn('Unsubscriber called twice!', subscriber);
            }

            // Tear down the state when the last unsubscription is being made
            if (this._state?.subscribers.size === 0) {
                this._removeState();
            }
        };
    }

    /**
     * Tear down an existing state.
     */
    private _removeState(): void {
        if (this._state === undefined) {
            return;
        }
        this.options?.debug?.log?.debug('Unsubscribing from underlying stores');
        this._state.unsubscribe();
        this._state = undefined;
    }

    /**
     * Tear down an existing state, then create a new state by subscribing on the underlying stores
     * and doing an initial dispatch of all aggregated transformed values.
     */
    private _replaceState(subscribers: Set<StoreSubscriber<TTransformed>>): void {
        // Unsubscribe from the underlying stores and tear down any existing state
        this._removeState();

        // Create a new state and subscribe on the underlying stores
        this.options?.debug?.log?.debug('Subscribing on underlying stores');
        this._state = {
            subscribers,
            unsubscribe: () => new Error('Placeholder unsubscriber was called'),
            value: NO_STORE_VALUE as unknown as TTransformed,
        };
        let initial = true;
        const values: ReadableStoresValues<TStores> = [
            ...Array<undefined>(this._stores.length),
        ] as unknown[] as ReadableStoresValues<TStores>;
        const transformAndDispatch = (): void => {
            // Transform aggregated source values and store the result
            assert(
                this._state !== undefined,
                'Expected to have an active state when transforming in a derived store',
            );
            this._state.value = this._transform(values);
            this._dispatch(this._state.value);
        };

        // Subscribe to all underlying stores, and...
        //
        // - on first call, cache the value of each underlying store,
        // - on subsequent calls, update the value of the store that changed, then transform and
        //   dispatch.
        const unsubscribers = this._stores.map((store, index) =>
            store.subscribe((value) => {
                values[index] = [store, value];
                if (!initial) {
                    transformAndDispatch();
                }
            }),
        );

        // Transform the initially aggregated source values and store the result.
        //
        // Note: This will implicitly notify the subscriber we just subscribed.
        transformAndDispatch();
        initial = false;

        // Create aggregated unsubscribe function
        this._state.unsubscribe = () => {
            for (const unsubscribe of unsubscribers) {
                unsubscribe();
            }
        };
    }

    /**
     * Dispatch the value to all subscribers.
     */
    private _dispatch(value: TTransformed): void {
        assert(
            this._state !== undefined,
            'Expected to have an active state when dispatching from a derived store',
        );
        if (this.options?.debug?.log !== undefined && import.meta.env.VERBOSE_LOGGING.STORES) {
            this.options.debug.log.debug(
                `Dispatching value to ${this._state.subscribers.size} subscribers`,
            );
        }
        for (const subscriber of this._state.subscribers) {
            subscriber(value);
        }
    }
}

/**
 * Transfer handler for stores.
 */
export const STORE_TRANSFER_HANDLER: RegisteredTransferHandler<
    LocalStore<unknown, never>,
    RemoteStore<unknown>,
    [
        id: ObjectId<LocalStore<unknown, never>>,
        tag: string,
        prefix: LogPrefix | undefined,
        endpoint: EndpointFor<unknown, CreatedEndpoint>,
        value: WireValue,
    ],
    [
        id: ObjectId<RemoteStore<unknown>>,
        tag: string,
        prefix: LogPrefix | undefined,
        endpoint: EndpointFor<unknown, CreatedEndpoint>,
        value: WireValue,
    ],
    TransferTag.STORE
> = registerTransferHandler({
    tag: TransferTag.STORE,

    serialize: (store: LocalStore<unknown, never>, service: EndpointService) => {
        // Note: Due to the asynchronous nature of bidirectional endpoints,
        //       we will still send ports even if we know that the local
        //       store has already been transmitted at some point. The
        //       remote store reference may have already been gone and we
        //       just haven't noticed, yet.
        //       If this turns out to be expensive, we may want to
        //       optimise this by lazily creating ports on demand
        //       (requiring another RTT).
        const id = service.cache().local.getOrAssignId(store);
        const {local, remote} = service.createEndpointPair();
        const [serialized, transfers] = RemoteStore.expose(service, store, local);
        return [
            [id, store.tag, store.options?.debug?.log?.prefix, remote, serialized],
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            [remote, ...transfers],
        ];
    },

    deserialize: ([id, tag, prefix, endpoint, serialized], service) => {
        let releaser: AbortRaiser | undefined;
        if (import.meta.env.DEBUG && service.debug !== undefined) {
            const count = service.cache().counter?.get(id);
            releaser = service.debug(
                endpoint,
                service.logging.logger(`com.store.${id}#${count}.${tag}`),
            );
        }

        // Check if we already have a cached remote store for this ID. Fall
        // back to creating the remote store.
        return service.cache().remote.getOrCreate(
            id,
            () =>
                RemoteStore.wrap(service, serialized, endpoint, releaser, {
                    debug: {
                        log: prefix !== undefined ? service.logging.logger(...prefix) : undefined,
                        tag,
                    },
                }),
            () => releaseRemote({endpoint, releaser}),
        );
    },
});

/**
 * Release a remote store to be garbage collected on the local side.
 */
function releaseRemote({endpoint, releaser}: {endpoint: Endpoint; releaser?: AbortRaiser}): void {
    endpoint.postMessage(undefined);
    endpoint.close?.();
    releaser?.raise(undefined);
}

/**
 * A remote store reader receives updates from another store on another thread via a
 * {@link Endpoint}.
 */
export class RemoteStore<TValue>
    extends ReadableStore<TValue>
    implements CustomTransferredRemoteMarker<typeof STORE_REMOTE_MARKER>
{
    private static readonly _REGISTRY = new FinalizationRegistry(releaseRemote);
    public readonly [TRANSFERRED_MARKER] = STORE_REMOTE_MARKER;

    /**
     * Create a remote store reader.
     *
     * @param initial The initial value.
     * @param endpoint Port to a remote endpoint we want to attach to.
     */
    private constructor(
        service: EndpointService,
        initial: WireValue,
        endpoint: EndpointFor<TValue>,
        options: StoreOptions<TValue>,
    ) {
        super(service.deserialize<TValue>(initial, true), options);

        // Forward store value updates to all underlying subscribers
        const self = new WeakRef(this);
        function listener({data}: MessageEvent): void {
            // Unregister listener when the reference disappears
            const self_ = self.deref();
            if (self_ === undefined) {
                endpoint.removeEventListener('message', listener);
                return;
            }

            // Update the underlying value and dispatch value to subscribers.
            const serialized = data as WireValue;
            const value = service.deserialize<TValue>(serialized, true);
            self_._value = value;
            self_._dispatch(value);
        }
        endpoint.addEventListener('message', listener);
        endpoint.start?.();
    }

    /**
     * Create a remote store reader from the initial value.
     *
     * @param view The initial value of the store.
     * @param endpoint Endpoint for the store.
     * @param releaser Optional {@link AbortRaiser} signalling an abort when
     *   the store is garbage collected. MUST NOT hold a reference to the
     *   store instance.
     * @returns A remote store reader.
     */
    public static wrap<TValue>(
        service: EndpointService,
        initial: WireValue,
        endpoint: EndpointFor<TValue>,
        releaser: AbortRaiser | undefined,
        options: StoreOptions<TValue>,
    ): RemoteStore<TValue> {
        // Create the store
        const store = new RemoteStore(service, initial, endpoint, options);

        // Tell the local side to unsubscribe and release its endpoint when
        // the remote store is being garbage collected
        this._REGISTRY.register(store, {endpoint, releaser});

        // Done
        return store;
    }

    /**
     * Expose a local store via the provided endpoints.
     *
     * @param storeListener A local store listener.
     * @param endpoint Endpoint for the store.
     * @returns The initial value of the store.
     */
    public static expose<TValue>(
        service: EndpointService,
        storeListener: ISubscribableStore<TValue>,
        endpoint: EndpointFor<TValue>,
    ): readonly [value: WireValue, transfers: readonly DomTransferable[]] {
        // Subscribe on the local listener and forward it via the endpoint.
        let initial: readonly [value: WireValue, transfers: readonly DomTransferable[]] | undefined;
        const storeUnsubscriber = storeListener.subscribe((value) => {
            const [serialized, transfers] = service.serialize(value);
            if (initial === undefined) {
                initial = [serialized, transfers];
            } else {
                endpoint.postMessage(serialized, transfers);
            }
        });
        assert(initial !== undefined, 'Store value must be available after subscription');

        // Unsubscribe from store and close endpoint on any inbound message
        endpoint.addEventListener(
            'message',
            () => {
                storeUnsubscriber();
                endpoint.close?.();
            },
            {once: true},
        );
        endpoint.start?.();

        // Return initial serialized value
        return initial;
    }
}
