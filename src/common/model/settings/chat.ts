import {ComposeBarEnterMode} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {ServicesForModel} from '~/common/model/types/common';
import type {
    ChatSettings,
    ChatSettingsController,
    ChatSettingsUpdate,
    ChatSettingsView,
    ChatSettingsViewNonDerivedProperties,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER} from '~/common/utils/endpoint';

export class ChatSettingsModelController implements ChatSettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly lifetimeGuard = new ModelLifetimeGuard<ChatSettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    public update(change: ChatSettingsUpdate): void {
        this.lifetimeGuard.update((view) => {
            const updatedView: ChatSettingsViewNonDerivedProperties = {...view, ...change};
            this._services.db.setSettings('chat', updatedView);
            return addDerivedData(updatedView);
        });
    }
}

/*
 * Add derived properties to the specified view.
 */
function addDerivedData(view: ChatSettingsViewNonDerivedProperties): ChatSettingsView {
    const augmentedView: ChatSettingsView = {
        ...view,
        onEnterSubmit: view.composeBarEnterMode === ComposeBarEnterMode.SUBMIT,
    };
    return augmentedView;
}

const DEFAULT_COMPOSEBAR_ENTER_MODE = ComposeBarEnterMode.SUBMIT;

export class ChatSettingsModelStore extends ModelStore<ChatSettings> {
    public constructor(services: ServicesForModel) {
        const {logging} = services;
        const tag = 'settings.chat';

        const chatSettings = services.db.getSettings('chat') ?? {
            composeBarEnterMode: DEFAULT_COMPOSEBAR_ENTER_MODE,
        };

        super(
            addDerivedData({
                ...chatSettings,
                composeBarEnterMode:
                    chatSettings.composeBarEnterMode ?? DEFAULT_COMPOSEBAR_ENTER_MODE,
            }),
            new ChatSettingsModelController(services),
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
