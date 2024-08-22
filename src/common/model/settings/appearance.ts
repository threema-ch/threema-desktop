import {InactiveContactsPolicy, TimeFormat} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {ServicesForModel} from '~/common/model/types/common';
import type {
    AppearanceSettingsUpdate,
    AppearanceSettings,
    AppearanceSettingsView,
    AppearanceSettingsViewNonDerivedProperties,
    AppearanceSettingsController,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER} from '~/common/utils/endpoint';

export class AppearanceSettingsModelController implements AppearanceSettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly lifetimeGuard = new ModelLifetimeGuard<AppearanceSettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    public async update(change: AppearanceSettingsUpdate): Promise<void> {
        this.lifetimeGuard.update((view) => {
            const updatedView: AppearanceSettingsViewNonDerivedProperties = {...view, ...change};
            this._services.db.setSettings('appearance', updatedView);
            return addDerivedData(updatedView);
        });
    }
}

/**
 * Add derived properties to the specified view.
 */
function addDerivedData(view: AppearanceSettingsViewNonDerivedProperties): AppearanceSettingsView {
    const augmentedView: AppearanceSettingsView = {
        ...view,
        use24hTime: view.timeFormat === TimeFormat.TIME_24H,
    };
    return augmentedView;
}

const DEFAULT_TIME_FORMAT = TimeFormat.TIME_24H;
const DEFAULT_INACTIVE_CONTACT_POLICY = InactiveContactsPolicy.SHOW;

export class AppearanceSettingsModelStore extends ModelStore<AppearanceSettings> {
    public constructor(services: ServicesForModel) {
        const {logging} = services;
        const tag = 'settings.appearance';

        const appearanceSettings = services.db.getSettings('appearance') ?? {
            timeFormat: DEFAULT_TIME_FORMAT,
        };

        super(
            addDerivedData({
                ...appearanceSettings,
                timeFormat: appearanceSettings.timeFormat ?? DEFAULT_TIME_FORMAT,
                inactiveContactsPolicy:
                    appearanceSettings.inactiveContactsPolicy ?? DEFAULT_INACTIVE_CONTACT_POLICY,
            }),
            new AppearanceSettingsModelController(services),
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
