/**
 * This contains a highly modified version of
 * [comlink](https://github.com/GoogleChromeLabs/comlink), originally
 * published under the Apache License.
 *
 * There are three reasons for the forked integration:
 *
 * 1. We use custom _transfer handlers_ that need to be reflected properly via the {@link Remote}
 *    type.
 * 2. comlink uses global contexts that lead to surprising behaviour.
 * 3. comlink types depend on a DOM context which we don't have here.
 */

import {type ServicesForBackend} from '~/common/backend';
import {TransferTag} from '~/common/enum';
import {type Logger, type LoggerFactory} from '~/common/logging';
import {type LocalModelStore, type RemoteModelStore} from '~/common/model/utils/model-store';
import {type i53, type Primitive, type u53, type WeakOpaque} from '~/common/types';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import {WeakValueMap} from '~/common/utils/map';
import {SequenceNumberU53} from '~/common/utils/sequence-number';
import {AbortRaiser} from '~/common/utils/signal';
import {type LocalStore, type RemoteStore} from '~/common/utils/store';
import {
    type ISetStore,
    type LocalDerivedSetStore,
    type LocalSetStore,
    type RemoteSetStore,
} from '~/common/utils/store/set-store';

// Minimal incomplete but DOM-compatible interfaces for MessagePort and co.
export interface MessageEvent {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly data: any;
}
type EndpointListener = (ev: MessageEvent) => unknown;
// Note: The transferable type is incorrect but it's probably impossible to shim in non-DOM land
//       since we would have to reference many DOM types...
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DomTransferable = any;
interface PostMessageOptions {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly transfer?: DomTransferable[];
}
interface AddEventListenerOptions {
    readonly once?: boolean;
}

interface EndpointMixin {
    readonly addEventListener: (
        type: 'message' | 'messageerror',
        listener: EndpointListener,
        options?: AddEventListenerOptions,
    ) => void;
    readonly removeEventListener: (
        type: 'message' | 'messageerror',
        listener: EndpointListener,
    ) => void;
    readonly start?: () => void;
    readonly close?: () => void;
}

/**
 * A generic endpoint.
 */
export interface Endpoint extends EndpointMixin {
    readonly postMessage: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: any,
        transfer?: readonly DomTransferable[],
    ) => void;
}

/**
 * A DOM endpoint has a bit of a type mismatch on `postMessage` (`transfer` is not a `readonly`
 * array) which we can ignore.
 */
interface DomEndpoint extends EndpointMixin {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly postMessage: ((message: any, transfer: DomTransferable[]) => void) &
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((message: any, options?: PostMessageOptions) => void);
}

/**
 * Minimal interface to represent a DOM {@link CreatedEndpoint}.
 */
export interface CreatedEndpoint extends Endpoint {
    readonly close: () => void;
    readonly start: () => void;
}

/**
 * A specific endpoint.
 */
export type EndpointFor<TTarget, TEndpoint extends Endpoint = Endpoint> = WeakOpaque<
    TEndpoint,
    {readonly Endpoint: TTarget}
>;

/**
 * A pair of specific endpoints.
 */
export interface EndpointPairFor<TTarget, TEndpoint extends CreatedEndpoint = CreatedEndpoint> {
    readonly local: EndpointFor<TTarget, TEndpoint>;
    readonly remote: EndpointFor<TTarget, TEndpoint>;
}

/**
 * A creator for an endpoint pair.
 */
export type EndpointPairCreator<TEndpoint extends CreatedEndpoint = CreatedEndpoint> = <
    TTarget,
>() => EndpointPairFor<TTarget, TEndpoint>;

// eslint-disable-next-line jsdoc/no-bad-blocks
/* eslint-disable
    @typescript-eslint/ban-types,
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/promise-function-async,
    @typescript-eslint/no-this-alias
*/

// eslint-disable-next-line no-restricted-syntax
const enum WireValueType {
    RAW = 'RAW',
    HANDLER = 'HANDLER',
}

interface RawWireValue {
    readonly id?: u53;
    readonly type: WireValueType.RAW;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly value: unknown;
}

export interface HandlerWireValue {
    readonly id?: u53;
    readonly type: WireValueType.HANDLER;
    readonly tag: TransferTag;
    readonly value: unknown;
}

export type WireValue = RawWireValue | HandlerWireValue;

type MessageID = string;

// eslint-disable-next-line no-restricted-syntax
const enum MessageType {
    GET = 'GET',
    SET = 'SET',
    APPLY = 'APPLY',
    RELEASE = 'RELEASE',
}

interface GetMessage {
    readonly id?: MessageID;
    readonly type: MessageType.GET;
    readonly path: string[];
}

interface SetMessage {
    readonly id?: MessageID;
    readonly type: MessageType.SET;
    readonly path: string[];
    readonly value: WireValue;
}

interface ApplyMessage {
    readonly id?: MessageID;
    readonly type: MessageType.APPLY;
    readonly path: string[];
    readonly argumentList: WireValue[];
}

interface ReleaseMessage {
    readonly id?: MessageID;
    readonly type: MessageType.RELEASE;
}

type Message = GetMessage | SetMessage | ApplyMessage | ReleaseMessage;

/**
 * Marker for an object that requires serialization in a special form.
 */
export const TRANSFER_MARKER = Symbol('endpoint-transfer-marker');

/**
 * Called from the remote side to explicitly release a proxy on the local side.
 */
