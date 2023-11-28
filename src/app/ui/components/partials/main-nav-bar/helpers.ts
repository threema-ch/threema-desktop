import type {Router} from '~/app/routing/router';
import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import type {DefaultSetting} from '~/common/settings';

const defaultCategory: DefaultSetting = 'profile';

export function routeToSettings(router: Router): void {
    router.go(
        ROUTE_DEFINITIONS.nav.settingsList.withoutParams(),
        ROUTE_DEFINITIONS.main.settings.withTypedParams({category: defaultCategory}),
        undefined,
    );
}
