import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {AutoAppUpdatePromptDialogContext, SystemDialogAction} from '~/common/system-dialog';

/**
 * Props accepted by the `AutoAppUpdatePromptDialog` component.
 */
export interface AutoAppUpdatePromptDialogProps
    extends Pick<ModalProps, 'target'>,
        AutoAppUpdatePromptDialogContext {
    /**
     * Optional callback to call when a choice is made, e.g. a button was clicked.
     */
    readonly onSelectAction?: (action: SystemDialogAction) => void;
}
