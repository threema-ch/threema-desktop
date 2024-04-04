/**
 * Main model types.
 *
 * For every entity, there are a few different types. For example, for a contact:
 *
 * - The `ContactView` interface contains the "actual model fields"
 * - The `ContactController` defines methods to work with a contact's data, e.g. to get a related conversation
 * - The `Contact` type ties the view to a controller and makes it a `LocalModel`
 * - The `ContactInit` type contains all fields of `ContactView` that are not generated
 *   automatically by the storage backend (e.g. `createdAt` timestamps or auto-incrementing values),
 *   it is used to create a new contact
 *
 * This file re-exports the most commonly used types. More detailed types should be imported
 * directly from the corresponding type module.
 */

// Export common types
export {
    type ServicesForModel,
    type LocalModel,
    type LocalModelController,
    type RemoteModel,
    type RemoteModelController,
    type RemoteModelFor,
    type RemoteModelStoreFor,
} from '~/common/model/types/common';

// Export models
export {
    type Contact,
    type ContactController,
    type ContactInit,
    type ContactUpdate,
    type ContactView,
} from '~/common/model/types/contact';
export {
    type Conversation,
    type ConversationController,
    type ConversationInit,
    type ConversationUpdate,
    type ConversationView,
} from '~/common/model/types/conversation';
export {
    type DistributionList,
    type DistributionListView,
} from '~/common/model/types/distribution-list';
export {
    type Group,
    type GroupController,
    type GroupInit,
    type GroupUpdate,
    type GroupView,
} from '~/common/model/types/group';
export {
    type AnyMessage,
    type AnyMessageModel,
    type AnyInboundMessageModel,
    type AnyOutboundMessageModel,
    type AnyMessageModelStore,
    type AnyInboundNonDeletedMessageModelStore,
    type AnyOutboundNonDeletedMessageModelStore,
    type DirectedMessageFor,
    type MessageFor,
} from '~/common/model/types/message';
export {
    type ProfilePicture,
    type ProfilePictureController,
    type ProfilePictureView,
    type ProfilePictureSource,
} from '~/common/model/types/profile-picture';
export {type AnyReceiver, type AnyReceiverStore} from '~/common/model/types/receiver';
export {type User} from '~/common/model/types/user';

// Export repositories
export {type Repositories} from '~/common/model/repositories';
export {type ContactRepository} from '~/common/model/types/contact';
export {type ConversationRepository} from '~/common/model/types/conversation';
export {type GroupRepository} from '~/common/model/types/group';
export {type MessageRepository} from '~/common/model/types/message';