export const RELEASE_PROXY = Symbol('endpoint-release-proxy');

/**
 * Marks an object as a special transfer type that requires custom serialization.
 */
export interface CustomTransferable<
    THandler extends RegisteredTransferHandler<
        any, // TLocal
        any, // TRemote
        any, // TLocalWireValue
        any, // TRemoteWireValue
        TransferTag
    > = RegisteredTransferHandler<any, any, any, any, TransferTag>,
> {
    readonly [TRANSFER_MARKER]: THandler;
}

/**
 * Marks an object as a proxy. The local object will not be cloned but exposed
 * via a proxy on the remote side.
 */
export interface ProxyMarked extends CustomTransferable<typeof PROXY_HANDLER> {
    readonly [TRANSFER_MARKER]: typeof PROXY_HANDLER;
}

/**
 * Marks an object such that all of its properties are serialised with their respective transfer
 * handler, if existing (fall back to structured cloning).
 */
export interface PropertiesMarked extends CustomTransferable<typeof PROPERTIES_HANDLER> {
    readonly [TRANSFER_MARKER]: typeof PROPERTIES_HANDLER;
}

/**
 * Marks an object as *thrown*.
 */
interface ThrowMarked extends CustomTransferable<typeof THROW_HANDLER> {
    readonly [TRANSFER_MARKER]: typeof THROW_HANDLER;
    readonly error: unknown;
}

/**
 * Takes a type and wraps it in a Promise, if it not already is one.
 * This is to avoid `Promise<Promise<T>>`.
 *
 * This is the inverse of `Awaited<T>`.
 */
type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;

/**
 * Additional special methods available on each wrapped proxy.
 */
export interface ProxyEndpointMethods {
    readonly [RELEASE_PROXY]: () => void;
}

//
// Remote type
//

/**
 * A Proxy type as returned by {@link EndpointService.wrap}.
 *
 * Use this type only directly when creating a proxy manually, otherwise use {@link Remote}.
 */
export type RemoteProxy<T> = RemoteProxyFunction<T> &
    RemoteProxyObject<T> &
    RemoteProxyPromise<T> &
    ProxyEndpointMethods;

/**
 * Get the Local type of an object wrapped through the {@link Endpoint} API.
 *
 * @param TRemote The Remote Type.
 */
export type Local<TRemote> = TRemote extends CustomTransferable
    ? CustomTransferableLocal<TRemote>
    : StructuredCloneOf<TRemote>;

/**
 * Maps our custom remote transfer marked types to the matching local counterpart type.
 *
 * IMPORTANT: Only types that are **uniquely** tagged with symbols or unique key/value types may be
 *            used here, otherwise false positives are possible.
 */
export type CustomTransferableLocal<T extends CustomTransferable> = T extends RemoteModelStore<
    infer TModel,
    infer TView,
    infer TController,
    infer TCtx,
    infer TType
>
    ? LocalModelStore<TModel, TView, TController, TCtx, TType>
    : T extends RemoteSetStore<infer TValue>
    ? ISetStore<TValue>
    : T extends RemoteStore<infer TValue>
    ? LocalStore<TValue>
    : T extends PropertiesMarkedRemote<infer TValue>
    ? TValue
    : T extends RemoteProxy<infer TValue>
    ? TValue
    : // Remote inferrence doesen't work in every case due to the complexity / depth of the inferred
    // types. Use the following as fallback for other cases:
    T extends Remote<infer TValue>
    ? TValue
    : never;

/**
 * A proxied remote function type. See {@link RemoteProxy}.
 *
 * Allows {@param T} to be called as a function - if it is a function.
 */
type RemoteProxyFunction<T> = T extends (...args: infer TArguments) => infer TReturn
    ? (
          ...args: {
              [I in keyof TArguments]: Local<TArguments[I]>;
          }
      ) => Promisify<Remote<Awaited<TReturn>>>
    : unknown;

/**
 * A remote object proxy type. See {@link RemoteProxy}.
 *
 * Allows {@param T}'s properties to be proxy-accessed - if it is an object with properties.
 */
type RemoteProxyObject<T> = keyof Omit<T, typeof TRANSFER_MARKER> extends never
    ? unknown // We're reducing a potential object T here to find out if it has any more keys
    : {
          readonly [TProperty in keyof T as Exclude<
              TProperty,
              typeof TRANSFER_MARKER
          >]: ProxyMarkedRemoteObjectProperty<T[TProperty]>;
      };

/**
 * Handle property access to a remote object, see {@link RemoteProxyObject}.
 *
 * See {@link EndpointService._createProxy}
 */
type ProxyMarkedRemoteObjectProperty<T> = T extends ProxyMarked // Access nested proxies directly without promise
    ? RemoteProxy<T>
    : T extends Promise<infer TPromised> // Promises are unwrapped and then transferred
    ? Promisify<Remote<TPromised>>
    : T extends Primitive // Required to be handled for OpaqueTag types
    ? Promisify<T>
    : T extends CustomTransferable // For objects with a custom transferhandler, that one is used.
    ? Promisify<CustomTransferableRemote<T>>
    : T extends Function | object // Generic functions and objects calls handled by the proxy.
    ? RemoteProxy<T>
    : Promisify<Remote<T>>; // Default: Transfer element with handler or do structural cloning.

/**
 * A remote promise proxy type. See {@link RemoteProxy}.
 *
 * Allows {@param T} to be awaited to transfer/wrap it - if it can be transfered (as checked by the
 * {@link Remote} type).
 */
