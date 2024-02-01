import {unwrap} from './assert';

/**
 * A handler for resize events.
 */
export type ResizeEventHandler = (info: ResizeObserverEntry) => void;

/**
 * Watch an element for resize events.
 */
export class ElementResizeObserver {
    private readonly _observer: ResizeObserver;

    /**
     * Create an element resize observer.
     * @param onDestroy A registration function for code to be executed on
     *   destruction of an associated component. This observer will stop
     *   watching for resize events on destruction.
     */
    public constructor(handler: ResizeEventHandler, onDestroy: (fn: () => unknown) => void) {
        // Observe resize events and dispatch them to the handler
        this._observer = new ResizeObserver(([entry]) => handler(unwrap(entry)));

        // Disconnect on destruction
        onDestroy(() => this._observer.disconnect());
    }

    /**
     * Remove or replace the currently watched element.
     * @param element The element to watch or `undefined` to stop watching.
     */
    public set(element?: Element): void {
        this._observer.disconnect();
        if (element !== undefined) {
            this._observer.observe(element);
        }
    }
}
