import type {Logger} from '~/common/logging';
import {assertUnreachable, unreachable} from '~/common/utils/assert';
import {EventController, type EventUnsubscriber} from '~/common/utils/event';
import {type QueryablePromise, ResolvablePromise} from '~/common/utils/resolvable-promise';

/**
 * This must be compatible with DOM's {@link AbortController}.
 */
interface DomAbortController<TDomSignal extends DomAbortSignal> {
    readonly signal: TDomSignal;
    abort: () => void;
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
    readonly aborted: boolean;
    readonly promise: QueryablePromise<TEvent>;
    readonly subscribe: (subscriber: AbortSubscriber<TEvent>) => EventUnsubscriber;
    readonly attach: <TDomSignal extends DomAbortSignal>(
        controller: DomAbortController<TDomSignal>,
    ) => TDomSignal;
}

/**
 * An abort signal raiser that raises the abort event **synchronously** but also supports
 * subscribing to it as a {@link QueryablePromise}.
 */
export class AbortRaiser<TEvent = undefined> {
    private readonly _promise = new ResolvablePromise<TEvent>({uncaught: 'default'});
    private readonly _controller: EventController<TEvent>;
    private readonly _unsubscribers = new Set<EventUnsubscriber>();

    public constructor(private readonly _log?: Logger) {
        this._controller = new EventController(_log);
    }

    public get listener(): AbortListener<TEvent> {
        return this;
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
     * Raise the abort event event and dispatch it to all subscribers.
     * Do nothing if the abort event was already raised.
     */
    public raise(event: TEvent): void {
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

    /**
     * Attach an {@link DomAbortController} to the raiser's listener.
     */
    public attach<TDomSignal extends DomAbortSignal>(
        controller: DomAbortController<TDomSignal>,
    ): TDomSignal {
        this.subscribe(() => controller.abort());
        return controller.signal;
    }
}