type RemoteProxyPromise<T> = T extends ProxyMarked
    ? unknown
    : Remote<T> extends never
    ? unknown
    : Promisify<Remote<Awaited<T>>>;

/**
 * Map all properties of an object marked with {@link PropertiesMarked} to their remote type.
 */
export type PropertiesMarkedRemote<T> = {
    readonly [P in keyof T as Exclude<P, typeof TRANSFER_MARKER>]: Remote<T[P]>;
};

/**
 * Make sure that {@param T} extends an object.
 */
type MustExtendObject<T extends object> = T;

/**
 * Maps our custom local transfer marked types to the matching remote counterpart type.
 *
 * IMPORTANT: Only types that are **uniquely** tagged with symbols or unique key/value types may be
 *            used here, otherwise false positives are possible.
 */
type CustomTransferableRemote<T extends CustomTransferable> = T extends LocalModelStore<
    infer TModel,
    infer TView,
    infer TController,
    infer TCtx,
    infer TType
>
    ? RemoteModelStore<TModel, TView, TController, TCtx, TType>
    : T extends LocalSetStore<infer TValue>
    ? RemoteSetStore<MustExtendObject<Remote<TValue>>>
    : T extends LocalDerivedSetStore<any, infer TDerived>
    ? RemoteSetStore<Remote<TDerived>>
    : T extends LocalStore<infer TValue, RegisteredTransferHandler<any, any, any, any, TransferTag>>
    ? RemoteStore<Remote<TValue>>
    : T extends PropertiesMarked
    ? PropertiesMarkedRemote<T>
    : T extends ProxyMarked
    ? RemoteProxy<T>
    : never;

/**
 * Approximation of Structured Clone Algorithm result type. See
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm for
 * details.
 */
type StructuredCloneOf<T> = T extends StructuredCloneUnclonableTypes
    ? never
    : T extends Map<infer TKey, infer TValue>
    ? Map<StructuredCloneOf<TKey>, StructuredCloneOf<TValue>>
    : T extends Set<infer TValue>
    ? Set<StructuredCloneOf<TValue>>
    : T extends (infer TValue)[]
    ? StructuredCloneOf<TValue>[]
    : T extends ArrayBuffer | Boolean | DataView | Date | RegExp | String
    ? T
    : T extends Primitive // Required to be handled before object for OpaqueTag types
    ? T
    : T extends object
    ? {
          readonly [P in keyof T]: StructuredCloneOf<T[P]>;
      }
    : unknown;

/**
 * Types that are not cloned by the structuredClone Algorithm, taken from
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm and
 * https://github.com/GoogleChromeLabs/comlink/blob/main/structured-clone-table.md
 *
 * Note that we do not have DOM-Types available here so we just ignore them.
 */
type StructuredCloneUnclonableTypes = Promise<unknown> | Function;

/**
 * Get the Remote type of an object wrapped through the {@link Endpoint} API.
 *
 * Use {@link RemoteProxy} if you created the proxy manually with
 * {@link EndpointService.wrap}.
 *
 * @param TLocal The Local Type.
 */
export type Remote<TLocal> = TLocal extends CustomTransferable
    ? CustomTransferableRemote<TLocal>
    : StructuredCloneOf<TLocal>;

/**
 * Customizes the serialization of certain values.
 */
export interface TransferHandler<
    TLocal,
    TRemote,
    TLocalWireValue,
    TRemoteWireValue,
    TTag extends TransferTag,
> {
    /**
     * The tag used to recognise the local form.
     */
    readonly tag: TTag;

    /**
     * Gets called with the value if `canHandle()` returned `true` to produce a
     * value that can be sent in a message, consisting of structured-cloneable
     * values and/or transferable objects.
     */
    readonly serialize: (
        value: TLocal,
        service: EndpointService,
    ) => readonly [value: TLocalWireValue, transfers?: readonly DomTransferable[]];

    /**
     * Gets called to deserialize an incoming value that was serialized in the
     * other thread with this transfer handler (known through the name it was
     * registered under).
     */
    readonly deserialize: (
        value: TRemoteWireValue,
        service: EndpointService,
        root: boolean,
    ) => TRemote;
}

/**
 * A transfer handler tagged as being 'registered'.
 *
 * IMPORTANT: The transfer handler contract requires that all transfer handlers are registered prior
 *            to the construction of any endpoint.
 */
export type RegisteredTransferHandler<
    TLocal,
    TRemote,
    TLocalWireValue,
    TRemoteWireValue,
    TTag extends TransferTag,
> = WeakOpaque<
    TransferHandler<TLocal, TRemote, TLocalWireValue, TRemoteWireValue, TTag>,
    {readonly RegisteredTransferHandler: unique symbol}
>;

function isMessagePort(endpoint: Endpoint): endpoint is CreatedEndpoint {
    return endpoint.constructor.name === 'MessagePort';
}

function maybeCloseEndpoint(endpoint: Endpoint): void {
    if (isMessagePort(endpoint)) {
        endpoint.close();
    }
}

function throwIfProxyReleased(isReleased: boolean): void {
    if (isReleased) {
        throw new Error('Proxy has been released and is not useable');
    }
}

interface EndpointDebugContext {
    counter: u53;
    readonly tap: (endpoint: Endpoint, log: Logger) => AbortRaiser;
}

