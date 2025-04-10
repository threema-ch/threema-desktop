import {MessageDirection, ReceiverType} from '~/common/enum';
import type {AnyMessageModel} from '~/common/model';
import {getUserInitials} from '~/common/model/user';
import {unreachable} from '~/common/utils/assert';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ConversationDeletedMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/deleted-message';
import type {ConversationRegularMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/regular-message';
import type {ConversationStatusMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/status-message';
import type {RemovedContactData} from '~/common/viewmodel/utils/contact';
import type {AnySenderData} from '~/common/viewmodel/utils/sender';
import {getUserDisplayName} from '~/common/viewmodel/utils/user';

/**
 * Union of all possible MessageViewModelBundle types.
 */
export type AnyConversationMessageViewModelBundle =
    | ConversationDeletedMessageViewModelBundle
    | ConversationRegularMessageViewModelBundle
    | ConversationStatusMessageViewModelBundle;

/**
 * Data related to a (message) sender.
 *
 * A message cannot have {@link RemovedContactData} because if a contact was removed in older
 * versions, all messages from the contact were deleted.
 */
export type MessageSenderData = Exclude<AnySenderData, RemovedContactData>;

/**
 * Data about the status of a message.
 */
export interface MessageStatusData {
    readonly created: MessageStatusDetailData;
    readonly received?: MessageStatusDetailData;
    readonly sent?: MessageStatusDetailData;
    readonly delivered?: MessageStatusDetailData;
    readonly read?: MessageStatusDetailData;
    readonly error?: MessageStatusDetailData;
    readonly deleted?: MessageStatusDetailData;
    readonly edited?: MessageStatusDetailData;
}

interface MessageStatusDetailData {
    /** When the status was reached. */
    readonly at: Date;
}

/**
 * Returns data related to the sender of a message for a message viewmodel.
 */
export function getMessageSenderData(
    services: Pick<ServicesForViewModel, 'device' | 'model'>,
    messageModel: AnyMessageModel,
    getAndSubscribe: GetAndSubscribeFunction,
): MessageSenderData {
    switch (messageModel.ctx) {
        case MessageDirection.INBOUND: {
            const sender = getAndSubscribe(messageModel.controller.sender());

            return {
                type: 'contact',
                color: sender.view.color,
                id: `${sender.type}.${sender.ctx}`,
                identity: sender.view.identity,
                initials: sender.view.initials,
                lookup: {type: ReceiverType.CONTACT, uid: sender.ctx},
                name: sender.view.displayName,
            };
        }

        case MessageDirection.OUTBOUND: {
            const profilePicture = getAndSubscribe(services.model.user.profilePicture);
            const displayName = getUserDisplayName(
                services,
                getAndSubscribe(services.model.user.profileSettings).view.nickname,
            );

            return {
                type: 'self',
                id: 'self',
                color: profilePicture.color,
                initials: getUserInitials(displayName),
                name: displayName,
                identity: services.device.identity.string,
            };
        }

        default:
            return unreachable(messageModel);
    }
}

/**
 * Returns data related to the status of a message for a message viewmodel.
 */
export function getMessageStatusData(messageModel: AnyMessageModel): MessageStatusData {
    const {view} = messageModel;

    return {
        created: {
            at: view.createdAt,
        },
        ...(view.direction === MessageDirection.INBOUND
            ? {
                  received: {
                      at: view.receivedAt,
                  },
              }
            : {}),
        ...(view.direction === MessageDirection.OUTBOUND && view.sentAt !== undefined
            ? {
                  sent: {
                      at: view.sentAt,
                  },
              }
            : {}),
        ...(view.direction === MessageDirection.OUTBOUND && view.deliveredAt !== undefined
            ? {
                  delivered: {
                      at: view.deliveredAt,
                  },
              }
            : {}),
        ...(view.readAt !== undefined
            ? {
                  read: {
                      at: view.readAt,
                  },
              }
            : {}),
        ...(view.deletedAt !== undefined
            ? {
                  deleted: {
                      at: view.deletedAt,
                  },
              }
            : {}),
        ...(view.lastEditedAt !== undefined
            ? {
                  edited: {
                      at: view.lastEditedAt,
                  },
              }
            : {}),
    };
}
