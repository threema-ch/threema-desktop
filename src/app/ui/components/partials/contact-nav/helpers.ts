import type {Router} from '~/app/routing/router';
import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import type {DisplayMode} from '~/common/dom/ui/layout';
import {DEFAULT_CATEGORY} from '~/common/settings';

export function goToSettings(router: Router, display?: DisplayMode): void {
    router.go(
        ROUTE_DEFINITIONS.nav.settingsList.withoutParams(),
        // Note: When opening settings in small display mode, we want to see the settings
        //       categories, not the profile settings.
        display === 'small'
            ? ROUTE_DEFINITIONS.main.welcome.withoutParams()
            : ROUTE_DEFINITIONS.main.settings.withTypedParams({category: DEFAULT_CATEGORY}),
        undefined,
    );
}
