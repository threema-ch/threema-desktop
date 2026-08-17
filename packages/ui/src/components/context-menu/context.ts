import type {Logger} from '@threema/ts-utils/logging/logger';
import {assert} from '@threema/ts-utils/meta/assert';
import {getContext, setContext} from 'svelte';

/**
 * What a `ContextMenu` shares with its items, so that a menu is configured once instead of once per
 * item. Note: The properties are read lazily, i.e. an implementation is expected to expose them as
 * getters, so that the items keep track of changes to them.
 */
export interface ContextMenuContext {
    /**
     * Logger of the surrounding menu.
     */
    readonly log: Logger;
}

const CONTEXT_KEY = Symbol('context-menu');

/**
 * Share the given menu context with all descendants of the current component.
 */
export function setContextMenuContext(context: ContextMenuContext): void {
    setContext(CONTEXT_KEY, context);
}

/**
 * Get the context shared by the closest `ContextMenu` ancestor.
 *
 * @throws {Error} If the current component is not rendered inside a `ContextMenu`.
 */
export function getContextMenuContext(): ContextMenuContext {
    const context = getContext<ContextMenuContext | undefined>(CONTEXT_KEY);
    assert(
        context !== undefined,
        'A `ContextMenu.Item` must be rendered as a child of a `ContextMenu`',
    );

    return context;
}
