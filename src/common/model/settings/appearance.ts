import type {ServicesForModel} from '~/common/model/types/common';
import type {
    AppearanceSettingsUpdate,
    AppearanceSettings,
    AppearanceSettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

export class AppearanceSettingsController implements AppearanceSettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<AppearanceSettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    public async update(change: AppearanceSettingsUpdate): Promise<void> {
        this.meta.update((view) =>
            this._services.db.setSettings('appearance', {
                ...view,
                ...change,
            }),
        );
    }
}

export class AppearanceSettingsModelStore extends LocalModelStore<AppearanceSettings> {
    public constructor(
        services: ServicesForModel,
        appearanceSettingsDefault: AppearanceSettingsView,
    ) {
        const {logging} = services;
        const tag = 'appearance-settings';
        const appearanceSettings =
            services.db.getSettings('appearance') ?? appearanceSettingsDefault;

        super(
            appearanceSettings,
            new AppearanceSettingsController(services),
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
