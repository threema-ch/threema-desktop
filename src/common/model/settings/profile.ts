import {type ServicesForModel} from '~/common/model';
import {
    type ProfileSettings,
    type ProfileSettingsController,
    type ProfileSettingsUpdate,
    type ProfileSettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {type IdentityString} from '~/common/network/types';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

/**
 * Sharing policy for the user's own profile picture.
 */
export type ProfilePictureShareWith =
    | {readonly group: 'nobody'}
    | {readonly group: 'everyone'}
    | {readonly group: 'allowList'; readonly allowList: readonly IdentityString[]};

export class ProfileSettingsModelController implements ProfileSettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<ProfileSettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    public update(change: ProfileSettingsUpdate): void {
        this.meta.update((view) =>
            this._services.db.setSettings('profile', {
                ...view,
                ...change,
            }),
        );
    }
}

export class ProfileSettingsModelStore extends LocalModelStore<ProfileSettings> {
    public constructor(services: ServicesForModel, profileSettingsDefaults: ProfileSettingsView) {
        const {logging} = services;
        const tag = 'profile-settings';
        const profileSettings = services.db.getSettings('profile') ?? profileSettingsDefaults;

        super(profileSettings, new ProfileSettingsModelController(services), undefined, undefined, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }
}
