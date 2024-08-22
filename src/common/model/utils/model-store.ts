import {TransferTag} from '~/common/enum';
import {RELEASE_PROXY, TRANSFERRED_MARKER, TRANSFER_HANDLER} from '~/common/index';
import type {Logger, LogPrefix} from '~/common/logging';
import type {Model, ModelController, RemoteModel, RemoteModelController} from '~/common/model';
import type {WeakOpaque} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {
    type CustomTransferable,
    type CustomTransferredRemoteMarker,
    type EndpointFor,
    type EndpointPairFor,
    type EndpointService,
    type MessageEventLike,
    type ObjectId,
    type ProxyEndpointMethods,
    type RegisteredTransferHandler,
    registerTransferHandler,
    type Endpoint,
    type ProxyEndpoint,
    type ProxyMarked,
    type ProxyEndpointPair,
} from '~/common/utils/endpoint';
import type {AbortRaiser} from '~/common/utils/signal';
import {
    type ISubscribableStore,
    NO_STORE_VALUE,
    ReadableStore,
    type StoreOptions,
    type StoreTransferDebug,
} from '~/common/utils/store';

/**
 * Symbol to mark an interface as a model.
 */
export const MODEL_MARKER = Symbol('model-marker');

/**
 * Symbol to mark a remote as a model store.
 */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const MODEL_STORE_REMOTE_MARKER: symbol = Symbol('model-store-remote-marker');

function defaultModelRepresentation<TView>({view}: {readonly view: TView}): string {
    return JSON.stringify(view);
}

/** Marker to ensure that an updated view is not the same object as the previous view. */
export type UpdatedView<TView> = WeakOpaque<TView, {readonly UpdatedView: unique symbol}>;

export type ViewUpdateFn<TView> = (view: Readonly<TView>) => UpdatedView<Readonly<TView>>;

/**
 * An updateable model store.
 *
 * Note: Svelte compatibility is limited to a readable store.
 */
export class ModelStore<
        TModel extends Model<TView, TController, TCtx, TType>,
        TView = TModel['view'],
        TController extends ModelController<TView> = TModel['controller'],
        TCtx = TModel['ctx'],
        TType = TModel['type'],
    >
    extends ReadableStore<
        // Make the underlying view property mutable within this class but dispatch it as-is (readonly)
        Model<TView, TController, TCtx, TType> & {view: Readonly<TView>},
        Model<TView, TController, TCtx, TType>
    >
    implements CustomTransferable<typeof MODEL_STORE_TRANSFER_HANDLER>
{
    public readonly [TRANSFER_HANDLER] = MODEL_STORE_TRANSFER_HANDLER;
    public readonly debug: StoreTransferDebug;

    /**
     * Create an updatedable model store.
     *
     * @param view The initial view.
     * @param controller The controller for the store.
     * @param ctx Context to be transmitted.
     * @param type Type to be transmitted.
     * @param options Additional store options.
     */
    public constructor(
        view: TView,
        controller: TController,
        public readonly ctx: TCtx,
        public readonly type: TType,
        options?: StoreOptions<Model<TView, TController, TCtx, TType>>,
    ) {
        const model = {
            view,
            controller,
            ctx,
            type,
        };
        super(model, {
            ...options,
            debug: {
                ...options?.debug,
                representation: options?.debug?.representation ?? defaultModelRepresentation,
            },
        });
        this.debug = {
            prefix: options?.debug?.log?.prefix,
            tag: options?.debug?.tag,
        };

        // Activate the controller
        controller.meta.activate({
            getView: () => this.get().view,
            updateView: (fn) => this._updateView(fn),
        });
    }

    /**
     * Update the view of the model in a callback function.
     *
     * @param fn A function which will be called with the current view.
     *   Once it returns, the modified view will be dispatched to the
     *   controller and then to all subscribers.
     */
    private _updateView(fn: ViewUpdateFn<TView>): void {
        this._value.view = fn(this._value.view);
        this._dispatch(this._value);
    }
}

/**
 * Release a remote model to be garbage collected on the local side.
 */
function releaseRemoteModelStore({
    view,
    controller,
}: {
    readonly view: {
        readonly endpoint: Endpoint<undefined, unknown>;
        readonly releaser?: AbortRaiser;
    };
    readonly controller: ProxyEndpointMethods;
}): void {
    view.endpoint.postMessage(undefined);
    view.endpoint.close?.();
    view.releaser?.raise(undefined);
    controller[RELEASE_PROXY]();
}

/**
 * A remote model store reader receives updates from a local model store on another thread via a
 * {@link Endpoint}.
 */
