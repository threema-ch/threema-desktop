import {CallStatisticsPolicy} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {ServicesForModel} from '~/common/model/types/common';
import type {
    TroubleshootingSettingsController,
    TroubleshootingSettings,
    TroubleshootingSettingsUpdate,
    TroubleshootingSettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {filterUndefinedProperties} from '~/common/utils/object';

export const DEFAULT_TROUBLESHOOTING_SETTINGS: TroubleshootingSettingsView = {
    // Call statistics can only be recorded in builds that allow it.
    callStatisticsPolicy: import.meta.env.ALLOW_RTC_STATS_RECORDING
        ? CallStatisticsPolicy.RECORD_LOCALLY
        : CallStatisticsPolicy.DENY_RECORDING,
};

export class TroubleshootingSettingsModelController implements TroubleshootingSettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly lifetimeGuard = new ModelLifetimeGuard<TroubleshootingSettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    public update(change: TroubleshootingSettingsUpdate): void {
        this.lifetimeGuard.update((view) =>
            this._services.db.setSettings('troubleshooting', {
                ...view,
                ...filterUndefinedProperties(change),
            }),
        );
    }
}

export class TroubleshootingSettingsModelStore extends ModelStore<TroubleshootingSettings> {
    public constructor(services: ServicesForModel) {
        const {logging} = services;
        const tag = 'settings.troubleshooting';
        const stored = services.db.getSettings('troubleshooting');
        super(
            {...DEFAULT_TROUBLESHOOTING_SETTINGS, ...filterUndefinedProperties(stored ?? {})},
            new TroubleshootingSettingsModelController(services),
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
