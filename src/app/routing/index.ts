import type {AnyRouteInstance, RouteInstances} from '~/app/routing/routes';

export function assertRoute<
    TPanelType extends keyof RouteInstances,
    TRouteId extends keyof RouteInstances[TPanelType],
>(
    panelType: TPanelType,
    route: AnyRouteInstance[TPanelType],
    ids: (TRouteId | undefined)[],
): RouteInstances[TPanelType][TRouteId] {
    if (!(ids as readonly (string | undefined)[]).includes(route?.id)) {
        throw new Error(`Unexpected ${panelType} route id '${route?.id}'`);
    }
    return route as unknown as RouteInstances[TPanelType][TRouteId];
}
