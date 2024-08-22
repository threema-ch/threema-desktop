import {UnknownContactPolicy} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {ServicesForModel} from '~/common/model';
import type {
    PrivacySettings,
    PrivacySettingsController,
    PrivacySettingsUpdate,
    PrivacySettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import type {IdentityString} from '~/common/network/types';
import {PROXY_HANDLER} from '~/common/utils/endpoint';

export class PrivacySettingsModelController implements PrivacySettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<PrivacySettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    public async update(change: PrivacySettingsUpdate): Promise<void> {
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

export class PrivacySettingsModelStore extends ModelStore<PrivacySettings> {
    public constructor(services: ServicesForModel) {
        const {logging} = services;
        const tag = 'privacy-settings';
        super(
            services.db.getSettings('privacy') ?? {},
            new PrivacySettingsModelController(services),
            undefined,
            undefined,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}
