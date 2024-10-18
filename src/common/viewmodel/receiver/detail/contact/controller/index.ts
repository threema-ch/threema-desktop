import {TRANSFER_HANDLER} from '~/common/index';
import type {Contact} from '~/common/model';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import {
    updateReceiverData,
    type ContactReceiverUpdateData,
} from '~/common/viewmodel/utils/receiver';

export interface IContactDetailViewModelController extends ProxyMarked {
    /**
     * Update the contact with the provided data.
     */
    readonly edit: (update: ContactReceiverUpdateData) => Promise<void>;
}

export class ContactDetailViewModelController implements IContactDetailViewModelController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(private readonly _contact: Contact) {}

    /** @inheritdoc */
    public async edit(update: ContactReceiverUpdateData): Promise<void> {
        return await updateReceiverData(this._contact, update);
    }
}