export class RemoteModelStore<
        TModel extends Model<TView, TModelController, TCtx, TType>,
        TView = TModel['view'],
        TModelController extends ModelController<TView> = TModel['controller'],
        TCtx = TModel['ctx'],
        TType = TModel['type'],
    >
    extends ReadableStore<RemoteModel<TView, RemoteModelController<TModelController>, TCtx, TType>>
    implements CustomTransferredRemoteMarker<typeof MODEL_STORE_REMOTE_MARKER>
{
    private static readonly _REGISTRY = new FinalizationRegistry(releaseRemoteModelStore);

    public [TRANSFERRED_MARKER] = MODEL_STORE_REMOTE_MARKER;

    private constructor(
        public readonly id: ObjectId<RemoteModelStore<TModel>>,
        view: {
            readonly value: TView;
            readonly endpoint: EndpointFor<'view', undefined, TView>;
        },
        controller: RemoteModelController<TModelController>,
        public readonly ctx: TCtx,
        public readonly type: TType,
        options: StoreOptions<
            RemoteModel<TView, RemoteModelController<TModelController>, TCtx, TType>
        >,
    ) {
        super(
            {view: view.value, controller, ctx, type},
            {
                ...options,
                debug: {
                    ...options.debug,
                    representation: options.debug?.representation ?? defaultModelRepresentation,
                },
            },
        );

        // Forward model view updates to all underlying subscribers
        const self = new WeakRef(this);
        function listener({data}: MessageEventLike<TView>): void {
            // Unregister listener when the reference disappears
            const self_ = self.deref();
            if (self_ === undefined) {
                view.endpoint.removeEventListener('message', listener);
                return;
            }

            // Update the underlying view and dispatch the model.
            // Note: We need to clone the `value` object, so the diffing
            //       algorithm of Svelte works!
            const updated = data;
            self_._value = {...self_._value, view: updated};
            self_._dispatch(self_._value);
        }
        view.endpoint.addEventListener('message', listener);
        view.endpoint.start?.();
    }

    /**
     * Create a remote model store reader, attached to a local model store.
     *
     * @param service Endpoint service.
     * @param id Object id that was assigned to the store.
     * @param view The initial view data and endpoint.
     * @param controller A remote controller proxy.
     * @param ctx Context that has been transmitted.
     * @param type Type that has been transmitted.
     * @param options Additional store options.
     */
    public static wrap<
        TModel extends Model<TView, TModelController, TCtx, TType>,
        TView = TModel['view'],
        TModelController extends ModelController<TView> = TModel['controller'],
        TCtx = TModel['ctx'],
        TType = TModel['type'],
    >(
        service: EndpointService,
        id: ObjectId<RemoteModelStore<TModel>>,
        view: {
            readonly value: TView;
            readonly endpoint: EndpointFor<'view', undefined, TView>;
            readonly releaser?: AbortRaiser;
        },
        controller: {
            readonly endpoint: ProxyEndpoint<TModelController>;
            readonly log?: Logger;
        },
        ctx: TCtx,
        type: TType,
        options: StoreOptions<
            RemoteModel<TView, RemoteModelController<TModelController>, TCtx, TType>
        >,
    ): RemoteModelStore<TModel> {
        // Create the store
        const proxy = service.wrap(
            controller.endpoint,
            controller.log,
        ) as RemoteModelController<TModelController> & ProxyEndpointMethods; // Terrible cast!
        const store = new RemoteModelStore(id, view, proxy, ctx, type, options);

        // Tell the local side to unsubscribe and release its endpoint when
        // the remote store is being garbage collected
        this._REGISTRY.register(store, {
            view,
            controller: proxy,
        });

        // Done
        return store;
    }

    /**
     * Expose a local model store via the provided endpoints.
     *
     * @param service Endpoint service.
     * @param storeListener A local store listener to attach to.
     * @param view The initial view of the store.
     * @param endpoint Endpoints for the model and the controller.
     * @returns The initial view, as well as ctx and type of the store.
     */
    public static expose<
        TModel extends Model<TView, TModelController, TCtx, TType>,
        TView = TModel['view'],
        TModelController extends ModelController<TModel['view']> = TModel['controller'],
        TCtx = TModel['ctx'],
        TType = TModel['type'],
    >(
        service: EndpointService,
        storeListener: ISubscribableStore<TModel>,
        view: {
            readonly endpoint: EndpointFor<'view', unknown, undefined>;
        },
        controller: {
            readonly endpoint: ProxyEndpoint<TModelController>;
            readonly log?: Logger;
        },
    ): [view: TView, ctx: TCtx, type: TType] {
        // Subscribe on the local listener and forward it via the endpoint.
        let initial: TModel | typeof NO_STORE_VALUE = NO_STORE_VALUE;
        const storeUnsubscriber = storeListener.subscribe((model) => {
            if (initial === NO_STORE_VALUE) {
                initial = model;
            } else {
                view.endpoint.postMessage(initial.view);
            }
        });
        assert(initial !== NO_STORE_VALUE, 'Store value must be available after subscription');
        service.exposeProxy((initial as TModel).controller, controller.endpoint, controller.log);

        // Unsubscribe from store and close endpoint on any inbound message
        view.endpoint.addEventListener(
            'message',
            () => {
                storeUnsubscriber();
                view.endpoint.close?.();
            },
            {once: true},
        );
        view.endpoint.start?.();

        // Return initial view and ctx
        return [(initial as TModel).view, (initial as TModel).ctx, (initial as TModel).type];
    }
}

