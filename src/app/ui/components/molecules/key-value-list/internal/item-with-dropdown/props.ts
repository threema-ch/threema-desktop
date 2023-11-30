import type {AnchorPoint, Offset} from '~/app/ui/generic/popover';
import type {ContextMenuItem} from '~/app/ui/utils/context-menu/types';

export interface ItemWithDropdownProps {
    readonly key: string;
    readonly options?: {
        readonly showInfoIcon?: boolean;
        readonly disabled?: boolean;
    };
    readonly icon?: string;
    readonly items: ContextMenuItem[];
    readonly anchorPoints?: AnchorPoint;
    readonly offset?: Offset;
}
