import {DeltaUpdateType, TransferTag} from '~/common/enum';
import {type LogPrefix} from '~/common/logging';
import {assert, assertUnreachable, unreachable} from '~/common/utils/assert';
import {
    type CreatedEndpoint,
    type DomTransferable,
    type Endpoint,
    type EndpointFor,
    type EndpointService,
    type HandlerWireValue,
    type MessageEvent,
    type ObjectId,
    type RegisteredTransferHandler,
    registerTransferHandler,
    TRANSFER_MARKER,
    type TransferMarked,
} from '~/common/utils/endpoint';
import {EventController, type EventListener, type EventUnsubscriber} from '~/common/utils/event';
import {type AbortRaiser} from '~/common/utils/signal';
import {
    type IQueryableStore,
    type LocalStore,
    ReadableStore,
    type StoreOptions,
} from '~/common/utils/store';

export type DeltaUpdate<TValue> =
    | [type: Exclude<DeltaUpdateType, DeltaUpdateType.CLEARED>, value: TValue]
    | [type: DeltaUpdateType.CLEARED];

export interface SetStoreDeltaListener<TValue> {
    readonly delta: EventListener<DeltaUpdate<TValue>>;
}

function defaultSetStoreRepresentation(set: ReadonlySet<unknown>): string {
    return `${JSON.stringify([...set])}`;
}

export type ISetStore<TValue> = IQueryableStore<ReadonlySet<TValue>> &
    LocalStore<ReadonlySet<TValue>, typeof SET_STORE_TRANSFER_HANDLER>;

export class LocalSetStore<TValue extends TransferMarked>
    extends ReadableStore<Set<TValue>, ReadonlySet<TValue>>
    implements ISetStore<TValue>, SetStoreDeltaListener<TValue>
{
    public readonly [TRANSFER_MARKER] = SET_STORE_TRANSFER_HANDLER;
    public readonly tag: string;
    private readonly _delta: EventController<DeltaUpdate<TValue>>;

    public constructor(values?: ReadonlySet<TValue>, options?: StoreOptions<ReadonlySet<TValue>>) {
        super(values !== undefined ? new Set(values) : new Set(), {
            debug: {
                ...options?.debug,
                representation: options?.debug?.representation ?? defaultSetStoreRepresentation,
            },
        });
        this.tag = options?.debug?.tag ?? '';
        this._delta = new EventController<DeltaUpdate<TValue>>(
            options?.debug?.log,
            new Set([this]), // Bidirectional coupling to prevent garbage collection
        );
    }

    public get delta(): EventListener<DeltaUpdate<TValue>> {
        return this._delta;
    }

    public add(value: TValue): void {
        if (this._value.has(value)) {
            return;
        }
        this._dispatch(this._value.add(value));
        this._delta.raise([DeltaUpdateType.ADDED, value]);
    }

    public delete(value: TValue): void {
        if (!this._value.delete(value)) {
            return;
        }
        this._dispatch(this._value);
        this._delta.raise([DeltaUpdateType.DELETED, value]);
    }

    public clear(): void {
        this._value.clear();
        this._dispatch(this._value);
        this._delta.raise([DeltaUpdateType.CLEARED]);
    }
}

/**
 * Takes a set store containing stores and does the following:
 *
 * - subscribes only to changes of the set itself, **not** the inner value,
 * - call a derivation function for a single item.
 */
