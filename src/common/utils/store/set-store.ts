import {DeltaUpdateType, TransferTag} from '~/common/enum';
import {TRANSFERRED_MARKER, TRANSFER_HANDLER} from '~/common/index';
import type {LogPrefix} from '~/common/logging';
import {assert, assertUnreachable, unreachable} from '~/common/utils/assert';
import {
    type CustomTransferable,
    type CustomTransferredRemoteMarker,
    type DomTransferable,
    type EndpointFor,
    type EndpointService,
    type HandlerWireValue,
    type MessageEventLike,
    type ObjectId,
    type RegisteredTransferHandler,
    registerTransferHandler,
    LocalObjectMapper,
    RemoteObjectMapper,
} from '~/common/utils/endpoint';
import {EventController, type EventListener} from '~/common/utils/event';
import type {AbortRaiser} from '~/common/utils/signal';
import {
    type IQueryableStore,
    type LocalStore,
    ReadableStore,
    type StoreOptions,
    type StoreUnsubscriber,
    type StoreTransferDebug,
} from '~/common/utils/store';

/**
 * Symbol to mark a remote as a set store.
 */
export const SET_STORE_REMOTE_MARKER: symbol = Symbol('set-store-remote-marker');

export type DeltaUpdate<TValue> =
    | readonly [type: Exclude<DeltaUpdateType, DeltaUpdateType.CLEARED>, values: readonly TValue[]]
    | readonly [type: DeltaUpdateType.CLEARED];

export interface SetStoreDeltaListener<TValue> {
    readonly delta: EventListener<DeltaUpdate<TValue>>;
}

function defaultSetStoreRepresentation(set: ReadonlySet<unknown>): string {
    return JSON.stringify([...set]);
}

export type ISetStore<TValue> = IQueryableStore<ReadonlySet<TValue>> &
    LocalStore<ReadonlySet<TValue>, typeof SET_STORE_TRANSFER_HANDLER>;

/**
 * A SetStore that can be derived from with delta update support.
 */
export interface IDerivableSetStore<TValue>
    extends ISetStore<TValue>,
        SetStoreDeltaListener<TValue> {}

export class LocalSetStore<TValue>
    extends ReadableStore<Set<TValue>, ReadonlySet<TValue>>
    implements IDerivableSetStore<TValue>
{
    public readonly [TRANSFER_HANDLER] = SET_STORE_TRANSFER_HANDLER;
    public readonly debug: StoreTransferDebug;
    private readonly _delta: EventController<DeltaUpdate<TValue>>;

    public constructor(values?: ReadonlySet<TValue>, options?: StoreOptions<ReadonlySet<TValue>>) {
        super(values !== undefined ? new Set(values) : new Set(), {
            debug: {
                ...options?.debug,
                representation: options?.debug?.representation ?? defaultSetStoreRepresentation,
            },
        });
        this.debug = {
            prefix: options?.debug?.log?.prefix,
            tag: options?.debug?.tag,
        };
        this._delta = new EventController<DeltaUpdate<TValue>>(options?.debug?.log);
    }

    public get delta(): EventListener<DeltaUpdate<TValue>> {
        return this._delta;
    }

    public add(value: TValue): void {
        if (this._value.has(value)) {
            return;
        }
        if (import.meta.env.VERBOSE_LOGGING.STORES) {
            this._log?.debug('Adding value to set');
        }
        this._dispatch(this._value.add(value));
        this._delta.raise([DeltaUpdateType.ADDED, [value]]);
    }

    public delete(value: TValue): void {
        if (!this._value.delete(value)) {
            return;
        }
        if (import.meta.env.VERBOSE_LOGGING.STORES) {
            this._log?.debug('Removed value from set');
        }
        this._dispatch(this._value);
        this._delta.raise([DeltaUpdateType.DELETED, [value]]);
    }

    public clear(): void {
        this._value.clear();
        if (import.meta.env.VERBOSE_LOGGING.STORES) {
            this._log?.debug('Cleared all values from set');
        }
        this._dispatch(this._value);
        this._delta.raise([DeltaUpdateType.CLEARED]);
    }
}

/**
 * An {@link ISetStore} implementation that subscribes to a `Store<Set<T>>` and propagates
 * delta-updates from the provided full set.
 *
 * In other words, it converts a `Store<Set<T>>` to a `SetStore<T>`.
 *
 * Note that only changed object references are compared when calculating the delta update.
 */
