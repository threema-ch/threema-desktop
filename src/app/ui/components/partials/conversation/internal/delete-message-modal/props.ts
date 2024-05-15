import type {MessageListMessage} from '~/app/ui/components/partials/conversation/internal/message-list/props';
import type {FeatureSupport} from '~/common/viewmodel/conversation/main/store/types';

export interface DeleteMessageModalProps {
    message: MessageListMessage;
    featureSupport: FeatureSupport;
}
