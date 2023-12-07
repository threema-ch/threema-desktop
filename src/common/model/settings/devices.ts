import type {ServicesForModel} from '~/common/model/types/common';
import type {
    DevicesSettingsController,
    DevicesSettings,
    DevicesSettingsUpdate,
    DevicesSettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

export class DevicesSettingsModelController implements DevicesSettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<DevicesSettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    public async update(change: DevicesSettingsUpdate): Promise<void> {
        this.meta.update((view) =>
            this._services.db.setSettings('devices', {
                ...view,
                ...change,
            }),
        );
    }
}

export class DevicesSettingsModelStore extends LocalModelStore<DevicesSettings> {
    public constructor(services: ServicesForModel, devicesSettingsDefault: DevicesSettingsView) {
        const {logging} = services;
        const tag = 'devices-settings';
        const devicesSettings = services.db.getSettings('devices') ?? devicesSettingsDefault;

        super(devicesSettings, new DevicesSettingsModelController(services), undefined, undefined, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }
}
