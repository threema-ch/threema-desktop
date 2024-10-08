import type {ServicesForBackend} from '~/common/backend';
import type {DatabaseBackend} from '~/common/db';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {ModelStore, RemoteModelStore} from '~/common/model/utils/model-store';
import type {ActiveTaskCodecHandle, PassiveTaskCodecHandle} from '~/common/network/protocol/task';
import type {TaskManager} from '~/common/network/protocol/task/manager';
import type {ProxyMarked, RemoteProxy} from '~/common/utils/endpoint';

/**
 * Services required by the model backend.
 */
export type ServicesForModel = Pick<
    ServicesForBackend,
    | 'blob'
    | 'config'
    | 'crypto'
    | 'device'
    | 'directory'
    | 'endpoint'
    | 'file'
    | 'loadingInfo'
    | 'logging'
    | 'media'
    | 'model'
    | 'nonces'
    | 'notification'
    | 'sfu'
    | 'systemDialog'
    | 'persistentProtocolState'
    | 'volatileProtocolState'
    | 'webrtc'
    | 'work'
> & {
    readonly db: DatabaseBackend;
    readonly taskManager: Pick<TaskManager, 'schedule'>;
};

/**
 * A handle to the controller's associated store, guarded by the {@link ModelLifetimeGuard}.
 *
 * IMPORTANT: Only valid while running within a {@link ModelLifetimeGuard} executor. Async executors
 *            are **not** allowed!
 */
export interface GuardedStoreHandle<in out TView> {
    /**
     * Get the current view of the associated store's model.
     */
    readonly view: () => Readonly<TView>;

    /**
     * Alias to {@link ModelLifetimeGuard.update}.
     */
    readonly update: (fn: (view: Readonly<TView>) => Partial<TView>) => void;
}

/**
 * A local model controller.
 */
export type ModelController<TView> = {
    readonly lifetimeGuard: ModelLifetimeGuard<TView>;
} & ProxyMarked;

/**
 * A remote controller of a model.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RemoteModelController<TModelController extends ModelController<any>> = RemoteProxy<
    Omit<Readonly<TModelController>, 'lifetimeGuard'>
>;

/**
 * A model where the controller lives on the local side.
 *
 * IMPORTANT: Because the {@link view} property is replaced on each update, this object should not
 *            be forward to other functions. Either forward the associated {@link ModelStore}
 *            **or** the current {@link view} snapshot.
 */
export interface Model<
    TView,
    TController extends ModelController<TView>,
    TCtx = undefined,
    TType = undefined,
> {
    /**
     * Current data of the model. Must be structurally cloneable. This is the only field that will
     * be **replaced with another object** in case it is being updated.
     */
    readonly view: Readonly<TView>;

    /**
     * Methods available on the model. The controller is a proxy when used by another endpoint.
     */
    readonly controller: TController;

    /**
     * Arbitrary context data. May be used for matching.
     */
    readonly ctx: TCtx;

    /**
     * Concrete type. Should only be used for matching.
     */
    readonly type: TType;
}

/**
 * A model where the controller lives on the remote side.
 */
export interface RemoteModel<
    TView,
    TRemoteController extends RemoteModelController<ModelController<TView>>,
    TCtx = undefined,
    TType = undefined,
> {
    readonly view: Readonly<TView>;
    readonly controller: TRemoteController;
    readonly ctx: TCtx;
    readonly type: TType;
}

/**
 * Helper type to infer type parameters for a local model.
 */
export type ModelFor<T> =
    T extends Model<infer TView, infer TController, infer TCtx, infer TType>
        ? Model<TView, TController, TCtx, TType>
        : never;

/**
 * Map a local model type to its remote model type.
 */
export type RemoteModelFor<T> =
    T extends Model<infer TView, infer TModelController, infer TCtx, infer TType>
        ? RemoteModel<TView, RemoteModelController<TModelController>, TCtx, TType>
        : never;

/**
 * Map a local model store type to its remote model store type.
 */
export type RemoteModelStoreFor<T> =
    T extends ModelStore<infer TModel, infer TView, infer TModelController, infer TCtx, infer TType>
        ? RemoteModelStore<TModel, TView, TModelController, TCtx, TType>
        : never;

/* eslint-disable @typescript-eslint/no-invalid-void-type */
export type ControllerUpdate<
    TParams extends readonly unknown[] = [],
    TReturn = void,
> = ControllerCustomUpdate<TParams, TParams, TParams, TParams, TReturn>;

export type ControllerCustomUpdate<
    TParamsFromLocal extends readonly unknown[] = [],
    TParamsFromSync extends readonly unknown[] = [],
    TParamsFromRemote extends readonly unknown[] = [],
    TParamsDirect extends readonly unknown[] = [],
    TReturn = void,
> = {
    /**
     * Update from local source (e.g. nickname change due to user interaction). This function might
     * trigger side-effects. In particular, it might reflect a message if necessary and send an
     * outgoing Csp message.
     */
    readonly fromLocal: (...params: TParamsFromLocal) => Promise<TReturn>;

    /**
     * Update from another linked device (e.g. reflected nickname change).
     */
    readonly fromSync: (handle: PassiveTaskCodecHandle, ...params: TParamsFromSync) => TReturn;

    /**
     * Update from other identity (e.g. being removed from a group). Update from local source (e.g.
     * nickname change due to user interaction). This function might trigger side-effects. In
     * particular, it might reflect a message.
     */
    readonly fromRemote: (
        handle: ActiveTaskCodecHandle<'volatile'>,
        ...params: TParamsFromRemote
    ) => Promise<TReturn>;

    /**
     * Update local only, without any side-effects to/from other devices.
     */
    readonly direct: (...params: TParamsDirect) => TReturn;
} & ProxyMarked;

export type ControllerUpdateFromSource<
    TParams extends readonly unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    TReturn = void,
> = ProxyMarked & Pick<ControllerUpdate<TParams, TReturn>, 'fromLocal' | 'fromRemote' | 'fromSync'>;

export type ControllerUpdateFromLocal<
    TParams extends readonly unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    TReturn = void,
> = ProxyMarked & Pick<ControllerUpdate<TParams, TReturn>, 'fromLocal'>;

export type ControllerUpdateFromRemote<
    TParams extends readonly unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    TReturn = void,
> = ProxyMarked & Pick<ControllerUpdate<TParams, TReturn>, 'fromRemote'>;

export type ControllerUpdateFromSync<
    TParams extends readonly unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    TReturn = void,
> = ProxyMarked & Pick<ControllerUpdate<TParams, TReturn>, 'fromSync'>;

export type ControllerUpdateDirect<
    TParams extends readonly unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    TReturn = void,
> = ProxyMarked & Pick<ControllerUpdate<TParams, TReturn>, 'direct'>;
