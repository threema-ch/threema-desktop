import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
import type Popover from '~/app/ui/generic/popover/Popover.svelte';
import type {PopoverProps} from '~/app/ui/generic/popover/props';
import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

/**
 * Props accepted by the `ContextMenuProvider` component.
 */
export interface ContextMenuProviderProps extends Omit<PopoverProps, 'safetyGap'> {
    /**
     * Options to show in the context menu. If empty, no context menu will be rendered.
     */
    readonly items: readonly ContextMenuItem[] | undefined;
    readonly popover: SvelteNullableBinding<Popover> | undefined;
    /**
     * @see {@link PopoverProps.safetyGap}. Defaults to `{left: 8, right: 8, top: 8, bottom: 8}`.
     */
    readonly safetyGap?: PopoverProps['safetyGap'];
}
