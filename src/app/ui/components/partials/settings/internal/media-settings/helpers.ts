import type {SettingsDropdown} from '~/app/ui/components/partials/settings/types';
import type {I18nType} from '~/app/ui/i18n-types';
import type {AutoDownload} from '~/common/model/settings/media';
import type {MediaSettingsView} from '~/common/model/types/settings';
import {RESTRICTED_DOWNLOAD_SIZE_IN_MB} from '~/common/settings/media';

export function getAutoDownloadLabel(autoDownload: AutoDownload, i18n: I18nType): string {
    if (!autoDownload.on) {
        return i18n.t('settings--media.label--auto-download-off', 'Never download');
    } else if (autoDownload.limitInMb === 0) {
        return i18n.t('settings--media.label--auto-download-on', 'Always download');
    }
    return i18n.t(
        'settings--media.label--auto-download-on-restricted',
        'Download if smaller than {restrictedSize} MB',
        {restrictedSize: `${autoDownload.limitInMb}`},
    );
}

export function getAutodownloadDropdown(
    i18n: I18nType,
): SettingsDropdown<MediaSettingsView, AutoDownload> {
    return {
        updateKey: 'autoDownload',
        items: [
            {
                text: getAutoDownloadLabel({on: false}, i18n),
                value: {on: false},
            },
            {
                text: getAutoDownloadLabel(
                    {on: true, limitInMb: RESTRICTED_DOWNLOAD_SIZE_IN_MB},
                    i18n,
                ),

                value: {on: true, limitInMb: RESTRICTED_DOWNLOAD_SIZE_IN_MB},
            },

            {
                text: getAutoDownloadLabel({on: true, limitInMb: 0}, i18n),
                value: {on: true, limitInMb: 0},
            },
        ],
    };
}
