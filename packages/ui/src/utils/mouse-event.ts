/**
 * Handler for a mouse event on an element of type `TElement`, which may run asynchronously, i.e. it
 * may return a `Promise`. Note: A component which accepts such a handler is expected to report a
 * rejected `Promise` to its logger, because nobody else can.
 */
export type AwaitableMouseEventHandler<TElement extends HTMLElement = HTMLElement> = (
    event: MouseEvent & {readonly currentTarget: EventTarget & TElement},
) => unknown;
