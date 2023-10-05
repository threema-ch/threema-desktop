import type {Logger} from '~/common/logging';

/**
 * An event subscriber.
 */
export type EventSubscriber<TEvent> = (event: TEvent) => void;

/**
 * An event unsubscriber.
 */
export type EventUnsubscriber = () => void;

/**
 * An event listener allows to subscribe to events.
 */
export interface EventListener<TEvent> {
    readonly subscribe: (subscriber: EventSubscriber<TEvent>) => EventUnsubscriber;
}

/**
 * Event subscriber options.
 */
export interface EventSubscriberOptions {
    /**
     * If set to `true`, only one event will be fired, i.e. automatically
     * unsubscribes after the first event has been fired.
     */
    readonly once?: boolean;
}

/**
 * Event controller allowing to raise events.
 *
 * All events are dispatched synchronously to the attached subscribers.
 */
export class EventController<TEvent> {
    private readonly _subscribers = new Map<
        EventSubscriber<TEvent>,
        EventSubscriberOptions | undefined
    >();

    /**
     * Create a new {@link EventController} instance.
     *
     * @param _log Optional logger
     */
    public constructor(private readonly _log?: Logger) {}

    public get listener(): EventListener<TEvent> {
        return this;
    }

    /**
     * Subscribe to events.
     *
     * @param subscriber An event subscriber.
     * @param options Event subscriber options.
     * @returns An unsubscriber for this specific subscriber.
     */
    public subscribe(
        subscriber: EventSubscriber<TEvent>,
        options?: EventSubscriberOptions,
    ): EventUnsubscriber {
        // Subscribe
        if (this._log !== undefined) {
            const subscribers = this._subscribers.size;
            this._log.debug(`Subscribed (${subscribers} -> ${subscribers + 1})`);
        }
        this._subscribers.set(subscriber, options);

        // Return unsubscribe function
        return (): void => this._unsubscribe(subscriber);
    }

    /**
     * Raise an event and dispatch it synchronously to all subscribers.
     *
     * @param event The event to be dispatched.
     */
    public raise(event: TEvent): void {
        if (this._log !== undefined) {
            this._log.debug(`Dispatching event to ${this._subscribers.size} subscribers`);
        }
        for (const [subscriber, options] of this._subscribers) {
            try {
                subscriber(event);
            } catch (error) {
                this._log?.error('Uncaught error in event subscriber', error);
            }
            if (options?.once === true) {
                this._unsubscribe(subscriber);
            }
        }
    }

    private _unsubscribe(subscriber: EventSubscriber<TEvent>): void {
        if (this._subscribers.delete(subscriber)) {
            if (this._log !== undefined) {
                const subscribers = this._subscribers.size;
                this._log.debug(`Unsubscribed (${subscribers + 1} -> ${subscribers})`);
            }
        } else {
            this._log?.warn('Unsubscriber called twice!', subscriber);
        }
    }
}
