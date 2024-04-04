import type {MessageListMessage} from '~/app/ui/components/partials/conversation/internal/message-list/props';
import type {FeatureSupport} from '~/app/ui/components/partials/conversation/types';

export type DeleteMessageModalProps = {message: MessageListMessage} & {
    featureSupport: FeatureSupport;
};