const MODEL_STORE_TRANSFER_HANDLER: RegisteredTransferHandler<
    ModelStore<never>,
    RemoteModelStore<never>,
    [
        id: ObjectId<ModelStore<never>>,
        ctx: unknown,
        type: unknown,
        tag: string | undefined,
        prefix: LogPrefix | undefined,
        viewEndpoint: EndpointFor<'view', undefined, unknown>,
        viewValue: unknown,
        controllerEndpoint: ProxyEndpoint<ProxyMarked>,
    ],
    [
        id: ObjectId<RemoteModelStore<never>>,
        ctx: unknown,
        type: unknown,
        tag: string | undefined,
        prefix: LogPrefix | undefined,
        viewEndpoint: EndpointFor<'view', undefined, unknown>,
        viewValue: unknown,
        controllerEndpoint: ProxyEndpoint<ProxyMarked>,
    ],
    TransferTag.MODEL_STORE
> = registerTransferHandler({
    tag: TransferTag.MODEL_STORE,

    serialize: (
        store: ModelStore<never>,
        service: EndpointService,
    ): [
        value: [
            id: ObjectId<ModelStore<never>>,
            ctx: unknown,
            type: unknown,
            tag: string | undefined,
            prefix: LogPrefix | undefined,
            viewEndpoint: EndpointFor<'view', undefined, unknown>,
            viewValue: unknown,
            controllerEndpoint: ProxyEndpoint<ProxyMarked>,
        ],
        transfers: [
            viewEndpoint: EndpointFor<'view', undefined, unknown>,
            controllerEndpoint: ProxyEndpoint<ProxyMarked>,
        ],
    ] => {
        // Get or assign an ID and transmit the necessary store data
        const id = service.cache().local.getOrAssignId(store);
        const view: {
            readonly endpoints: EndpointPairFor<'view', unknown, undefined>;
            value: unknown;
        } = {
            endpoints: service.createEndpointPair(),
            value: undefined,
        };
        const controller: {
            readonly endpoints: ProxyEndpointPair<ProxyMarked>;
            log?: Logger;
        } = {
            endpoints: service.createEndpointPair<ProxyMarked>(),
        };
        if (import.meta.env.DEBUG) {
            const count = service.cache().counter?.get(id);
            controller.log = service.logging.logger(
                `com.store.${id}#${count}.model.${store.debug.tag ?? '???'}.controller`,
            );
        }
        let ctx: unknown;
        let type: unknown;
        [view.value, ctx, type] = RemoteModelStore.expose(
            service,
            store,
            {
                endpoint: view.endpoints.local,
            },
            {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                endpoint: controller.endpoints.local as ProxyEndpoint<any>,
                log: controller.log,
            },
        );
        return [
            [
                id,
                ctx,
                type,
                store.debug.tag,
                store.debug.prefix,
                view.endpoints.remote,
                view.value,
                controller.endpoints.remote,
            ],
            [view.endpoints.remote, controller.endpoints.remote],
        ];
    },

    deserialize: (
        [id, ctx, type, tag, prefix, viewEndpoint, viewValue, controllerEndpoint]: [
            id: ObjectId<RemoteModelStore<never>>,
            ctx: unknown,
            type: unknown,
            tag: string | undefined,
            prefix: LogPrefix | undefined,
            viewEndpoint: EndpointFor<'view', undefined, unknown>,
            viewValue: unknown,
            controllerEndpoint: ProxyEndpoint<ProxyMarked>,
        ],
        service: EndpointService,
    ): RemoteModelStore<never> => {
        let debug:
            | {
                  readonly model: {
                      readonly releaser: AbortRaiser;
                  };
                  readonly controller: {
                      readonly log: Logger;
                  };
              }
            | undefined;
        if (import.meta.env.DEBUG && service.debug !== undefined) {
            const count = service.cache().counter?.get(id);
            debug = {
                model: {
                    releaser: service.debug(
                        viewEndpoint,
                        service.logging.logger(`com.store.${id}#${count}.model.${tag ?? '???'}`),
                    ),
                },
                controller: {
                    log: service.logging.logger(
                        `com.store.${id}#${count}.model.${tag ?? '???'}.controller`,
                    ),
                },
            };
        }

        // Check if we already have a cached remote model store for this ID.
        // Fall back to creating a new remote model store.
        return service.cache().remote.getOrCreate(
            id,
            () =>
                RemoteModelStore.wrap<never>(
                    service,
                    id,
                    {
                        value: viewValue as never, // Ugly cast
                        endpoint: viewEndpoint as EndpointFor<'view', undefined, never>, // Ugly cast
                        releaser: debug?.model.releaser,
                    },
                    {
                        endpoint: controllerEndpoint as ProxyEndpoint<never>, // Ugly cast
                        log: debug?.controller.log,
                    },
                    ctx as never, // Ugly cast
                    type as never, // Ugly cast
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
                releaseRemoteModelStore({
                    view: {
                        endpoint: viewEndpoint,
                        releaser: debug?.model.releaser,
                    },
                    controller: service.wrap(controllerEndpoint, debug?.controller.log),
                }),
        );
    },
});
