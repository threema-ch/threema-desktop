import {
    type ProfileSettings,
    type ProfileSettingsController,
    type ProfileSettingsUpdate,
    type ProfileSettingsView,
    type ServicesForModel,
} from '~/common/model';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';

export class ProfileSettingsModelController implements ProfileSettingsController {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
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
        const tag = 'ProfileSettings';
        const profileSettings = services.db.getSettingsWithDefaults(
            'profile',
            profileSettingsDefaults,
        );

        super(profileSettings, new ProfileSettingsModelController(services), undefined, undefined, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }
}
