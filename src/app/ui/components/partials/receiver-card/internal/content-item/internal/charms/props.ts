import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `Charms` component.
 */
export interface CharmsProps {
    readonly call?: AnyCallProps;
    readonly isBlocked?: boolean;
    readonly isPinned?: boolean;
    readonly isPrivate?: boolean;
    readonly notificationPolicy?: AnyReceiverData['notificationPolicy'];
}

type AnyCallProps = ActiveCallProps | JoinedCallProps;

interface ActiveCallProps {
    readonly isJoined: false;
}

interface JoinedCallProps {
    readonly isJoined: true;
    readonly startedAt: Date;
}
