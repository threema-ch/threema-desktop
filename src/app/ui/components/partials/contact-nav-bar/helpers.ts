import type {Router} from '~/app/routing/router';
import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
import type {I18nType} from '~/app/ui/i18n-types';
import type {DisplayMode} from '~/common/dom/ui/layout';
import {DEFAULT_CATEGORY} from '~/common/settings';

export function routeToSettings(router: Router, display?: DisplayMode): void {
    if (display === 'small') {
        router.replaceNav(ROUTE_DEFINITIONS.nav.settingsList.withoutParams());
        return;
    }
    router.go(
        ROUTE_DEFINITIONS.nav.settingsList.withoutParams(),
        ROUTE_DEFINITIONS.main.settings.withTypedParams({category: DEFAULT_CATEGORY}),
        undefined,
    );
}

export function provideContextMenuEntries(
    router: Router,
    i18n: I18nType,
    display: DisplayMode,
): Readonly<ContextMenuItem[]> {
    const settingItem: ContextMenuItem = {
        icon: {
            name: 'settings',
            color: 'default',
        },
        label: i18n.t('settings.label--title', 'Settings'),
        handler: () => routeToSettings(router, display),
    };

    return [settingItem];
}