export class LocalSetBasedSetStore<TValue>
    extends ReadableStore<ReadonlySet<TValue>>
    implements IDerivableSetStore<TValue>
{
    private static readonly _REGISTRY = new FinalizationRegistry<StoreUnsubscriber>(
        (unsubscriber) => unsubscriber(),
    );

    public readonly [TRANSFER_HANDLER] = SET_STORE_TRANSFER_HANDLER;
    public readonly debug: StoreTransferDebug;
    private readonly _delta: EventController<DeltaUpdate<TValue>>;

    public constructor(
        source: IQueryableStore<ReadonlySet<TValue>>,
        options?: StoreOptions<ReadonlySet<TValue>>,
    ) {
        super(source.get(), options);
        this.debug = {
            prefix: options?.debug?.log?.prefix,
            tag: options?.debug?.tag,
        };
        this._delta = new EventController<DeltaUpdate<TValue>>(options?.debug?.log);
        const unsubscriber = source.subscribe((newSet) => this._updateFromSet(newSet));
        LocalSetBasedSetStore._REGISTRY.register(this, unsubscriber);
    }

    public get delta(): EventListener<DeltaUpdate<TValue>> {
        return this._delta;
    }

    /**
     * Create delta update from a provided full new Set.
     *
     * Note: Only object references are taken into account when calculating the delta update!
     */
    private _updateFromSet(newSet: ReadonlySet<TValue>): void {
        // Special case: Empty set
        if (newSet.size === 0) {
            if (this._value.size !== 0) {
                // This might be a single item delete, but the result is the same - the subscriber
                // of the SetStore just gets an empty set.
                this._value = newSet;
                this._delta.raise([DeltaUpdateType.CLEARED]);
                this._dispatch(this._value);
            }
            return;
        }

        // Calculate diff of old and new set
        //
        // Note: Could be replaced with actual set operations once V8 finally gets around to implement
        // the set methods proposal: https://github.com/tc39/proposal-set-methods/issues/78
        const added = [...newSet].filter((x) => !this._value.has(x));
        const deleted = [...this._value].filter((x) => !newSet.has(x));

        // Raise delta updates. First delete, then add, for memory efficiency reasons.
        if (deleted.length > 0) {
            this._delta.raise([DeltaUpdateType.DELETED, deleted]);
        }
        if (added.length > 0) {
            this._delta.raise([DeltaUpdateType.ADDED, added]);
        }

        // Replace inner set and notify subscribers
        this._value = newSet;
        this._dispatch(this._value);
    }
}

/**
 * Takes a set store containing stores and does the following:
 *
 * - subscribes only to changes of the set itself, **not** the inner value,
 * - call a derivation function for a single item.
 */
export class LocalDerivedSetStore<TValue, TDerived>
    extends ReadableStore<Set<TDerived>, ReadonlySet<TDerived>>
    implements IDerivableSetStore<TDerived>
{
    private static readonly _REGISTRY = new FinalizationRegistry<StoreUnsubscriber>(
        (unsubscriber) => unsubscriber(),
    );

    public readonly [TRANSFER_HANDLER] = SET_STORE_TRANSFER_HANDLER;
    public readonly debug: StoreTransferDebug;
    private readonly _delta: EventController<DeltaUpdate<TDerived>>;

    public constructor(
        source: IDerivableSetStore<TValue>,
        derive: (value: TValue) => TDerived,
        options?: StoreOptions<ReadonlySet<TDerived>>,
    ) {
        const map = new Map([...source.get()].map((value) => [value, derive(value)]));
        super(new Set(map.values()));
        this.debug = {
            prefix: options?.debug?.log?.prefix,
            tag: options?.debug?.tag,
        };
        this._delta = new EventController<DeltaUpdate<TDerived>>(options?.debug?.log);

        // Subscribe to delta updates
        const unsubscriber = source.delta.subscribe(([type, values]) => {
            switch (type) {
                case DeltaUpdateType.ADDED: {
                    const derivedValues = values.map((value) => {
                        const derived = derive(value);
                        assert(
                            !map.has(value),
                            'Expected source value to not already exist on delta add',
                        );
                        assert(
                            !this._value.has(derived),
                            'Expected derived value to not already exist on delta add',
                        );
                        map.set(value, derived);
                        this._value.add(derived);
                        return derived;
                    });
                    this._dispatch(this._value);
                    this._delta.raise([DeltaUpdateType.ADDED, derivedValues]);
                    break;
                }
                case DeltaUpdateType.DELETED: {
                    const derivedValues = values.map((value) => {
                        const derived = map.get(value);
                        assert(
                            derived !== undefined,
                            'Expected derived value to be available on delta delete',
                        );
                        assert(
                            map.delete(value),
                            'Expected source value to have been removed on delta delete',
                        );
                        assert(
                            this._value.delete(derived),
                            'Expected derived to have been removed on delta delete',
                        );
                        return derived;
                    });
                    this._dispatch(this._value);
                    this._delta.raise([DeltaUpdateType.DELETED, derivedValues]);
                    break;
                }
                case DeltaUpdateType.CLEARED: {
                    map.clear();
                    this._value.clear();
                    this._dispatch(this._value);
                    this._delta.raise([DeltaUpdateType.CLEARED]);
                    break;
                }
                default:
                    unreachable(type);
            }
        });
        LocalDerivedSetStore._REGISTRY.register(this, unsubscriber);
    }

    public get delta(): EventListener<DeltaUpdate<TDerived>> {
        return this._delta;
    }
}

