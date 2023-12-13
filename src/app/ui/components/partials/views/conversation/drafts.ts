import type {DbReceiverLookup} from '~/common/db';
import {WritableStore} from '~/common/utils/store';

export type ConversationDraftStore = WritableStore<string | undefined>;

// TODO(DESK-306): Replace with the real message drafts.
class ConversationDrafts {
    private readonly _conversationDrafts: Map<string, ConversationDraftStore>;

    public constructor() {
        this._conversationDrafts = new Map();
    }

    public getOrCreateStore(receiverLookup?: DbReceiverLookup): ConversationDraftStore {
        if (receiverLookup === undefined) {
            return new WritableStore<string | undefined>(undefined);
        }

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
