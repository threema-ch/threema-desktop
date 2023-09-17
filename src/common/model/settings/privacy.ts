import {UnknownContactPolicy} from '~/common/enum';
import type {ServicesForModel} from '~/common/model';
import type {
    PrivacySettings,
    PrivacySettingsController,
    PrivacySettingsUpdate,
    PrivacySettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import type {IdentityString} from '~/common/network/types';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

export class PrivacySettingsModelController implements PrivacySettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<PrivacySettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    public update(change: PrivacySettingsUpdate): void {
        this.meta.update((view) =>
            this._services.db.setSettings('privacy', {
                ...view,
                ...change,
            }),
        );
    }

    public isIdentityExplicitlyBlocked(identity: IdentityString): boolean {
        return this.meta.run(
            (handle) => handle.view().blockedIdentities?.identities.includes(identity) ?? false,
        );
    }

    public isContactBlocked(identity: IdentityString): boolean {
        if (this.isIdentityExplicitlyBlocked(identity)) {
            // The contact is explicitly blocked in the privacy settings.
            return true;
        }

        const contact = this._services.model.contacts.getByIdentity(identity);

        if (contact !== undefined) {
            // The contact is known and not explicitly blocked in the privacy settings.
            return false;
        }

        const isBlockUnknownPolicySet = this.meta.run(
            (handle) => handle.view().unknownContactPolicy === UnknownContactPolicy.BLOCK_UNKNOWN,
        );

        if (isBlockUnknownPolicySet) {
            // The contact is unknown and implicitly blocked by the privacy settings because
            // UnknownContactPolicy is set to BLOCK_UNKNOWN.
            return true;
        }

        // The contact is unknown and not implicitly blocked by the privacy settings.
        return false;
    }
}

export class PrivacySettingsModelStore extends LocalModelStore<PrivacySettings> {
    public constructor(services: ServicesForModel, privacySettingsDefaults: PrivacySettingsView) {
        const {logging} = services;
        const tag = 'privacy-settings';
        const privacySettings = services.db.getSettings('privacy') ?? privacySettingsDefaults;

        super(privacySettings, new PrivacySettingsModelController(services), undefined, undefined, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }
}
