import {TransferTag} from '~/common/enum';
import {TRANSFERRED_MARKER, TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import {assertUnreachable, unreachable, unwrap} from '~/common/utils/assert';
import {
    registerTransferHandler,
    type CustomTransferredRemoteMarker,
    type EndpointFor,
    type EndpointService,
    type MessageEventLike,
    type ObjectId,
    type RegisteredTransferHandler,
    type WireValue,
} from '~/common/utils/endpoint';
import {EventController, type EventUnsubscriber} from '~/common/utils/event';
import {type QueryablePromise, ResolvablePromise} from '~/common/utils/resolvable-promise';

/**
 * This must be compatible with DOM's {@link AbortController}.
 */
interface DomAbortController<TDomSignal extends DomAbortSignal, TEvent = undefined> {
    readonly signal: TDomSignal;
    readonly abort: (reason?: TEvent) => void;
}

/**
 * This must be compatible with DOM's {@link AbortSignal}.
 */
interface DomAbortSignal {
    readonly aborted: boolean;
    addEventListener: (type: 'abort', listener: (this: DomAbortSignal) => void) => void;
}

/**
 * An abort subscriber.
 */
export type AbortSubscriber<TEvent = undefined> = (event: TEvent) => void;

/**
 * An abort listener allows to subscribe to abort events.
 */
export interface AbortListener<TEvent = undefined> {
    readonly [TRANSFER_HANDLER]: typeof ABORT_LISTENER_TRANSFER_HANDLER;
    readonly aborted: boolean;
    readonly promise: QueryablePromise<TEvent>;
    readonly subscribe: (subscriber: AbortSubscriber<TEvent>) => EventUnsubscriber;
    readonly attach: <TDomSignal extends DomAbortSignal>(
        controller: DomAbortController<TDomSignal, TEvent>,
    ) => TDomSignal;
}

class BaseAbortListener<TEvent = undefined> implements AbortListener<TEvent> {
    public readonly [TRANSFER_HANDLER] = ABORT_LISTENER_TRANSFER_HANDLER;
    protected readonly _promise = new ResolvablePromise<TEvent>({uncaught: 'default'});
    protected readonly _controller: EventController<TEvent>;
    protected readonly _unsubscribers = new Set<EventUnsubscriber>();

    public constructor(protected readonly _log?: Logger) {
        this._controller = new EventController(_log);
    }

    /**
     * Whether the abort signal has been fired.
     */
    public get aborted(): boolean {
        return this._promise.done;
    }

    /**
     * Return a promise that resolves when the abort event is raised.
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public get promise(): QueryablePromise<TEvent> {
        return this._promise;
    }

    /**
     * Subscribe to an abort signal.
     *
     * @param subscriber An abort signal subscriber.
     * @returns An unsubscriber for this specific subscriber.
     */
    public subscribe(subscriber: AbortSubscriber<TEvent>): EventUnsubscriber {
        const state = this._promise.state;
        switch (state.type) {
            case 'pending': {
                // Not yet aborted, subscribe
                const unsubscribe = this._controller.subscribe(subscriber);
                this._unsubscribers.add(unsubscribe);
                return unsubscribe;
            }
            case 'resolved':
                // Already aborted, only notify and don't subscribe
                try {
                    subscriber(state.result);
                } catch (error) {
                    this._log?.error('Uncaught error in abort subscriber', error);
                }
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                return (): void => {};
            case 'rejected':
                // Considered unreachable
                return assertUnreachable('AbortRaiser promise may not be rejected!');
            default:
                return unreachable(state);
        }
    }

    /**
     * Forward this {@link AbortListener} event to an {@link AbortRaiser}.
     *
     * Note: The {@link AbortRaiser}s signal is bound unidirectionally, i.e. the target only
     * receives this {@link AbortListener}s event but not vice versa.
     *
     * @returns An unsubscriber to stop forwarding events.
     */
    public forward(target: AbortRaiser<TEvent>): EventUnsubscriber;
    public forward<TOtherEvent>(
        target: AbortRaiser<TOtherEvent>,
        transform: (event: TEvent) => TOtherEvent,
    ): EventUnsubscriber;
    public forward<TOtherEvent = TEvent>(
        target: AbortRaiser<TEvent | TOtherEvent>,
        transform?: (event: TEvent) => TOtherEvent,
    ): EventUnsubscriber {
        const unsubscriber: {
            // Note: This in combination with the subscription to `target` maintains a reference to
            // `this` until something unsubscribes the forwarder.
            self: AbortListener<TEvent>;
            local?: EventUnsubscriber;
            remote?: EventUnsubscriber;
        } = {self: this};
        function unsubscribe(): void {
            unwrap(unsubscriber.local)();
            unwrap(unsubscriber.remote)();
        }
        unsubscriber.local = this.subscribe((event) => {
            unsubscribe();
            target.raise(transform !== undefined ? transform(event) : event);
        });
        unsubscriber.remote = target.subscribe(() => unsubscribe());
        return unsubscribe;
    }

    /**
     * Attach an {@link DomAbortController} to the raiser's listener.
     *
     * Note: This {@link AbortRaiser}s signal will flow to the {@link DomAbortController} but not
     * vice versa!
     */
    public attach<TDomSignal extends DomAbortSignal>(
        controller: DomAbortController<TDomSignal, TEvent>,
    ): TDomSignal {
        this.subscribe((event: TEvent) => controller.abort(event));
        return controller.signal;
    }

    /**
     * Raise the abort event event and dispatch it to all subscribers.
     * Do nothing if the abort event was already raised.
     */
    protected _raise(event: TEvent): void {
        if (this._promise.done) {
            return;
        }

        // Raise and unsubscribe all
        this._promise.resolve(event);
        this._controller.raise(event);
        for (const unsubscribe of this._unsubscribers) {
            unsubscribe();
        }
        this._unsubscribers.clear();
    }
}

/**
 * Release a remote abort listener to be garbage collected on the local side.
 */
function releaseRemote(endpoint: EndpointFor<'value', undefined, unknown>): void {
    endpoint.postMessage(undefined);
    endpoint.close?.();
}

const ABORT_LISTENER_REMOTE_MARKER: symbol = Symbol('abort-listener-remote-marker');

export class RemoteAbortListener<TEvent = undefined>
    extends BaseAbortListener<TEvent>
    implements CustomTransferredRemoteMarker<typeof ABORT_LISTENER_REMOTE_MARKER>
{
    private static readonly _REGISTRY = new FinalizationRegistry(releaseRemote);
    public readonly [TRANSFERRED_MARKER] = ABORT_LISTENER_REMOTE_MARKER;

    public constructor(
        service: EndpointService,
        endpoint: EndpointFor<'value', undefined, WireValue>,
    ) {
        super();

        // Forward raised event
        const self = new WeakRef(this);
        function listener({data}: MessageEventLike<WireValue>): void {
            // Unregister listener when the reference disappears
            const self_ = self.deref();
            if (self_ === undefined) {
                endpoint.removeEventListener('message', listener);
                return;
            }

            // Raise event
            const serialized = data;
            const event = service.deserialize<TEvent>(serialized, true);
            self_._raise(event);
        }
        endpoint.addEventListener('message', listener);
        endpoint.start?.();

        // Tell the local side to unsubscribe and release its endpoint when this remote abort
        // listener is being garbage collected
        RemoteAbortListener._REGISTRY.register(this, endpoint);
    }
}

const ABORT_LISTENER_TRANSFER_HANDLER: RegisteredTransferHandler<
    AbortListener<unknown>,
    AbortListener<unknown>,
    [id: ObjectId<AbortListener<unknown>>, endpoint: EndpointFor<'value', undefined, WireValue>],
    [
        id: ObjectId<RemoteAbortListener<unknown>>,
        endpoint: EndpointFor<'value', undefined, WireValue>,
    ],
    TransferTag.ABORT_LISTENER
> = registerTransferHandler({
    tag: TransferTag.ABORT_LISTENER,

    serialize: (abort: AbortListener<unknown>, service: EndpointService) => {
        // Note: Due to the asynchronous nature of bidirectional endpoints, we will still send ports
        // even if we know that the local store has already been transmitted at some point. The
        // remote reference may have already been gone and we just haven't noticed, yet. If this
        // turns out to be expensive, we may want to optimise this by lazily creating ports on
        // demand (requiring another RTT).
        const id = service.cache().local.getOrAssignId(abort);
        const {local, remote} = service.createEndpointPair<'value', WireValue, undefined>();

        // Subscribe and forward event
        const unsubscribe = abort.subscribe((event) => {
            const [serialized, transfers] = service.serialize(event);
            local.postMessage(serialized, transfers);
        });

        // Unsubscribe and close endpoint on any inbound message
        local.addEventListener(
            'message',
            () => {
                unsubscribe();
                local.close?.();
            },
            {once: true},
        );
        local.start?.();

        // Forward
        return [[id, remote], [remote]];
    },

    deserialize: ([id, endpoint], service) =>
        // Check if we already have a cached remote store for this ID. Fall back to creating the
        // remote abort listener.
        service.cache().remote.getOrCreate(
            id,
            () => new RemoteAbortListener(service, endpoint),
            () => releaseRemote(endpoint),
        ),
});

/**
 * An abort signal raiser that raises the abort event **synchronously** but also supports
 * subscribing to it as a {@link QueryablePromise}.
 */
export class AbortRaiser<TEvent = undefined> extends BaseAbortListener<TEvent> {
    public constructor(log?: Logger) {
        super(log);
    }

    public get listener(): AbortListener<TEvent> {
        return this;
    }

    /**
     * Raise the abort event event and dispatch it to all subscribers.
     * Do nothing if the abort event was already raised.
     */
    public raise(event: TEvent): void {
        this._raise(event);
    }

    /**
     * Derive and bind another {@link AbortRaiser} to this {@link AbortRaiser}.
     *
     * Note: The {@link AbortRaiser}s signal is bound bidirectionally. In other words, if one of
     * them fires, the other will fire, too.
     */
    public derive<TOtherEvent = undefined>(transform: {
        readonly local: (event: TEvent) => TOtherEvent;
        readonly remote: (event: TOtherEvent) => TEvent;
    }): AbortRaiser<TOtherEvent> {
        const abort = new AbortRaiser<TOtherEvent>(this._log);
        const unsubscriber: {
            local?: EventUnsubscriber;
            remote?: EventUnsubscriber;
        } = {};
        function unsubscribe(): void {
            unwrap(unsubscriber.local)();
            unwrap(unsubscriber.remote)();
        }
        unsubscriber.local = this.subscribe((event) => {
            unsubscribe();
            abort.raise(transform.local(event));
        });
        unsubscriber.remote = abort.subscribe((event) => {
            unsubscribe();
            this.raise(transform.remote(event));
        });
        return abort;
    }
}
