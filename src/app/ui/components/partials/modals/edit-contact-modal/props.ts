import type {AppServicesForSvelte} from '~/app/types';
import type {Contact} from '~/common/model';
import type {ReceiverDataFor, ReceiverUpdateDataFor} from '~/common/viewmodel/utils/receiver';

export interface EditContactModalProps {
    readonly receiver: ReceiverDataFor<Contact> & {
        readonly edit: (update: ReceiverUpdateDataFor<Contact>) => Promise<void>;
    };
    readonly services: Pick<AppServicesForSvelte, 'profilePicture'>;
}
