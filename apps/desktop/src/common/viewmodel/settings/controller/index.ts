import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';

import {TRANSFER_HANDLER} from '~/common/index';
import type {Contact} from '~/common/model';
import type {PredefinedContactIdentity} from '~/common/model/types/contact';
import type {WorkAvailabilityStatus} from '~/common/model/types/work-availability-status';
import type {ModelStore} from '~/common/model/utils/model-store';
import {unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {SettingsPageUpdate} from '~/common/viewmodel/settings/controller/types';

export interface ISettingsViewModelController extends ProxyMarked {
    readonly update: (settingsUpdate: SettingsPageUpdate) => void;

    readonly updateProfilePicture: (
        profilePicture: ReadonlyUint8Array | undefined,
    ) => Promise<void>;

    readonly updateWorkAvailabilityStatus: (
        workAvailabilityStatus: WorkAvailabilityStatus,
    ) => Promise<void>;

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

    public update(settingsUpdate: SettingsPageUpdate): void {
        const {user} = this._services.model;
        switch (settingsUpdate.type) {
            case 'appearance':
                user.appearanceSettings.get().controller.update(settingsUpdate.update);
                break;
            case 'calls':
                user.callsSettings.get().controller.update(settingsUpdate.update);
                break;
            case 'chat':
                user.chatSettings.get().controller.update(settingsUpdate.update);
                break;
            case 'devices':
                user.devicesSettings.get().controller.update(settingsUpdate.update);
                break;
            case 'media':
                user.mediaSettings.get().controller.update(settingsUpdate.update);
                break;
            case 'privacy':
                user.privacySettings.get().controller.update(settingsUpdate.update);
                break;
            case 'profile':
                user.profileSettings.get().controller.update.direct(settingsUpdate.update);
                break;
            case 'troubleshooting':
                user.troubleshootingSettings.get().controller.update(settingsUpdate.update);
                break;
            case 'work':
                user.workSettings.get().controller.update(settingsUpdate.update);
                break;
            default:
                unreachable(settingsUpdate);
        }
    }

    public async updateProfilePicture(
        profilePicture: ReadonlyUint8Array | undefined,
    ): Promise<void> {
        const {user} = this._services.model;

        if (profilePicture === undefined) {
            await user.profileSettings.get().controller.removeProfilePicture.fromLocal();
        } else {
            await user.profileSettings.get().controller.setProfilePicture.fromLocal(profilePicture);
        }
    }

    public async updateWorkAvailabilityStatus(
        workAvailabilityStatus: WorkAvailabilityStatus,
    ): Promise<void> {
        const {user} = this._services.model;

        await user.profileSettings
            .get()
            .controller.setWorkAvailabilityStatus.fromLocal(workAvailabilityStatus);
    }

    /** @inheritdoc */
    public async getOrCreatePredefinedContact(
        identity: PredefinedContactIdentity,
    ): Promise<ModelStore<Contact>> {
        return await this._services.model.contacts.getOrCreatePredefinedContact(identity);
    }
}
