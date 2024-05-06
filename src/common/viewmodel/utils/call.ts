import type {ContactReceiverData} from '~/common/viewmodel/utils/receiver';

export type AnyCallProps = ActiveCallProps | JoinedCallProps;

interface BaseCallProps {
    /**
     * Contacts that are currently part of the call.
     */
    readonly members: ContactReceiverData[];
}

interface ActiveCallProps extends BaseCallProps {
    readonly isJoined: false;
}

interface JoinedCallProps extends BaseCallProps {
    readonly isJoined: true;
    readonly startedAt: Date;
}

// TODO(DESK-1447): Add utility functions to abstract gathering call details, because this might be
// used in multiple viewmodels.
