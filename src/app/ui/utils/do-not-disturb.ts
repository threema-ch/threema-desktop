import type {I18nType} from '~/app/ui/i18n-types';
import type {SystemTimeStore} from '~/app/ui/time';
import {formatDateLocalized} from '~/app/ui/utils/timestamp';
import type {AppearanceSettingsView} from '~/common/model/types/settings';
import {unreachable} from '~/common/utils/assert';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Returns the current notification policy in text form.
 */
export function getDoNotDisturbDuration(
    currentAppearance: AppearanceSettingsView,
    currentI18n: I18nType,
    currentNotificationPolicy: AnyReceiverData['notificationPolicy'],
    currentTime: ReturnType<SystemTimeStore['get']>,
): string {
    switch (currentNotificationPolicy.type) {
        case 'default':
            return currentI18n.t('settings.action--do-not-disturb-default', 'Off');
        case 'mentioned':
        case 'never': {
            let text;
            if (currentNotificationPolicy.expiresAt === undefined) {
                text = currentI18n.t('settings.action--do-not-disturb-indefinite', 'Indefinitely');
            } else if (currentNotificationPolicy.expiresAt > currentTime.current) {
                text = currentI18n.t('settings.action--do-not-disturb-until', 'Until {date}', {
                    date: formatDateLocalized(
                        currentNotificationPolicy.expiresAt,
                        currentI18n,
                        'auto',
                        currentAppearance.use24hTime,
                    ),
                });
            } else {
                return currentI18n.t('settings.action--do-not-disturb-default', 'Off');
            }
            return currentNotificationPolicy.type === 'mentioned'
                ? `${text} ${currentI18n.t('settings.action--do-not-disturb-mentioned', 'Notify When Mentioned')}`
                : text;
        }

        default:
            return unreachable(currentNotificationPolicy);
    }
}
