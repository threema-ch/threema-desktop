import type {Router} from '~/app/routing/router';
import {routeToSettings} from '~/app/ui/components/partials/main-nav-bar/helpers';
import type {I18nType} from '~/app/ui/i18n-types';
import type {ContextMenuItem} from '~/app/ui/utils/context-menu/types';

export function provideContextMenuEntries(
    router: Router,
    i18n: I18nType,
): Readonly<ContextMenuItem[]> {
    const settingItem: ContextMenuItem = {
        icon: {
            label: 'settings',
            color: 'defautlt',
        },
        label: i18n.t('settings.label--title', 'Settings'),
        handler: () => routeToSettings(router),
    };
    return [settingItem];
}