function getEndpointDebugContext(): EndpointDebugContext {
    const endpoints = new Map<Endpoint, AbortRaiser>();
    return {
        counter: 0,
        tap: (endpoint: Endpoint, log: Logger): AbortRaiser => {
            // Detach if we're already listening this endpoint
            endpoints.get(endpoint)?.raise();

            // Attach listener and log data
            function listener({data}: MessageEvent): void {
                log.debug(data);
            }
            endpoint.addEventListener('message', listener);

            // Remove the listener on release
            const releaser = new AbortRaiser();
            releaser.listener.subscribe(() => {
                endpoint.removeEventListener('message', listener);
                log.debug('(Detached)');
            });

            // Register the endpoint with the associated release controller
            endpoints.set(endpoint, releaser);

            // Done
            log.debug('(Attached)');
            return releaser;
        },
    };
}

/**
 * An ObjectId is a monotonically increasing sequence number used to identify objects that are
 * transferred between worker and main thread. The ids are kept in sync between worker and main
 * thread.
 */
export type ObjectId<TTarget> = WeakOpaque<
    u53,
    {readonly ObjectId: unique symbol; readonly Target: TTarget}
>;

export class LocalObjectMapper<TLocalObject extends CustomTransferable> {
    private readonly _sn = new SequenceNumberU53<u53>(0);
    private readonly _map = new WeakMap<TLocalObject, u53>();

    public getOrAssignId<TTargetObject extends TLocalObject>(
        object: TTargetObject,
    ): ObjectId<TTargetObject> {
        // Lookup the ID from the weak map. This will give us an ID if the
        // object was transferred before and we have a reference to it
        // somewhere.
        let id = this._map.get(object);
        if (id !== undefined) {
            return id as ObjectId<TTargetObject>;
        }

        // Fall back to generating a new ID
        id = this._sn.next();
        this._map.set(object, id);
        return id as ObjectId<TTargetObject>;
    }
}

export class RemoteObjectMapper<TRemoteObject extends object> {
    private readonly _map = new WeakValueMap<u53, TRemoteObject>();

    public getOrCreate<TTargetObject extends TRemoteObject>(
        id: ObjectId<TTargetObject>,
        miss: () => TTargetObject,
        hit?: () => void,
    ): TTargetObject {
        return this._map.getOrCreate(id, miss, hit);
    }

    public get<TTargetObject extends TRemoteObject>(
        id: ObjectId<TTargetObject>,
    ): TTargetObject | undefined {
        return this._map.get(id) as TTargetObject;
    }
}

export interface DebugObjectCacheCounter {
    readonly get: (id: ObjectId<unknown>) => u53;
}

export interface ObjectCache<
    TLocalObject extends CustomTransferable,
    TRemoteObject extends object,
> {
    readonly local: LocalObjectMapper<TLocalObject>;
    readonly remote: RemoteObjectMapper<TRemoteObject>;
    readonly counter?: DebugObjectCacheCounter;
}

export class EndpointService {
    /** Shared endpoint state. */
    private static readonly _SHARED: {
        started: boolean;
        readonly handlers: Map<
            TransferTag,
            RegisteredTransferHandler<any, any, any, any, TransferTag>
        >;
    } = {
        started: false,
        handlers: new Map(),
    };

    public readonly logging: LoggerFactory;
    private readonly _debug?: EndpointDebugContext;
    private readonly _id = new SequenceNumberU53<u53>(0);
    private readonly _proxy: {
        readonly counter: WeakMap<Endpoint, u53>;
        readonly registry: FinalizationRegistry<{
            ep: Endpoint;
            releaser?: AbortRaiser;
        }>;
    } = {
        counter: new WeakMap(),
        registry: new FinalizationRegistry(({ep, releaser}) => {
            const newCount = (this._proxy.counter.get(ep) ?? 0) - 1;
            this._proxy.counter.set(ep, newCount);
            if (newCount === 0) {
                releaser?.raise();
                ep.close?.();
            }
        }),
    };
    private readonly _transferCache = new WeakMap<any, readonly DomTransferable[]>();

    public constructor(
        services: Pick<ServicesForBackend, 'config' | 'logging'>,
        public readonly createEndpointPair: EndpointPairCreator,
        private readonly _cache: ObjectCache<CustomTransferable, object>,
    ) {
        this.logging = services.logging;

        // Mark that the endpoint was started. This will prevent any further transfer handlers from
        // registering.
        assert(!EndpointService._SHARED.started, 'Expect endpoint service to be created once');
        EndpointService._SHARED.started = true;

        if (services.config.LOGGING.ENDPOINT_COMMUNICATION) {
            this._debug = getEndpointDebugContext();
        }
    }

    /**
     * Register a transfer handler.
     *
     * IMPORTANT: The transfer handler contract requires that all transfer handlers are registered prior
     *            to the construction of any endpoint. Create constants for your transfer handlers
     *            immediately on startup!
     */
    public static registerTransferHandler<
        THandler extends TransferHandler<TLocal, TRemote, TLocalWireValue, TRemoteWireValue, TTag>,
        TLocal,
        TRemote,
        TLocalWireValue,
        TRemoteWireValue,
        TTag extends TransferTag,
    >(
        handler: THandler,
    ): RegisteredTransferHandler<TLocal, TRemote, TLocalWireValue, TRemoteWireValue, TTag> {
        // Ensure no endpoint was started, yet
        if (EndpointService._SHARED.started) {
            throw new Error(
                'Attempted to register transfer handler after an endpoint service was already started',
            );
        }

        // Ensure there is no tag overlap
        const existing = EndpointService._SHARED.handlers.get(handler.tag);
        assert(existing === undefined, 'Expected handler marker tags to not overlap');

        // Store the handler and return it marked as registered
        const registered = handler as unknown as RegisteredTransferHandler<
            TLocal,
            TRemote,
            TLocalWireValue,
            TRemoteWireValue,
            TTag
        >;
        EndpointService._SHARED.handlers.set(handler.tag, registered);
        return registered;
    }

