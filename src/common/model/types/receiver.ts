import {type Contact} from '~/common/model/types/contact';
import {type Conversation} from '~/common/model/types/conversation';
import {type DistributionList} from '~/common/model/types/distribution-list';
import {type Group} from '~/common/model/types/group';
import {type ProfilePicture} from '~/common/model/types/profile-picture';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type NotificationTag} from '~/common/notification';

export type AnyReceiver = Contact | DistributionList | Group;
export type AnyReceiverStore =
    | LocalModelStore<Contact>
    | LocalModelStore<DistributionList>
    | LocalModelStore<Group>;

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
    readonly profilePicture: LocalModelStore<ProfilePicture>;

    /**
     * Get the receiver's associated conversation.
     */
    readonly conversation: () => LocalModelStore<Conversation>;
}
