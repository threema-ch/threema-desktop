import type {ActionReturn} from 'svelte/action';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace svelteHTML {
        // Add custom DOM events to global HTML attributes
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        interface HTMLAttributes<T> extends ThreemaDragActionAttributes {}
    }
}

/**
 * The threemadragstart event is once fired when a dragged element or text selection enters the use:dragEvents target.
 */
class ThreemaDragStartEvent extends Event {
    public constructor() {
        super('threemadragstart');
    }
}

/**
 * The threemadragend event is once fired when an element or text selection is dropped on / or leaves the use:dragEvents target.
 */
class ThreemaDragEndEvent extends Event {
    public constructor() {
        super('threemadragend');
    }
}

interface ThreemaDragActionProperties {}

interface ThreemaDragActionAttributes {
    readonly 'on:threemadragstart'?: (event: CustomEvent<ThreemaDragStartEvent>) => void;
    readonly 'on:threemadragend'?: (event: CustomEvent<ThreemaDragEndEvent>) => void;
}

/**
 * SvelteAction to trigger custom threemadragstart and threemadragend events on desired use:action target.
 */
export function dragEvents(
    node: HTMLElement,
): ActionReturn<ThreemaDragActionProperties, ThreemaDragActionAttributes> {
    let entered = 0;

    function handleDragEnter(): void {
        if (entered++ === 0) {
            node.dispatchEvent(new ThreemaDragStartEvent());
        }
    }

    function handleDragLeave(): void {
        if (--entered === 0) {
            node.dispatchEvent(new ThreemaDragEndEvent());
        }
    }

    function handleDrop(): void {
        entered = 0;
        node.dispatchEvent(new ThreemaDragEndEvent());
    }

    node.addEventListener('dragenter', handleDragEnter);
    node.addEventListener('dragleave', handleDragLeave);
    node.addEventListener('drop', handleDrop);

    return {
        destroy: (): void => {
            node.removeEventListener('dragenter', handleDragEnter);
            node.removeEventListener('dragleave', handleDragLeave);
            node.removeEventListener('drop', handleDrop);
        },
    };
}
