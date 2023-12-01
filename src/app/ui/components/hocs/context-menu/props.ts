import type {TriggerBehavior} from '~/app/ui/components/hocs/context-menu/types';
import type {AnchorPoint, Offset, VirtualRect} from '~/app/ui/generic/popover';
import type Popover from '~/app/ui/generic/popover/Popover.svelte';
import type {ContextMenuItem} from '~/app/ui/utils/context-menu/types';
import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

export interface ContextMenuProps {
    readonly items: Readonly<ContextMenuItem[]>;
    readonly boundary: SvelteNullableBinding<HTMLElement> | undefined;
    readonly anchorPoints: AnchorPoint;
    readonly offset: Offset;
    readonly handleBeforeOpen: ((event?: MouseEvent) => void) | undefined;
    readonly triggerBehavior: TriggerBehavior;
    readonly popover: SvelteNullableBinding<Popover>;
    readonly virtualTrigger: VirtualRect | undefined;
}
