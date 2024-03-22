import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
import type Popover from '~/app/ui/generic/popover/Popover.svelte';
import type {PopoverProps} from '~/app/ui/generic/popover/props';
import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

/**
 * Props accepted by the `ContextMenuProvider` component.
 */
export interface ContextMenuProviderProps extends PopoverProps {
    /**
     * Options to show in the context menu. If empty, no context menu will be rendered.
     */
    readonly items: Readonly<ContextMenuItem[]> | undefined;
    readonly popover: SvelteNullableBinding<Popover> | undefined;
}
