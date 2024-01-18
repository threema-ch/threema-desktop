import type {AppServices} from '~/app/types';
import type {RemoteModelStoreFor, Contact} from '~/common/model';
import type {LocalModelStore} from '~/common/model/utils/model-store';

export interface ForwardRecipientProps {
    readonly services: AppServices;
    readonly filter: string;
    readonly contact: RemoteModelStoreFor<LocalModelStore<Contact>>;
}