    public get debug(): EndpointDebugContext['tap'] | undefined {
        return this._debug?.tap;
    }

    public cache<
        TLocalObject extends CustomTransferable,
        TRemoteObject extends object,
    >(): ObjectCache<TLocalObject, TRemoteObject> {
        // Note: As explained in dom/utils/endpoint.ts, it is okay to use the
        //       cache for any kind of object.
        return this._cache as ObjectCache<TLocalObject, TRemoteObject>;
    }

    /**
     * Wraps an endpoint to proxy a remote interface.
     *
     * Warning: This is an inherently unsafe method. You must make sure that the `TTarget` type
     *          actually matches the `endpoint` passed in.
     *
     * @param endpoint The endpoint.
     * @param log Optional logger.
     * @returns The remote interface.
     */
    public wrap<TTarget>(endpoint: Endpoint | DomEndpoint, log?: Logger): RemoteProxy<TTarget> {
        let releaser: AbortRaiser | undefined = undefined;
        if (this._debug !== undefined) {
            releaser = this.debug?.(
                endpoint as Endpoint,
                log ??
                    this.logging.logger(
                        `com.wrapped.${(++this._debug.counter).toString(16).padStart(4, '0')}`,
                    ),
            );
        }
        return this._createProxy<TTarget>(endpoint as Endpoint, releaser);
    }

    /**
     * Expose a local interface on an endpoint.
     *
     * @param target The target object to expose.
     * @param endpoint The endpoint to attach to.
     */
    public exposeProxy<TTarget extends ProxyMarked>(
        target: TTarget,
        endpoint: Endpoint | DomEndpoint,
        log?: Logger,
    ): void {
        let releaser: AbortRaiser | undefined = undefined;
        if (this._debug !== undefined) {
            releaser = this.debug?.(
                endpoint as Endpoint,
                log ??
                    this.logging.logger(
                        `com.exposed.${(++this._debug.counter).toString(16).padStart(4, '0')}`,
                    ),
            );
        }
        return this._expose(target, endpoint as Endpoint, releaser);
    }

    /**
     * Mark an object such that all of its properties are serialised with their respective transfer
     * handler, if existing (fall back to structured cloning).
     */
    public exposeProperties<TObject extends Record<string | u53, unknown>>(
        object: TObject,
    ): TObject & PropertiesMarked {
        return Object.assign(object, {[TRANSFER_MARKER]: PROPERTIES_HANDLER});
    }

    public transfer<TResult, TTransferable extends any[]>(
        value: TResult,
        transfers: TTransferable,
    ): TResult {
        return this._transfer(value, transfers);
    }

    /**
     * Serialise a marked object to a {@link HandlerWireValue} or fall back to the fallback handler
     * or the value itself for sending via postMessage.
     *
     * @returns The serialized object or the fallback value in case no transfer marker was present.
     */
    public serialize<TValue extends CustomTransferable>(
        value: TValue,
    ): readonly [value: HandlerWireValue, transfers: readonly DomTransferable[]];
    public serialize<TValue>(
        value: TValue,
    ): readonly [value: HandlerWireValue | RawWireValue, transfers: readonly DomTransferable[]];
    public serialize<TValue, TFallback>(
        value: TValue,
        fallback: (
            value: TValue,
        ) => readonly [value: TFallback, transfers: readonly DomTransferable[]],
    ): readonly [value: HandlerWireValue | TFallback, transfers: readonly DomTransferable[]];
    public serialize(
        value: unknown,
        fallback?: (
            value: unknown,
        ) => readonly [value: unknown, transfers: readonly DomTransferable[]],
    ): readonly [value: unknown, transfers: readonly DomTransferable[]] {
        if (
            ((typeof value === 'object' && value !== null) || typeof value === 'function') &&
            TRANSFER_MARKER in value
        ) {
            return this._toWireValueViaHandler(
                value as {
                    readonly [TRANSFER_MARKER]: RegisteredTransferHandler<
                        any,
                        any,
                        any,
                        any,
                        TransferTag
                    >;
                },
            );
        } else if (fallback !== undefined) {
            return fallback(value);
        } else {
            return this._toRawWireValue(value);
        }
    }

    /**
     * Deserialise a {@link WireValue} to its associated type.
     *
     * Note: Only call this if you know that a (nested) value needs deserialisation.
     *
     * IMPORTANT: The return type of this method is unsafe. You should know what you're doing when
     *            calling this!
     */
    public deserialize<TResult>(value: WireValue, root: boolean): TResult {
        switch (value.type) {
            case WireValueType.RAW:
                return value.value as TResult;
            case WireValueType.HANDLER: {
                const handler = EndpointService._SHARED.handlers.get(value.tag);
                assert(
                    handler !== undefined,
                    `Expected transfer handler to be available for wire value marked as a special object`,
                );
                return handler.deserialize(value.value, this, root);
            }
            default:
                return unreachable(value);
        }
    }

