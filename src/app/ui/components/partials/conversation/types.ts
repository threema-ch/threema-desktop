import type * as v from '@badrap/valita';

import type {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import type {MediaFile} from '~/app/ui/modal/media-message';
import type {Remote} from '~/common/utils/endpoint';
import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';

/**
 * Shape of the router's route params if it's a "conversation" route.
 */
export type ConversationRouteParams = v.Infer<
    (typeof ROUTE_DEFINITIONS)['main']['conversation']['params']
>;

/**
 * Type of the value contained in a `ConversationViewModelStore` transferred from {@link Remote}.
 */
export type RemoteConversationViewModelStoreValue = ReturnType<
    Remote<ConversationViewModelBundle>['viewModelStore']['get']
>;

export type ModalState = NoneModalState | ClearConversationModalState;

interface NoneModalState {
    readonly type: 'none';
}

interface ClearConversationModalState {
    readonly type: 'media-compose';
    readonly props: {
        readonly title: string;
        readonly mediaFiles: MediaFile[];
        readonly visible: boolean;
    };
}
