import {type Logger} from '~/common/logging';

import {EventController, type EventUnsubscriber} from './event';
import {QueryablePromise, ResolvablePromise} from './resolvable-promise';

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
export type AbortSubscriber = () => void;

/**
 * An abort listener allows to subscribe to abort events.
 */
export interface AbortListener {
    readonly aborted: boolean;
    readonly subscribe: (subscriber: AbortSubscriber) => EventUnsubscriber;
}

/**
 * An abort signal raiser that raises the abort event **synchronously**.
 */
export class AbortRaiser {
    private readonly _controller: EventController<undefined>;
    private readonly _unsubscribers = new Set<EventUnsubscriber>();
    private _aborted = false;

    public constructor(private readonly _log?: Logger) {
        this._controller = new EventController(_log);
    }

    public get listener(): AbortListener {
        return this;
    }

    /**
     * Return whether the abort event was already raised.
     */
    public get aborted(): boolean {
        return this._aborted;
    }

    /**
     * Return a promise that resolves when the abort event is raised.
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public abortedPromise(): QueryablePromise<void> {
        // If already aborted, resolve immediately
        if (this.aborted) {
            return ResolvablePromise.resolve();
        }

        // Otherwise, subscribe
        const promise = new ResolvablePromise<void>();
        const unsubscribe = this.subscribe(() => promise.resolve(undefined));
        void promise.then(unsubscribe);
        return promise;
    }

    /**
     * Subscribe to an abort signal.
     * @param subscriber An abort signal subscriber.
     * @returns An unsubscriber for this specific subscriber.
     */
    public subscribe(subscriber: AbortSubscriber): EventUnsubscriber {
        // If already aborted, only notify and don't subscribe
        if (this._aborted) {
            try {
                subscriber();
            } catch (error) {
                this._log?.error('Uncaught error in abort subscriber', error);
            }
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            return (): void => {};
        }

        // Not yet aborted, subscribe
        const unsubscribe = this._controller.subscribe(subscriber);
        this._unsubscribers.add(unsubscribe);
        return unsubscribe;
    }

    /**
     * Raise the abort event event and dispatch it to all subscribers.
     * Do nothing if the abort event was already raised.
     */
    public raise(): void {
        if (this._aborted) {
            return;
        }

        // Raise and unsubscribe all
        this._aborted = true;
        this._controller.raise(undefined);
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
