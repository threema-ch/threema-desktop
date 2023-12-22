import type {ServicesForModel} from '~/common/model/types/common';
import type {
    DevicesSettingsController,
    DevicesSettings,
    DevicesSettingsUpdate,
    DevicesSettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {ensureDeviceName} from '~/common/network/types';
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

const DEFAULT_DEVICE_NAME = ensureDeviceName(`${import.meta.env.APP_NAME} for Desktop`);

export class DevicesSettingsModelStore extends LocalModelStore<DevicesSettings> {
    public constructor(services: ServicesForModel) {
        const {logging} = services;
        const tag = 'devices-settings';

        const devicesSettings = services.db.getSettings('devices') ?? {
            deviceName: DEFAULT_DEVICE_NAME,
        };

        super(
            {...devicesSettings, deviceName: devicesSettings.deviceName ?? DEFAULT_DEVICE_NAME},
            new DevicesSettingsModelController(services),
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
