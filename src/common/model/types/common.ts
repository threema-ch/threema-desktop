import {type ServicesForBackend} from '~/common/backend';
import {type DatabaseBackend} from '~/common/db';
import {type ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {type LocalModelStore, type RemoteModelStore} from '~/common/model/utils/model-store';
import {type ActiveTaskCodecHandle} from '~/common/network/protocol/task';
import {type TaskManager} from '~/common/network/protocol/task/manager';
import {type ProxyMarked, type RemoteProxy} from '~/common/utils/endpoint';

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
    | 'logging'
    | 'model'
    | 'notification'
    | 'systemDialog'
    | 'timer'
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
export type LocalModelController<TView> = {
    readonly meta: ModelLifetimeGuard<TView>;
} & ProxyMarked;

/**
 * A remote controller of a model.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RemoteModelController<TLocalController extends LocalModelController<any>> = RemoteProxy<
    Omit<Readonly<TLocalController>, 'meta'>
>;

/**
 * A model where the controller lives on the local side.
 *
 * IMPORTANT: Because the {@link view} property is replaced on each update, this object should not
 *            be forward to other functions. Either forward the associated {@link LocalModelStore}
 *            **or** the current {@link view} snapshot.
 */
export interface LocalModel<
    TView,
    TController extends LocalModelController<TView>,
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
    TRemoteController extends RemoteModelController<LocalModelController<TView>>,
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
export type LocalModelFor<T> = T extends LocalModel<
    infer TView,
    infer TController,
    infer TCtx,
    infer TType
>
    ? LocalModel<TView, TController, TCtx, TType>
    : never;

/**
 * Map a local model type to its remote model type.
 */
export type RemoteModelFor<T> = T extends LocalModel<
    infer TView,
    infer TLocalController,
    infer TCtx,
    infer TType
>
    ? RemoteModel<TView, RemoteModelController<TLocalController>, TCtx, TType>
    : never;

/**
 * Map a local model store type to its remote model store type.
 */
export type RemoteModelStoreFor<T> = T extends LocalModelStore<
    infer TModel,
    infer TView,
    infer TLocalController,
    infer TCtx,
    infer TType
>
    ? RemoteModelStore<TModel, TView, TLocalController, TCtx, TType>
    : never;

/* eslint-disable @typescript-eslint/no-invalid-void-type */
export type ControllerUpdateFromSource<
    TParams extends readonly unknown[] = [],
    TReturn = void,
> = ControllerCustomUpdateFromSource<TParams, TParams, TParams, TReturn>;

export type ControllerCustomUpdateFromSource<
    TParamsFromLocal extends readonly unknown[] = [],
    TParamsFromSync extends readonly unknown[] = [],
    TParamsFromRemote extends readonly unknown[] = [],
    TReturn = void,
> = {
    /**
     * Update from local source (e.g. nickname change due to user interaction).
     */
    readonly fromLocal: (...params: TParamsFromLocal) => Promise<TReturn>;

    /**
     * Update from another linked device (e.g. reflected nickname change).
     */
    readonly fromSync: (...params: TParamsFromSync) => TReturn;

    /**
     * Update from other identity (e.g. being removed from a group).
     */
    readonly fromRemote: (
        handle: ActiveTaskCodecHandle<'volatile'>,
        ...params: TParamsFromRemote
    ) => Promise<TReturn>;
} & ProxyMarked;
/* eslint-enable @typescript-eslint/no-invalid-void-type */

export type ControllerUpdateFromLocal<
    TParams extends readonly unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    TReturn = void,
> = ProxyMarked & Pick<ControllerUpdateFromSource<TParams, TReturn>, 'fromLocal'>;

export type ControllerUpdateFromRemote<
    TParams extends readonly unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    TReturn = void,
> = ProxyMarked & Pick<ControllerUpdateFromSource<TParams, TReturn>, 'fromRemote'>;

export type ControllerUpdateFromSync<
    TParams extends readonly unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    TReturn = void,
> = ProxyMarked & Pick<ControllerUpdateFromSource<TParams, TReturn>, 'fromSync'>;
