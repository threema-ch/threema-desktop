import type {AppServicesForSvelte} from '~/app/types';
import type {ContextMenuItemHandlerProps} from '~/app/ui/components/partials/group-detail/types';
import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {AnyReceiverDataOrSelf, GroupReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `GroupContent` component.
 */
export interface GroupContentProps {
    readonly contactPreviewList: ReceiverPreviewListProps<ContextMenuItemHandlerProps>['items'];
    readonly onclickdeletegroup: () => void;
    readonly onclickeditmembers: () => void;
    readonly onclickeditname: () => void;
    readonly onclickitem?: (receiver: AnyReceiverDataOrSelf, active: boolean) => void;
    readonly onclickleavegroup: () => void;
    readonly onlclickleaveanddeletegroup: () => void;
    readonly onclickprofilepicture?: (event: MouseEvent) => void;
    readonly onclickremovemember: (props: ContextMenuItemHandlerProps) => Promise<void>;
    readonly receiver: GroupReceiverData;
    readonly services: Pick<AppServicesForSvelte, 'router' | 'settings' | 'profilePicture'>;
}
