import {InactiveContactsPolicy, TimeFormat} from '~/common/enum';
import type {ServicesForModel} from '~/common/model/types/common';
import type {
    AppearanceSettingsUpdate,
    AppearanceSettings,
    AppearanceSettingsView,
    AppearanceSettingsViewNonDerivedProperties,
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
        this.meta.update((view) => {
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
        use12hTime: view.timeFormat === TimeFormat.DONT_USE_24HOUR_TIME,
    };
    return augmentedView;
}

const DEFAULT_TIME_FORMAT = TimeFormat.USE_24HOUR_TIME;
const DEFAULT_INACTIVE_CONTACT_POLICY = InactiveContactsPolicy.SHOW;

export class AppearanceSettingsModelStore extends LocalModelStore<AppearanceSettings> {
    public constructor(services: ServicesForModel) {
        const {logging} = services;
        const tag = 'appearance-settings';

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
