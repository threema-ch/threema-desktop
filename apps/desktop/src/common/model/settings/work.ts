import {u64ToUnsignedLong} from '@threema/ts-utils/conversion/u64-to-unsigned-long';
import {unsignedLongToU64} from '@threema/ts-utils/conversion/unsigned-long-to-u64';

import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import {getAndParseMdm, type MdmAcceptedParamters, type MdmSchemaType} from '~/common/mdm';
import type {ServicesForModel} from '~/common/model/types/common';
import type {
    WorkSettings,
    WorkSettingsController,
    WorkSettingsUpdate,
    WorkSettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import type {WorkSettings as ValitaWorkSettings} from '~/common/settings/work';
import {assert, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {WritableStore, type IQueryableStore} from '~/common/utils/store';

const DEFAULT_WORK_SETTINGS: WorkSettingsView = {
    logo: {},
    threemaMdmParameters: new Map(),
};

function workSettingsToView(settings: ValitaWorkSettings): WorkSettingsView {
    const mdmParameterMap = new Map<string, MdmAcceptedParamters>();

    for (const [name, mdmValue] of Object.entries(settings.threemaMdmParameters)) {
        switch (mdmValue.value.$case) {
            case 'integerValue':
                mdmParameterMap.set(name, unsignedLongToU64(mdmValue.value.integerValue));
                break;
            case 'booleanValue':
                mdmParameterMap.set(name, mdmValue.value.booleanValue);
                break;
            case 'stringValue':
                mdmParameterMap.set(name, mdmValue.value.stringValue);
                break;
            default:
                unreachable(mdmValue.value);
        }
    }

    return {
        ...settings,
        threemaMdmParameters: mdmParameterMap,
    };
}

function workViewToSettings(view: WorkSettingsView): ValitaWorkSettings {
    const transformedMdmSettings: Record<string, {readonly value: MdmSchemaType}> = {};
    for (const [key, value] of view.threemaMdmParameters.entries()) {
        switch (typeof value) {
            case 'string':
                transformedMdmSettings[key] = {
                    value: {
                        $case: 'stringValue',
                        stringValue: value,
                    },
                };
                continue;
            case 'boolean':
                transformedMdmSettings[key] = {
                    value: {
                        $case: 'booleanValue',
                        booleanValue: value,
                    },
                };
                continue;
            case 'bigint':
                transformedMdmSettings[key] = {
                    value: {
                        $case: 'integerValue',
                        integerValue: u64ToUnsignedLong(value),
                    },
                };
                continue;
            default:
                unreachable(value);
        }
    }
    return {...view, threemaMdmParameters: transformedMdmSettings};
}

export class WorkSettingsModelController implements WorkSettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly lifetimeGuard = new ModelLifetimeGuard<WorkSettingsView>();

    private readonly _currentRemoteSecretMdmParameter = new WritableStore<boolean | undefined>(
        undefined,
    );

    public constructor(
        private readonly _services: ServicesForModel,
        private readonly _log: Logger,
        rsSetting: boolean | undefined,
    ) {
        this._currentRemoteSecretMdmParameter.set(rsSetting);
    }

    public get currentRemoteSecretMdmParameter(): IQueryableStore<boolean | undefined> {
        return this._currentRemoteSecretMdmParameter;
    }

    public update(change: WorkSettingsUpdate): void {
        assert(
            import.meta.env.BUILD_VARIANT === 'work' || import.meta.env.BUILD_VARIANT === 'custom',
            `Build variant must be "work" or "custom"`,
        );
        this.lifetimeGuard.update((view) => {
            if (change.threemaMdmParameters !== undefined) {
                const rsSetting = getAndParseMdm(
                    change.threemaMdmParameters,
                    'th_enable_remote_secret',
                    this._log,
                );
                this._currentRemoteSecretMdmParameter.set(rsSetting);
            }

            const settings = this._services.db.setSettings(
                'work',
                workViewToSettings({...view, ...change}),
            );
            return workSettingsToView(settings);
        });
    }
}

export class WorkSettingsModelStore extends ModelStore<WorkSettings> {
    public constructor(services: ServicesForModel) {
        const {logging} = services;
        const tag = 'work-settings';
        const dbSettings = services.db.getSettings('work');
        let initializedSettings = DEFAULT_WORK_SETTINGS;
        if (dbSettings !== undefined) {
            initializedSettings = workSettingsToView(dbSettings);
        }

        const log = logging.logger(`model.${tag}`);

        const rsSetting = getAndParseMdm(
            initializedSettings.threemaMdmParameters,
            'th_enable_remote_secret',
            log,
        );
        super(
            initializedSettings,
            new WorkSettingsModelController(services, log, rsSetting),
            undefined,
            undefined,
            {
                debug: {
                    log,
                    tag,
                },
            },
        );
    }
}