    // Below is heavily modified comlink code

    private _createProxy<T>(
        ep: Endpoint,
        releaser?: AbortRaiser,
        path: (string | i53 | symbol)[] = [],
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        target: object = (): void => {},
    ): RemoteProxy<T> {
        const service = this;
        let isReleasingOrReleased = false;
        const proxy = new Proxy(target, {
            get(target_, prop): unknown {
                throwIfProxyReleased(isReleasingOrReleased);
                if (prop === RELEASE_PROXY) {
                    return (): void => {
                        service._unregisterProxy(proxy);
                        isReleasingOrReleased = true;
                        void service._releaseEndpoint(ep, releaser);
                    };
                }
                if (prop === 'then') {
                    if (path.length === 0) {
                        return {then: (): object => proxy};
                    }
                    const r = service
                        ._requestResponseMessage(ep, {
                            type: MessageType.GET,
                            path: path.map((p) => p.toString()),
                        })
                        .then((v) => service._fromWireValue(v));
                    return r.then.bind(r);
                }
                return service._createProxy(ep, releaser, [...path, prop]);
            },

            set(target_, prop, rawValue): boolean {
                throwIfProxyReleased(isReleasingOrReleased);
                // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
                // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
                const [value, transfers] = service._toWireValue(rawValue);
                return service
                    ._requestResponseMessage(
                        ep,
                        {
                            type: MessageType.SET,
                            path: [...path, prop].map((p) => p.toString()),
                            value,
                        },
                        transfers,
                    )
                    .then((v) => service._fromWireValue(v)) as any;
            },

            apply(target_, _, rawArgumentList): any {
                throwIfProxyReleased(isReleasingOrReleased);
                const last = path.at(-1);

                // We just pretend that `bind()` didn’t happen.
                if (last === 'bind') {
                    return service._createProxy<T>(ep, releaser, path.slice(0, -1));
                }
                const [argumentList, transfers] = service._processArguments(rawArgumentList);
                return service
                    ._requestResponseMessage(
                        ep,
                        {
                            type: MessageType.APPLY,
                            path: path.map((p) => p.toString()),
                            argumentList,
                        },
                        transfers,
                    )
                    .then((v) => service._fromWireValue(v));
            },
        });
        this._registerProxy(proxy, ep, releaser);
        return proxy as any;
    }

    private _expose(obj: any, ep: Endpoint, releaser?: AbortRaiser): void {
        const service = this;
        function listener(ev: MessageEvent): void {
            const {id, type, path} = {
                path: [] as string[],
                ...(ev.data as Message),
            };
            const argumentList = (ev.data.argumentList ?? []).map((argument: WireValue) =>
                service._fromWireValue(argument),
            );
            let returnValue;
            try {
                const parent = path.slice(0, -1).reduce((obj_, prop) => obj_[prop], obj);
                const rawValue = path.reduce((obj_, prop) => obj_[prop], obj);
                switch (type) {
                    case MessageType.GET:
                        returnValue = rawValue;
                        break;
                    case MessageType.SET: {
                        const set = ev.data as SetMessage;
                        parent[path.slice(-1)[0]] = service._fromWireValue(set.value);
                        returnValue = true;
                        break;
                    }
                    case MessageType.APPLY:
                        if (rawValue === undefined) {
                            const pathString = path.join('.');
                            throw new Error(
                                `EndpointService: Cannot find path "${pathString}" on object of type "${obj.constructor?.name}"`,
                            );
                        }
                        returnValue = rawValue.apply(parent, argumentList);
                        break;
                    case MessageType.RELEASE: {
                        returnValue = undefined;
                        break;
                    }
                    default:
                        unreachable(type);
                }
            } catch (error) {
                returnValue = {error, [TRANSFER_MARKER]: THROW_HANDLER};
            }
            void Promise.resolve(returnValue)
                .catch((error) => ({error, [TRANSFER_MARKER]: THROW_HANDLER}))
                .then((returnValue_) => {
                    const [wireValue, transfers] = service._toWireValue(returnValue_);
                    ep.postMessage({...wireValue, id}, transfers as any[]);
                    if (type === MessageType.RELEASE) {
                        // Detach and deactive after sending release response above.
                        ep.removeEventListener('message', listener);
                        releaser?.raise();
                        maybeCloseEndpoint(ep);
                    }
                });
        }
        ep.addEventListener('message', listener);
        ep.start?.();
    }

    private _transfer<T>(obj: T, transfers: readonly DomTransferable[]): T {
        this._transferCache.set(obj, transfers);
        return obj;
    }

    /**
     * Convert a {@param value} (marked or unmarked) to a {@link WireValue} for sending via
     * postMessage.
     */
    private _toWireValue(
        value: unknown,
    ): readonly [value: WireValue, transfers: readonly DomTransferable[]] {
        if (
            ((typeof value === 'object' && value !== null) || typeof value === 'function') &&
            TRANSFER_MARKER in value
        ) {
            return this._toWireValueViaHandler(
                value as {
                    readonly [TRANSFER_MARKER]: RegisteredTransferHandler<
                        any,
                        any,
                        any,
                        any,
                        TransferTag
                    >;
                },
            );
        } else {
            return this._toRawWireValue(value);
        }
    }