function releaseRemoteSetValues({
    set,
}: {
    readonly set: {
        readonly endpoint: EndpointFor<'set', undefined, unknown>;
        readonly releaser?: AbortRaiser;
    };
}): void {
    set.endpoint.postMessage(undefined);
    set.endpoint.close?.();
    set.releaser?.raise(undefined);
}

interface SerializedSetStoreWireValueInitial<TValue> {
    readonly type: undefined;
    readonly id: ObjectId<TValue>;
    readonly serialized: HandlerWireValue;
}

interface SerializedSetStoreWireValueAdd<TValue> {
    readonly type: DeltaUpdateType.ADDED;
    readonly objects: {
        readonly id: ObjectId<TValue>;
        readonly serialized: HandlerWireValue;
    }[];
}

interface SerializedSetStoreWireValueDelete<TValue> {
    readonly type: DeltaUpdateType.DELETED;
    readonly objects: {
        readonly id: ObjectId<TValue>;
    }[];
}

interface SerializedSetStoreWireValueClear {
    readonly type: DeltaUpdateType.CLEARED;
}

/**
 * Type of the values that are serialized between the two threads when sending delta updates.
 */
type SerializedSetStoreWireValue<TTarget> =
    | SerializedSetStoreWireValueInitial<TTarget>
    | SerializedSetStoreWireValueAdd<TTarget>
    | SerializedSetStoreWireValueDelete<TTarget>
    | SerializedSetStoreWireValueClear;

