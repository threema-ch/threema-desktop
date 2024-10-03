import type {ReceiverType} from '~/common/enum';
import type {Contact} from '~/common/model/types/contact';
import type {Conversation} from '~/common/model/types/conversation';
import type {DistributionList} from '~/common/model/types/distribution-list';
import type {Group} from '~/common/model/types/group';
import type {ProfilePicture} from '~/common/model/types/profile-picture';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {NotificationTag} from '~/common/notification';

export type AnyReceiver = Contact | DistributionList | Group;

export type AnyReceiverStore =
    | ModelStore<Contact>
    | ModelStore<DistributionList>
    | ModelStore<Group>;

export type ReceiverStoreFor<TReceiver extends AnyReceiver> = {
    readonly [ReceiverType.CONTACT]: ModelStore<Contact>;
    readonly [ReceiverType.DISTRIBUTION_LIST]: ModelStore<DistributionList>;
    readonly [ReceiverType.GROUP]: ModelStore<Group>;
}[TReceiver['type']];

export type ReceiverFor<TType extends ReceiverType> = {
    readonly [ReceiverType.CONTACT]: Contact;
    readonly [ReceiverType.DISTRIBUTION_LIST]: DistributionList;
    readonly [ReceiverType.GROUP]: Group;
}[TType];

/**
 * This interface is the common base for the contact controller, the group controller and the
 * distribution list controller.
 */
export interface ReceiverController {
    /** Unique notification tag. */
    readonly notificationTag: NotificationTag;

    /**
     * The receiver's associated profile picture store.
     */
    readonly profilePicture: ModelStore<ProfilePicture>;

    /**
     * Get the receiver's associated conversation.
     */
    readonly conversation: () => ModelStore<Conversation>;
}
