import type {Router} from '~/app/routing/router';
import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import {DEFAULT_CATEGORY} from '~/common/settings';

export function routeToSettings(router: Router): void {
    router.go(
        ROUTE_DEFINITIONS.nav.settingsList.withoutParams(),
        ROUTE_DEFINITIONS.main.settings.withTypedParams({category: DEFAULT_CATEGORY}),
        undefined,
    );
}
