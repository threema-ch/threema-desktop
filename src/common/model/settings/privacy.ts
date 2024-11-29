import {AcquaintanceLevel, UnknownContactPolicy} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {ServicesForModel} from '~/common/model';
import {isPredefinedContact} from '~/common/model/types/contact';
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
    public readonly lifetimeGuard = new ModelLifetimeGuard<PrivacySettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    public update(change: PrivacySettingsUpdate): void {
        this.lifetimeGuard.update((view) =>
            this._services.db.setSettings('privacy', {
                ...view,
                ...change,
            }),
        );
    }

    public isIdentityExplicitlyBlocked(identity: IdentityString): boolean {
        return this.lifetimeGuard.run(
            (handle) => handle.view().blockedIdentities?.identities.includes(identity) ?? false,
        );
    }

    public isContactBlocked(identity: IdentityString): boolean {
        if (this.isIdentityExplicitlyBlocked(identity)) {
            // The contact is explicitly blocked in the privacy settings.
            return true;
        }

        const isBlockUnknownPolicySet = this.lifetimeGuard.run(
            (handle) => handle.view().unknownContactPolicy === UnknownContactPolicy.BLOCK_UNKNOWN,
        );

        if (!isBlockUnknownPolicySet) {
            // Implicit blocking is not activated.
            return false;
        }

        if (isPredefinedContact(identity)) {
            // Predefined contacts cannot be blocked.
            return false;
        }

        const contact = this._services.model.contacts.getByIdentity(identity);

        if (contact === undefined) {
            // The contact is unknown and blocked by the privacy settings.
            return true;
        }

        if (contact.get().view.acquaintanceLevel === AcquaintanceLevel.DIRECT) {
            // The contact is a "standard contact" and not blocked.
            return false;
        }

        if (this._services.db.getAllCommonGroupsByContact(contact.ctx).length > 0) {
            // If we share at least one group where we are a member, the contact is not blocked.
            return false;
        }

        // The contact is blocked.
        return true;
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
