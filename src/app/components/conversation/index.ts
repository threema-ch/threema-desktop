import {SyncEvent} from 'ts-events';

import {type ReceiverType as ReceiverType3SC} from '#3sc/types';
import {type ReceiverNotificationPolicy} from '~/app/components/receiver';
import {type DbConversationUid, type DbReceiverLookup} from '~/common/db';
import {type ConversationCategory, type ConversationVisibility, ReceiverType} from '~/common/enum';
import {
    type AnyReceiverStore,
    type Avatar,
    type Conversation,
    type RemoteModelFor,
    type RemoteModelStoreFor,
} from '~/common/model';
import {type RemoteModelStore} from '~/common/model/utils/model-store';
import {assertUnreachable} from '~/common/utils/assert';
import {WritableStore} from '~/common/utils/store';
import {type AnyReceiverData} from '~/common/viewmodel/types';

/**
 * Transformed data necessary to display a conversation.
 */
export interface ConversationData {
    /**
     * Conversation data.
     */
    readonly conversation: {
        /**
         * Conversation UID.
         */
        readonly uid: DbConversationUid;
        /**
         * Conversation category.
         */
        readonly category: ConversationCategory;
        /**
         * Conversation visibility.
         */
        readonly visibility: ConversationVisibility;
    };
    /**
     * Receiver data.
     */
    readonly receiver: AnyReceiverData & {
        /**
         * Notification policy for this conversation.
         */
        readonly notifications: ReceiverNotificationPolicy;
    };
}

/**
 * Stores necessary to display a conversation.
 */
export interface ConversationStores {
    /**
     * Receiver store.
     */
    readonly receiver: RemoteModelStoreFor<AnyReceiverStore>;

    /**
     * Avatar of the receiver.
     */
    readonly avatar: RemoteModelStore<Avatar>;
}

export function transformConversation(
    conversation: RemoteModelFor<Conversation>,
): ConversationData['conversation'] {
    return {
        uid: conversation.ctx,
        category: conversation.view.category,
        visibility: conversation.view.visibility,
    };
}

export function convertReceiverType(type: ReceiverType): ReceiverType3SC {
    switch (type) {
        case ReceiverType.CONTACT:
            return 'contact';
        case ReceiverType.DISTRIBUTION_LIST:
            return 'distribution-list';
        case ReceiverType.GROUP:
            return 'group';
        default:
            return assertUnreachable(type);
    }
}

export type ConversationListEvent =
    | {action: 'scroll-to-top'}
    | {action: 'scroll-to-receiver'; receiverLookup: DbReceiverLookup};
export const conversationListEvent = new SyncEvent<ConversationListEvent>();

export type ConversationDraftStore = WritableStore<string | undefined>;

// TODO(WEBMD-306): Replace with the real message drafts
class ConversationDrafts {
    private readonly _conversationDrafts: Map<string, ConversationDraftStore>;

    public constructor() {
        this._conversationDrafts = new Map();
    }

    public getOrCreateStore(receiverLookup: DbReceiverLookup): ConversationDraftStore {
        const key = this._getKey(receiverLookup);
        let draftStore = this._conversationDrafts.get(key);
        if (draftStore === undefined) {
            draftStore = new WritableStore<string | undefined>(undefined);
            this._conversationDrafts.set(key, draftStore);
        }
        return draftStore;
    }

    private _getKey(receiverLookup: DbReceiverLookup): string {
        return `${receiverLookup.type}.${receiverLookup.uid}`;
    }
}

export const conversationDrafts = new ConversationDrafts();
