import type {ServicesForModel} from '~/common/model';
import type {
    CallsSettings,
    CallsSettingsController,
    CallsSettingsUpdate,
    CallsSettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

export class CallsSettingsModelController implements CallsSettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<CallsSettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    public update(change: CallsSettingsUpdate): void {
        this.meta.update((view) =>
            this._services.db.setSettings('calls', {
                ...view,
                ...change,
            }),
        );
    }
}

export class CallsSettingsModelStore extends LocalModelStore<CallsSettings> {
    public constructor(services: ServicesForModel, callsSettingsDefaults: CallsSettingsView) {
        const {logging} = services;
        const tag = 'calls-settings';
        const callsSettings = services.db.getSettings('calls') ?? callsSettingsDefaults;

        super(callsSettings, new CallsSettingsModelController(services), undefined, undefined, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }
}
