import {TRANSFER_HANDLER} from '~/common/index';
import type {ServicesForModel} from '~/common/model';
import type {
    ProfileSettings,
    ProfileSettingsController,
    ProfileSettingsUpdate,
    ProfileSettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import type {IdentityString} from '~/common/network/types';
import {PROXY_HANDLER} from '~/common/utils/endpoint';

/**
 * Sharing policy for the user's own profile picture.
 */
export type ProfilePictureShareWith =
    | {readonly group: 'nobody'}
    | {readonly group: 'everyone'}
    | {readonly group: 'allowList'; readonly allowList: readonly IdentityString[]};

export class ProfileSettingsModelController implements ProfileSettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly lifetimeGuard = new ModelLifetimeGuard<ProfileSettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    public async update(change: ProfileSettingsUpdate): Promise<void> {
        this.lifetimeGuard.update((view) =>
            this._services.db.setSettings('profile', {
                ...view,
                ...change,
            }),
        );
    }
}

export class ProfileSettingsModelStore extends ModelStore<ProfileSettings> {
    public constructor(services: ServicesForModel) {
        const {logging} = services;
        const tag = 'settings.profile';
        const profileSettings = services.db.getSettings('profile') ?? {
            nickname: undefined,
            profilePicture: undefined,
            profilePictureShareWith: {group: 'everyone'},
        };

        super(profileSettings, new ProfileSettingsModelController(services), undefined, undefined, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }
}
