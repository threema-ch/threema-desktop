import type {ContextMenuItem} from '~/app/ui/utils/context-menu/types';

export type MessageContextMenuItem = MessageContextMenuOption | 'divider';

type MessageContextMenuOption = ContextMenuItem & {
    icon: {
        color?: 'acknowledged' | 'declined' | 'default';
    };
};
