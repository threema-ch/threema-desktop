import {GroupCallPolicy, O2oCallConnectionPolicy, O2oCallPolicy} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {ServicesForModel} from '~/common/model';
import type {
    CallsSettings,
    CallsSettingsController,
    CallsSettingsUpdate,
    CallsSettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {filterUndefinedProperties} from '~/common/utils/object';

export const DEFAULT_CALLS_SETTINGS: CallsSettingsView = {
    o2oCallPolicy: O2oCallPolicy.ALLOW_CALL,
    o2oCallConnectionPolicy: O2oCallConnectionPolicy.ALLOW_DIRECT,
    groupCallPolicy: GroupCallPolicy.ALLOW_GROUP_CALL,
};

export class CallsSettingsModelController implements CallsSettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<CallsSettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    public async update(change: CallsSettingsUpdate): Promise<void> {
        this.meta.update((view) =>
            this._services.db.setSettings('calls', {
                ...view,
                ...filterUndefinedProperties(change),
            }),
        );
    }
}

export class CallsSettingsModelStore extends ModelStore<CallsSettings> {
    public constructor(services: ServicesForModel) {
        const {logging} = services;
        const tag = 'settings.calls';
        const stored = services.db.getSettings('calls');
        super(
            {...DEFAULT_CALLS_SETTINGS, ...filterUndefinedProperties(stored ?? {})},
            new CallsSettingsModelController(services),
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