export class LocalDerivedSetStore<TValue extends TransferMarked, TDerived extends TransferMarked>
    extends ReadableStore<Set<TDerived>, ReadonlySet<TDerived>>
    implements ISetStore<TDerived>, SetStoreDeltaListener<TDerived>
{
    public readonly [TRANSFER_MARKER] = SET_STORE_TRANSFER_HANDLER;
    public readonly tag: string;
    private readonly _delta: EventController<DeltaUpdate<TDerived>>;

    /**
     * Keep a reference to the source delta event unsubscriber to prevent garbage collection.
     */
    // @ts-expect-error: ts(6138)
    private readonly _sourceDeltaUnsubscribe: EventUnsubscriber;

    public constructor(
        source: LocalSetStore<TValue>,
        derive: (value: TValue) => TDerived,
        public readonly options?: StoreOptions<ReadonlySet<TDerived>>,
    ) {
        const map = new Map([...source.get()].map((value) => [value, derive(value)]));
        super(new Set(map.values()));
        this.tag = options?.debug?.tag ?? '';
        this._delta = new EventController<DeltaUpdate<TDerived>>(
            options?.debug?.log,
            new Set([this]), // Bidirectional coupling to prevent garbage collection
        );

        // Subscribe to delta updates
        this._sourceDeltaUnsubscribe = source.delta.subscribe(([type, value]) => {
            switch (type) {
                case DeltaUpdateType.ADDED: {
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
                    this._dispatch(this._value.add(derived));
                    this._delta.raise([DeltaUpdateType.ADDED, derived]);
                    break;
                }
                case DeltaUpdateType.DELETED: {
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
                    this._dispatch(this._value);
                    this._delta.raise([DeltaUpdateType.DELETED, derived]);
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
    }

    public get delta(): EventListener<DeltaUpdate<TDerived>> {
        return this._delta;
    }
}

function releaseRemoteSetValues({
    set,
}: {
    readonly set: {
        readonly endpoint: Endpoint;
        readonly releaser?: AbortRaiser;
    };
}): void {
    set.endpoint.postMessage(undefined);
    set.endpoint.close?.();
    set.releaser?.raise();
}

type SerializedSetStoreWireValue =
    /* eslint-disable @typescript-eslint/no-explicit-any */
    | readonly [id: ObjectId<any>, type: undefined, serialized: HandlerWireValue]
    | readonly [id: ObjectId<any>, type: DeltaUpdateType.ADDED, serialized: HandlerWireValue]
    | readonly [id: ObjectId<any>, type: DeltaUpdateType.DELETED, serialized: undefined]
    | readonly [id: undefined, type: DeltaUpdateType.CLEARED, serialized: undefined];
/* eslint-enable @typescript-eslint/no-explicit-any */

export class RemoteSetStore<TValue extends object>
    extends ReadableStore<Set<TValue>, ReadonlySet<TValue>>
    implements SetStoreDeltaListener<TValue>
{
    private static readonly _REGISTRY = new FinalizationRegistry(releaseRemoteSetValues);
    private readonly _delta: EventController<DeltaUpdate<TValue>>;

    private constructor(
        service: EndpointService,
        set: {
            readonly endpoint: EndpointFor<'set'>;
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
        function listener({data}: MessageEvent): void {
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
            const delta = data as SerializedSetStoreWireValue;
            const [id, type, serialized] = delta;
            let value;
            let deltaUpdate: DeltaUpdate<TValue>;
            switch (type) {
                case DeltaUpdateType.ADDED:
                    value = service
                        .cache()
                        .remote.getOrCreate<TValue>(id, () =>
                            service.deserialize<TValue>(serialized, true),
                        );
                    assert(
                        !self_._value.has(value),
                        'Expected value to not already exist when adding as part of a delta update',
                    );
                    self_._value.add(value);
                    deltaUpdate = [type, value];
                    break;
                case DeltaUpdateType.DELETED:
                    value = service.cache().remote.get<TValue>(id);
                    assert(
                        value !== undefined,
                        'Expected value of a delta delete to be available in the cache',
                    );
                    assert(
                        self_._value.delete(value),
                        'Expected value to have been removed when removing as part of a delta delta',
                    );
                    deltaUpdate = [type, value];
                    break;
                case DeltaUpdateType.CLEARED:
                    self_._value.clear();
                    deltaUpdate = [type];
                    break;
                case undefined:
                    assertUnreachable('Expected delta updates but got initial values');
                // eslint-disable-next-line no-fallthrough
                default:
                    unreachable(type);
            }
            self_._value = new Set(self_._value);
            self_._dispatch(self_._value);
            self_._delta.raise(deltaUpdate);
        }
        set.endpoint.addEventListener('message', listener);
        set.endpoint.start?.();
    }

    public static wrap<TValue extends object>(
        service: EndpointService,
        set: {
            readonly endpoint: EndpointFor<'set'>;
            readonly values: readonly SerializedSetStoreWireValue[];
        },
        options: StoreOptions<ReadonlySet<TValue>>,
    ): RemoteSetStore<TValue> {
        // Deserialize values
        const valuePairs = set.values.map((wireValue) => {
            const [id, type, serialized] = wireValue;
            assert(type === undefined, 'Expected initial values to not have a delta type');

            const deserializedValue = service
                .cache()
                .remote.getOrCreate<TValue>(id, () =>
                    service.deserialize<TValue>(serialized, true),
                );

            return [id as ObjectId<TValue>, deserializedValue] as const;
        });

        // Create the store
        const store = new RemoteSetStore(
            service,
            {
                endpoint: set.endpoint,
                values: new Map(valuePairs),
            },
            options,
        );

        // Tell the local side to unsubscribe and release its endpoint when
        // the remote store is being garbage collected
        this._REGISTRY.register(store, {set});

        // Done
        return store;
    }

    public static expose<TValue extends TransferMarked>(
        service: EndpointService,
        store: LocalSetStore<TValue>,
        set: {
            readonly endpoint: EndpointFor<'set'>;
        },
    ): readonly [
        values: readonly SerializedSetStoreWireValue[],
        transfers: readonly DomTransferable[],
    ] {
        // Initially, serialize all values.
        const initial: {
            readonly values: SerializedSetStoreWireValue[];
            readonly transfers: DomTransferable[];
        } = {
            values: [],
            transfers: [],
        };
        for (const value of store.get()) {
            const id = service.cache().local.getOrAssignId(value);
            const [serialized, transfers] = service.serialize(value);
            initial.values.push([id, undefined, serialized]);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            initial.transfers.push(...transfers);
        }

        // Subsequently, push (delta) updates.
        const unsubscriber = store.delta.subscribe(([type, value]) => {
            let delta: SerializedSetStoreWireValue;
            let serialized, transfers;
            switch (type) {
                case DeltaUpdateType.ADDED: {
                    const id = service.cache().local.getOrAssignId(value);
                    [serialized, transfers] = service.serialize(value);
                    delta = [id, type, serialized];
                    break;
                }
                case DeltaUpdateType.DELETED: {
                    const id = service.cache().local.getOrAssignId(value);
                    delta = [id, type, undefined];
                    break;
                }
                case DeltaUpdateType.CLEARED: {
                    delta = [undefined, type, undefined];
                    break;
                }
                default:
                    unreachable(type);
            }
            set.endpoint.postMessage(delta, transfers ?? []);
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
    LocalSetStore<TransferMarked>,
    RemoteSetStore<TransferMarked>,
    readonly [
        id: ObjectId<LocalSetStore<TransferMarked>>,
        tag: string,
        prefix: LogPrefix | undefined,
        endpoint: EndpointFor<'set', CreatedEndpoint>,
        values: readonly SerializedSetStoreWireValue[],
    ],
    readonly [
        id: ObjectId<RemoteSetStore<TransferMarked>>,
        tag: string,
        prefix: LogPrefix | undefined,
        endpoint: EndpointFor<'set', CreatedEndpoint>,
        values: readonly SerializedSetStoreWireValue[],
    ],
    TransferTag.SET_STORE
> = registerTransferHandler({
    tag: TransferTag.SET_STORE,

    serialize: (store, service) => {
        // Get or assign an ID and transmit the necessary store data
        const id = service.cache().local.getOrAssignId(store);
        const endpoint = service.createEndpointPair<'set'>();
        const [values, transfers] = RemoteSetStore.expose(service, store, {
            endpoint: endpoint.local,
        });
        return [
            [id, store.tag, store.options?.debug?.log?.prefix, endpoint.remote, values],
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
                    service.logging.logger(`com.store.${id}#${count}.set.${tag}`),
                ),
            };
        }

        // Check if we already have a cached remote set store for this ID. Fall back to creating a
        // new remote set store.
        return service.cache().remote.getOrCreate(
            id,
            () =>
                RemoteSetStore.wrap<TransferMarked>(
                    service,
                    {
                        endpoint,
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
                // There is already a RemoteSetStore with endpoint, so release the newly created one
                releaseRemoteSetValues({
                    set: {
                        endpoint,
                        releaser: debug?.releaser,
                    },
                }),
        );
    },
});
