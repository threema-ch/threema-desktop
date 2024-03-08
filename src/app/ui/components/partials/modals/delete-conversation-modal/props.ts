import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

export interface DeleteConversationModalProps {
    readonly conversation: {
        readonly delete: () => Promise<void>;
    };
    readonly receiver: Pick<AnyReceiverData, 'name' | 'type' | 'lookup'>;
}