    private _toWireValueViaHandler(
        value: CustomTransferable,
    ): readonly [value: HandlerWireValue, transfers: readonly DomTransferable[]] {
        // Look up the handler depending on the transfer marker.
        const object = value as {
            readonly [TRANSFER_MARKER]: RegisteredTransferHandler<any, any, any, any, TransferTag>;
        };
        const handler = object[TRANSFER_MARKER];

        // Serialize the object using the handler
        const [serialized, transfers] = handler.serialize(object, this);
        return [
            {
                type: WireValueType.HANDLER,
                tag: handler.tag,
                value: serialized,
            },
            transfers ?? [],
        ];
    }

    private _toRawWireValue(
        value: unknown,
    ): readonly [value: RawWireValue, transfers: readonly DomTransferable[]] {
        return [
            {
                type: WireValueType.RAW,
                value,
            },
            this._transferCache.get(value) ?? [],
        ];
    }

    private _fromWireValue(value: WireValue): any {
        switch (value.type) {
            case WireValueType.HANDLER: {
                const handler = EndpointService._SHARED.handlers.get(value.tag);
                assert(
                    handler !== undefined,
                    `Expected transfer handler to be available for wire value marked as a special object`,
                );
                return handler.deserialize(value.value, this, true);
            }

            case WireValueType.RAW:
                // Raw cloned value
                return value.value;

            default:
                return unreachable(value);
        }
    }

    private _registerProxy(proxy: object, ep: Endpoint, releaser?: AbortRaiser): void {
        const newCount = (this._proxy.counter.get(ep) ?? 0) + 1;
        this._proxy.counter.set(ep, newCount);
        this._proxy.registry.register(proxy, {ep, releaser}, proxy);
    }

    private _unregisterProxy(proxy: object): void {
        this._proxy.registry.unregister(proxy);
    }

    private _processArguments(
        argumentList: any[],
    ): [arguments: WireValue[], transfers: readonly DomTransferable[]] {
        const processed = argumentList.map((argument) => this._toWireValue(argument));
        return [processed.map((v) => v[0]), processed.map((v) => v[1]).flat()];
    }

    private _requestResponseMessage(
        ep: Endpoint,
        msg: Message,
        transfers?: readonly DomTransferable[],
    ): Promise<WireValue> {
        return new Promise((resolve) => {
            const id = this._id.next();
            function listener({data}: MessageEvent): void {
                const value = data as WireValue;
                if (value.id !== id) {
                    return;
                }
                ep.removeEventListener('message', listener);
                resolve(value);
            }
            ep.addEventListener('message', listener);
            ep.start?.();
            // Ugly cast for `transfers` due to lack of `readonly` in lib.dom.ts
            ep.postMessage({id, ...msg}, (transfers as any[] | undefined) ?? []);
        });
    }

    private _releaseEndpoint(ep: Endpoint, release?: AbortRaiser): Promise<void> {
        return this._requestResponseMessage(ep, {
            type: MessageType.RELEASE,
        }).then(() => {
            release?.raise();
            maybeCloseEndpoint(ep);
        });
    }
}

/**
 * Convenience function, maps to {@link EndpointService.registerTransferHandler}.
 */
export const registerTransferHandler: <
    THandler extends TransferHandler<TLocal, TRemote, TLocalWireValue, TRemoteWireValue, TTag>,
    TLocal,
    TRemote,
    TLocalWireValue,
    TRemoteWireValue,
    TTag extends TransferTag,
>(
    handler: THandler,
) => RegisteredTransferHandler<TLocal, TRemote, TLocalWireValue, TRemoteWireValue, TTag> =
    EndpointService.registerTransferHandler;

// Register and export proxy handler
export const PROXY_HANDLER: RegisteredTransferHandler<
    ProxyMarked,
    Remote<unknown>,
    CreatedEndpoint,
    CreatedEndpoint,
    TransferTag.PROXY
> = registerTransferHandler({
    tag: TransferTag.PROXY,

    serialize: (
        object,
        service,
    ): [value: CreatedEndpoint, transfers: [endpoint: CreatedEndpoint]] => {
        const {local, remote} = service.createEndpointPair();
        service.exposeProxy(object, local as DomEndpoint);
        return [remote, [remote]];
    },

    deserialize: (endpoint, service): Remote<unknown> => {
        endpoint.start();
        const remote = service.wrap(endpoint as DomEndpoint);
        return remote;
    },
} as const);

// Register object properties handler
const PROPERTIES_HANDLER: RegisteredTransferHandler<
    Record<string, unknown>,
    Record<string, unknown>,
    readonly (readonly [key: string, value: WireValue])[],
    readonly (readonly [key: string, value: WireValue])[],
    TransferTag.TRANSFER_PROPERTIES
> = registerTransferHandler({
    tag: TransferTag.TRANSFER_PROPERTIES,

    serialize: (object, service) => {
        const transfers: DomTransferable[] = [];
        const values = Object.entries(object).map(([key, value]) => {
            const [serialized, valueTransfers] = service.serialize(value);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            transfers.push(...valueTransfers);
            return [key, serialized] as const;
        });
        return [values, transfers];
    },

    deserialize: (values, service) =>
        Object.fromEntries(
            values.map(([key, serialized]) => [
                key,
                serialized.type === WireValueType.RAW
                    ? serialized.value
                    : service.deserialize(serialized, false),
            ]),
        ),
} as const);

