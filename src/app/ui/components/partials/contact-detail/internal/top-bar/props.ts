import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `TopBar` component.
 */
export interface TopBarProps {
    readonly receiver: Pick<AnyReceiverData, 'type'>;
}
