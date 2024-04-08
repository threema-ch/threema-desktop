import type {
    ContactReceiverData,
    DistributionListReceiverData,
    GroupReceiverData,
} from '~/common/viewmodel/utils/receiver';

export interface DeleteConversationModalProps {
    readonly conversation: {
        readonly delete: () => Promise<void>;
    };
    readonly receiver:
        | Pick<ContactReceiverData, 'name' | 'type' | 'lookup'>
        | Pick<DistributionListReceiverData, 'name' | 'type' | 'lookup'>
        | Pick<GroupReceiverData, 'name' | 'type' | 'lookup' | 'isLeft'>;
}