export type SerializedError<TAdditionalValues extends unknown[] = []> = [
    // eslint-disable-next-line no-restricted-syntax
    ...SerializedPlainError,
    // eslint-disable-next-line no-restricted-syntax
    ...TAdditionalValues,
];
type SerializedPlainError = [
    name: string,
    message: string,
    stack?: string,
    cause?: HandlerWireValue,
];
type SerializedThrowLiteral = [literal: unknown];
type SerializedThrown = SerializedThrowLiteral | SerializedPlainError | HandlerWireValue;

function serializeError(
    error: Error,
    service: EndpointService,
): readonly [value: SerializedPlainError, transfers: readonly DomTransferable[]] {
    const [cause, transfers] =
        error.cause === undefined
            ? [undefined, []]
            : // Attempt to serialise more specific error first, fall back to throw handler
              service.serialize(error.cause, () =>
                  unwrap(
                      service.serialize({
                          [TRANSFER_MARKER]: THROW_HANDLER,
                          error: error.cause,
                      }),
                  ),
              );
    return [[error.name, error.message, error.stack, cause], transfers];
}
function serializeThrown(
    {error}: ThrowMarked,
    service: EndpointService,
): readonly [value: SerializedThrown, transfers: readonly DomTransferable[]] {
    if (error instanceof Error) {
        // Attempt to serialise more specific error first, fall back to serialising a generic error
        return service.serialize(error, () => serializeError(error, service));
    } else {
        return [[error], []];
    }
}
function deserializeError(
    [name, message, stack, cause]: SerializedPlainError,
    service: EndpointService,
): Omit<Error, 'message'> {
    return Object.assign(
        new Error(message, {
            cause: cause === undefined ? undefined : service.deserialize(cause, false),
        }),
        {name, stack},
    );
}
function deserializeThrown(
    serialized: SerializedThrown,
    service: EndpointService,
    root: boolean,
): Error | unknown {
    // Specific error: attempt to deserialise it
    if (!(serialized instanceof Array)) {
        return service.deserialize(serialized, root);
    }

    // Generic error
    if (serialized.length === 1) {
        // Literal case
        const [literal] = serialized;
        return literal;
    } else {
        // Error case
        return deserializeError(serialized, service);
    }
}

// Register throw handler
const THROW_HANDLER: RegisteredTransferHandler<
    ThrowMarked,
    Error | unknown | never,
    SerializedThrown,
    SerializedThrown,
    TransferTag.THROW
> = registerTransferHandler({
    tag: TransferTag.THROW,

    serialize: (thrown, service) => serializeThrown(thrown, service),

    deserialize: (serialized, service, root) => {
        const thrown = deserializeThrown(serialized, service, root);
        if (root) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw thrown;
        } else {
            return thrown;
        }
    },
} as const);

export interface ErrorTransferHandler<
    TError extends Error,
    TTag extends TransferTag,
    TSerializedAdditionalValues extends unknown[],
    // eslint-disable-next-line no-restricted-syntax
> {
    /**
     * The tag used to recognise the local error.
     */
    readonly tag: TTag;

    /**
     * Serialise all (custom) additional values of the error.
     *
     * Note: The properties `name`, `message`, `stack` and `cause` will be handled automatically.
     */
    readonly serialize: (error: TError) => TSerializedAdditionalValues;

    /**
     * Create an instance of the error with the (custom) additional values.
     *
     * Note: The properties `name` and `stack` will be assigned (`Object.assign`) onto the error
     *       instance.
     */
    readonly deserialize: (
        message: string,
        cause: Error | undefined,
        values: TSerializedAdditionalValues,
    ) => TError;
}

export type RegisteredErrorTransferHandler<
    TError extends Error,
    TTag extends TransferTag,
    TSerializedAdditionalValues extends unknown[] = [],
> = RegisteredTransferHandler<
    TError,
    TError,
    SerializedError<TSerializedAdditionalValues>,
    SerializedError<TSerializedAdditionalValues>,
    TTag
>;

/**
 * Register a custom error transfer handler.
 */
export function registerErrorTransferHandler<
    TError extends Error,
    TTag extends TransferTag,
    TSerializedAdditionalValues extends unknown[] = [],
>(
    handler: ErrorTransferHandler<TError, TTag, TSerializedAdditionalValues>,
): RegisteredTransferHandler<
    TError,
    TError | never,
    SerializedError<TSerializedAdditionalValues>,
    SerializedError<TSerializedAdditionalValues>,
    TTag
> {
    return registerTransferHandler({
        tag: handler.tag,

        serialize: (error, service) => {
            const [cause, transfers] =
                error.cause === undefined
                    ? [undefined, []]
                    : // Attempt to serialise more specific error first, fall back to throw handler
                      service.serialize(error.cause, () =>
                          unwrap(
                              service.serialize({
                                  [TRANSFER_MARKER]: THROW_HANDLER,
                                  error: error.cause,
                              } as ThrowMarked),
                          ),
                      );

            return [
                [error.name, error.message, error.stack, cause, ...handler.serialize(error)],
                transfers,
            ];
        },

        deserialize: ([name, message, stack, cause, ...values], service, root) => {
            const error = Object.assign(
                handler.deserialize(
                    message,
                    cause === undefined ? undefined : service.deserialize(cause, false),
                    values,
                ),
                {name, stack},
            );
            if (root) {
                // eslint-disable-next-line @typescript-eslint/no-throw-literal
                throw error;
            } else {
                return error;
            }
        },
    });
}
