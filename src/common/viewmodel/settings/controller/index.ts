import {TRANSFER_HANDLER} from '~/common/index';
import type {Contact} from '~/common/model';
import type {PredefinedContactIdentity} from '~/common/model/types/contact';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';

export interface ISettingsViewModelController extends ProxyMarked {
    /**
     * Checks whether a contact for the given `identity` string exists, otherwise creating a new
     * contact for the given identity and returning it.
     */
    readonly getOrCreatePredefinedContact: (
        identity: PredefinedContactIdentity,
    ) => Promise<LocalModelStore<Contact>>;
}

export class SettingsViewModelController implements ISettingsViewModelController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(private readonly _services: ServicesForViewModel) {}

    /** @inheritdoc */
    public async getOrCreatePredefinedContact(
        identity: PredefinedContactIdentity,
    ): Promise<LocalModelStore<Contact>> {
        return await this._services.model.contacts.getOrCreatePredefinedContact(identity);
    }
}