export class RemoteSetStore<TValue extends object>
    extends ReadableStore<Set<TValue>, ReadonlySet<TValue>>
    implements
        SetStoreDeltaListener<TValue>,
        CustomTransferredRemoteMarker<typeof SET_STORE_REMOTE_MARKER>
{
    private static readonly _REGISTRY = new FinalizationRegistry(releaseRemoteSetValues);
    public readonly [TRANSFERRED_MARKER] = SET_STORE_REMOTE_MARKER;
    private readonly _delta: EventController<DeltaUpdate<TValue>>;

    private constructor(
        service: EndpointService,
        mapper: RemoteObjectMapper<TValue>,
        set: {
            readonly endpoint: EndpointFor<'set', undefined, SerializedSetStoreWireValue<TValue>>;
            readonly values: Map<ObjectId<TValue>, TValue>;
        },
        options: StoreOptions<ReadonlySet<TValue>>,
    ) {
        // Apply initial values
        super(new Set(set.values.values()), {
            ...options,
            debug: {
                ...options.debug,
                representation: options.debug?.representation ?? defaultSetStoreRepresentation,
            },
        });
        this._delta = new EventController<DeltaUpdate<TValue>>(options.debug?.log);

        // Forward set updates to all underlying subscribers
        const self = new WeakRef(this);
        const listener = ({data}: MessageEventLike<SerializedSetStoreWireValue<TValue>>): void => {
            // Unregister listener when the reference disappears
            const self_ = self.deref();
            if (self_ === undefined) {
                set.endpoint.removeEventListener('message', listener);
                return;
            }

            // Handle subsequent (delta) updates.
            //
            // Note: We need to create a new `Set` instance, so the diffing algorithm of Svelte
            //       works in _immutable_ mode!
            const delta = data;
            let deltaUpdate: DeltaUpdate<TValue>;
            switch (delta.type) {
                case DeltaUpdateType.ADDED: {
                    if (import.meta.env.VERBOSE_LOGGING.STORES) {
                        this._log?.debug('Adding value to set');
                    }
                    const values = [];
                    for (const object of delta.objects) {
                        const value = mapper.getOrCreate(
                            object.id,
                            () => service.deserialize<TValue>(object.serialized, true),
                            // Note: We **must** deserialize in the _hit_ case as well since the
                            // endpoint provided as part of TValue would otherwise linger indefinitely
                            // and therefore leak memory.
                            () => service.deserialize<TValue>(object.serialized, true),
                        );
                        assert(
                            !self_._value.has(value),
                            'Expected value to not already exist when adding as part of a delta update',
                        );
                        self_._value.add(value);
                        values.push(value);
                    }
                    deltaUpdate = [delta.type, values];
                    break;
                }
                case DeltaUpdateType.DELETED: {
                    if (import.meta.env.VERBOSE_LOGGING.STORES) {
                        this._log?.debug('Removed value from set');
                    }
                    const values = [];
                    for (const object of delta.objects) {
                        const value = mapper.get(object.id);
                        assert(
                            value !== undefined,
                            'Expected value of a delta delete to be available in the cache',
                        );
                        assert(
                            self_._value.delete(value),
                            'Expected value to have been removed when removing as part of a delta delete',
                        );
                        values.push(value);
                    }
                    deltaUpdate = [delta.type, values];
                    break;
                }
                case DeltaUpdateType.CLEARED:
                    if (import.meta.env.VERBOSE_LOGGING.STORES) {
                        this._log?.debug('Cleared all values from set');
                    }
                    self_._value.clear();
                    deltaUpdate = [delta.type];
                    break;
                case undefined:
                    assertUnreachable('Expected delta updates but got initial values');
                // eslint-disable-next-line no-fallthrough
                default:
                    unreachable(delta);
            }
            self_._value = new Set(self_._value);
            self_._dispatch(self_._value);
            self_._delta.raise(deltaUpdate);
        };
        set.endpoint.addEventListener('message', listener);
        set.endpoint.start?.();
    }

    public static wrap<TValue extends object>(
        service: EndpointService,
        set: {
            readonly endpoint: EndpointFor<'set', undefined, SerializedSetStoreWireValue<TValue>>;
            readonly values: readonly SerializedSetStoreWireValue<TValue>[];
        },
        options: StoreOptions<ReadonlySet<TValue>>,
    ): RemoteSetStore<TValue> {
        // Note: We want to lookup arbitrary TValues by unique IDs, so using the global object cache
        // would be confusing. This essentially maintains a map whose values mirror our set.
        const mapper = new RemoteObjectMapper<TValue>();

        // When wrapping the store, all initial values will be transferred. Future updates will be
        // sent as delta updates.
        const values = set.values.map((wireValue) => {
            assert(
                wireValue.type === undefined,
                'Expected initial values to not have a delta type',
            );

            const deserializedValue = mapper.getOrCreate(
                wireValue.id,
                () => service.deserialize<TValue>(wireValue.serialized, true),
                // Note: We **must** deserialize in the _hit_ case as well since the
                // endpoint provided as part of TValue would otherwise linger indefinitely
                // and therefore leak memory.
                () => service.deserialize<TValue>(wireValue.serialized, true),
            );

            return [wireValue.id, deserializedValue] as const;
        });

        // Create the store
        const store = new RemoteSetStore(
            service,
            mapper,
            {
                endpoint: set.endpoint,
                values: new Map(values),
            },
            options,
        );

        // Tell the local side to unsubscribe and release its endpoint when
        // the remote store is being garbage collected
        this._REGISTRY.register(store, {set});

        // Done
        return store;
    }

    public static expose<TValue extends CustomTransferable>(
        service: EndpointService,
        store: LocalSetStore<TValue>,
        set: {
            readonly endpoint: EndpointFor<'set', SerializedSetStoreWireValue<TValue>, undefined>;
        },
    ): readonly [
        values: readonly SerializedSetStoreWireValue<TValue>[],
        transfers: readonly DomTransferable[],
    ] {
        // Note: We want to assign unique IDs to arbitrary TValues, so using the global object cache
        // would be confusing.
        const mapper = new LocalObjectMapper<TValue>();

        // Initially, serialize all values
        const initial: {
            readonly values: SerializedSetStoreWireValue<TValue>[];
            readonly transfers: DomTransferable[];
        } = {
            values: [],
            transfers: [],
        };
        for (const value of store.get()) {
            const id = mapper.getOrAssignId(value);
            const [serialized, transfers] = service.serialize(value);
            initial.values.push({type: undefined, id, serialized});
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            initial.transfers.push(...transfers);
        }

        // Subsequently, push (delta) updates
        const unsubscriber = store.delta.subscribe(([type, values]) => {
            let delta: SerializedSetStoreWireValue<TValue>;
            const transfers = [];
            switch (type) {
                case DeltaUpdateType.ADDED: {
                    const objects = [];
                    for (const value of values) {
                        const id = mapper.getOrAssignId(value);
                        const [serialized, valueTransfers] = service.serialize(value);
                        objects.push({id, serialized});
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                        transfers.push(...valueTransfers);
                    }
                    delta = {type, objects};
                    break;
                }
                case DeltaUpdateType.DELETED: {
                    const objects = [];
                    for (const value of values) {
                        const id = mapper.getId(value);
                        assert(
                            id !== undefined,
                            'Expected id of a delta delete to be available in the cache',
                        );
                        objects.push({id});
                    }
                    delta = {type, objects};
                    break;
                }
                case DeltaUpdateType.CLEARED: {
                    delta = {type};
                    break;
                }
                default:
                    unreachable(type);
            }
            set.endpoint.postMessage(delta, transfers);
        });

        // Unsubscribe from store and close endpoint on any inbound message
        set.endpoint.addEventListener(
            'message',
            () => {
                unsubscriber();
                set.endpoint.close?.();
            },
            {once: true},
        );
        set.endpoint.start?.();

        // Return initial values and transfers
        return [initial.values, initial.transfers];
    }

    public get delta(): EventListener<DeltaUpdate<TValue>> {
        return this._delta;
    }
}

