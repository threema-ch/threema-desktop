import type {ServicesForModel} from '~/common/model';
import type {
    MediaSettings,
    MediaSettingsController,
    MediaSettingsUpdate,
    MediaSettingsView,
} from '~/common/model/types/settings';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {RESTRICTED_DOWNLOAD_SIZE_IN_MB} from '~/common/settings/media';
import type {u53} from '~/common/types';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

/**
 * Whether or not to automatically download file and media content for incoming messages.
 *
 * If `limitInMb` is >0, then only files up to that limit (in megabytes) will be downloaded.
 */
export type AutoDownload =
    | {
          readonly on: false;
      }
    | {
          readonly on: true;
          readonly limitInMb: u53;
      };

export class MediaSettingsModelController implements MediaSettingsController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<MediaSettingsView>();

    public constructor(private readonly _services: ServicesForModel) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    public async update(change: MediaSettingsUpdate): Promise<void> {
        this.meta.update((view) =>
            this._services.db.setSettings('media', {
                ...view,
                ...change,
            }),
        );
    }
}

const DEFAULT_AUTO_DOWNLOAD: AutoDownload = {on: true, limitInMb: RESTRICTED_DOWNLOAD_SIZE_IN_MB};

export class MediaSettingsModelStore extends LocalModelStore<MediaSettings> {
    public constructor(services: ServicesForModel) {
        const {logging} = services;
        const tag = 'settings.media';
        const mediaSettings = services.db.getSettings('media') ?? {
            autoDownload: DEFAULT_AUTO_DOWNLOAD,
        };
        super(mediaSettings, new MediaSettingsModelController(services), undefined, undefined, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }
}
