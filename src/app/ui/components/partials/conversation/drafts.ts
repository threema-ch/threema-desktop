import type {EditedMessage, QuotedMessage} from '~/app/ui/components/partials/conversation/types';
import type {DbReceiverLookup} from '~/common/db';
import {WritableStore} from '~/common/utils/store';

export interface Draft {
    readonly text: string;
    readonly extended?:
        | {
              readonly type: 'quote';
              readonly quote: QuotedMessage;
          }
        | {
              readonly type: 'edit';
              readonly edit: EditedMessage;
              readonly quote: QuotedMessage;
          };
}

export type ConversationDraftStore = WritableStore<Draft | undefined>;

// TODO(DESK-306): Replace with the real message drafts.
class ConversationDrafts {
    private readonly _conversationDrafts: Map<string, ConversationDraftStore>;

    public constructor() {
        this._conversationDrafts = new Map();
    }

    public getOrCreateStore(receiverLookup?: DbReceiverLookup): ConversationDraftStore {
        if (receiverLookup === undefined) {
            return new WritableStore<Draft | undefined>(undefined);
        }

        const key = this._getKey(receiverLookup);
        let draftStore = this._conversationDrafts.get(key);
        if (draftStore === undefined) {
            draftStore = new WritableStore<Draft | undefined>(undefined);
            this._conversationDrafts.set(key, draftStore);
        }
        return draftStore;
    }

    private _getKey(receiverLookup: DbReceiverLookup): string {
        return `${receiverLookup.type}.${receiverLookup.uid}`;
    }
}

export const conversationDrafts = new ConversationDrafts();