const SET_STORE_TRANSFER_HANDLER: RegisteredTransferHandler<
    LocalSetStore<CustomTransferable>,
    RemoteSetStore<CustomTransferable>,
    readonly [
        id: ObjectId<LocalSetStore<CustomTransferable>>,
        tag: string | undefined,
        prefix: LogPrefix | undefined,
        endpoint: EndpointFor<'set', undefined, SerializedSetStoreWireValue<unknown>>,
        values: readonly SerializedSetStoreWireValue<CustomTransferable>[],
    ],
    readonly [
        id: ObjectId<RemoteSetStore<CustomTransferable>>,
        tag: string | undefined,
        prefix: LogPrefix | undefined,
        endpoint: EndpointFor<'set', undefined, SerializedSetStoreWireValue<unknown>>,
        values: readonly SerializedSetStoreWireValue<CustomTransferable>[],
    ],
    TransferTag.SET_STORE
> = registerTransferHandler({
    tag: TransferTag.SET_STORE,

    serialize: (store, service) => {
        // Get or assign an ID and transmit the necessary store data
        const id = service.cache().local.getOrAssignId(store);
        const endpoint = service.createEndpointPair<
            'set',
            SerializedSetStoreWireValue<unknown>,
            undefined
        >();
        const [values, transfers] = RemoteSetStore.expose(service, store, {
            endpoint: endpoint.local,
        });

        return [
            [id, store.debug.tag, store.debug.prefix, endpoint.remote, values],
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            [endpoint.remote, ...transfers],
        ];
    },

    deserialize: ([id, tag, prefix, endpoint, values], service) => {
        let debug: {readonly releaser: AbortRaiser} | undefined;
        if (import.meta.env.DEBUG && service.debug !== undefined) {
            const count = service.cache().counter?.get(id);
            debug = {
                releaser: service.debug(
                    endpoint,
                    service.logging.logger(`com.store.${id}#${count}.set.${tag ?? '???'}`),
                ),
            };
        }

        // Check if we already have a cached remote set store for this ID. Fall back to creating a
        // new remote set store.
        return service.cache().remote.getOrCreate(
            id,
            () =>
                RemoteSetStore.wrap<CustomTransferable>(
                    service,
                    {
                        endpoint: endpoint as EndpointFor<
                            'set',
                            undefined,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            SerializedSetStoreWireValue<any>
                        >,
                        values,
                    },
                    {
                        debug: {
                            log:
                                prefix !== undefined
                                    ? service.logging.logger(...prefix)
                                    : undefined,
                            tag,
                        },
                    },
                ),
            () =>
                releaseRemoteSetValues({
                    set: {
                        endpoint,
                        releaser: debug?.releaser,
                    },
                }),
        );
    },
});
