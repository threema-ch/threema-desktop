import {TRANSFER_HANDLER} from '~/common/index';
import type {Contact} from '~/common/model';
import type {PredefinedContactIdentity} from '~/common/model/types/contact';
import type {ModelStore} from '~/common/model/utils/model-store';
import {unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {SettingsPageUpdate} from '~/common/viewmodel/settings/controller/types';

export interface ISettingsViewModelController extends ProxyMarked {
    readonly update: (settingsUpdate: SettingsPageUpdate) => Promise<void>;

    /**
     * Checks whether a contact for the given `identity` string exists, otherwise creating a new
     * contact for the given identity and returning it.
     */
    readonly getOrCreatePredefinedContact: (
        identity: PredefinedContactIdentity,
    ) => Promise<ModelStore<Contact>>;
}

export class SettingsViewModelController implements ISettingsViewModelController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(private readonly _services: ServicesForViewModel) {}

    public async update(settingsUpdate: SettingsPageUpdate): Promise<void> {
        const {user} = this._services.model;
        switch (settingsUpdate.type) {
            case 'appearance':
                await user.appearanceSettings.get().controller.update(settingsUpdate.update);
                break;
            case 'calls':
                await user.callsSettings.get().controller.update(settingsUpdate.update);
                break;
            case 'chat':
                await user.chatSettings.get().controller.update(settingsUpdate.update);
                break;
            case 'devices':
                await user.devicesSettings.get().controller.update(settingsUpdate.update);
                break;
            case 'media':
                await user.mediaSettings.get().controller.update(settingsUpdate.update);
                break;
            case 'privacy':
                await user.privacySettings.get().controller.update(settingsUpdate.update);
                break;
            case 'profile':
                await user.profileSettings.get().controller.update(settingsUpdate.update);
                break;
            default:
                unreachable(settingsUpdate);
        }
    }

    /** @inheritdoc */
    public async getOrCreatePredefinedContact(
        identity: PredefinedContactIdentity,
    ): Promise<ModelStore<Contact>> {
        return await this._services.model.contacts.getOrCreatePredefinedContact(identity);
    }
}
