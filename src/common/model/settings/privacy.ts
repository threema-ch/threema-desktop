import {
    type PrivacySettings,
    type PrivacySettingsController,
    type PrivacySettingsUpdate,
    type PrivacySettingsView,
    type ServicesForModel,
} from '~/common/model';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';

export class PrivacySettingsModelController implements PrivacySettingsController {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
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
