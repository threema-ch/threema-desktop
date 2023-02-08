import * as v from '@badrap/valita';

import {type DbContactUid, type DbGroupUid, type DbReceiverLookup} from '~/common/db';
import {ReceiverTypeUtils} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {VALID_IDENTITY_DATA_SCHEMA} from '~/common/network/protocol/directory';
import {ensureIdentityString, ensureMessageId} from '~/common/network/types';
import {ensureU64, type u53, type u64, type WeakOpaque} from '~/common/types';
import {assert} from '~/common/utils/assert';

/**
 * Information needed to look up a generic receiver, together with additional data that will be used
 * by the conversation view.
 */
const PARAM_RECEIVER_LOOKUP_SCHEMA = v.object({
    receiverLookup: v
        .object({
            type: v.number().map(ReceiverTypeUtils.fromNumber),
            uid: v.bigint().map(ensureU64),
        })
        .map((value) => value as DbReceiverLookup),
    forwardedMessage: v
        .object({
            receiverLookup: v
                .object({
                    type: v.number().map(ReceiverTypeUtils.fromNumber),
                    uid: v.bigint().map(ensureU64),
                })
                .map((value) => value as DbReceiverLookup),
            messageId: v.number().map(ensureMessageId),
        })
        .optional(),
});

/**
 * Information needed to look up a contact.
 */
const PARAM_CONTACT_LOOKUP_SCHEMA = v.object({
    contactUid: v
        .bigint()
        .map(ensureU64)
        .map((value) => value as DbContactUid),
});

/**
 * Information needed to look up a group.
 */
const PARAM_GROUP_LOOKUP_SCHEMA = v.object({
    groupUid: v
        .bigint()
        .map(ensureU64)
        .map((value) => value as DbGroupUid),
});

/**
 * An optional contact identity.
 */
const PARAM_OPTIONAL_IDENTITY_SCHEMA = v.object({
    identity: v.string().map(ensureIdentityString).optional(),
});

/**
 * Identity data.
 */
const PARAM_IDENTITY_DATA_SCHEMA = v.object({
    identityData: VALID_IDENTITY_DATA_SCHEMA,
});

/**
 * Path definition.
 */
interface RoutePath {
    /**
     * This regular expression is used to match an URL fragment path against this route.
     *
     * The capture group names should match the parameter names of the route.
     *
     * Example: ^/conversation/(?<receiverType>[^/]+)/(?<conversationUid>[^/]+)/$',
     */
    readonly match: RegExp;
    /**
     * This template is used to generate an URL fragment path for this route.
     *
     * The path should start with a slash. A parameter segment starts with `:`. The parameter
     * segment names should match the parameter names of the route.
     *
     * Example: /conversation/:receiverType/:conversationUid/
     */
    readonly template: string;
    /**
     * An optional function to transform the captured groups by `match` into an object that can be
     * validated by the valita schema.
     */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    readonly transform?: (captureGroups: Record<string, string>) => Record<string, any>;
    /* eslint-enable @typescript-eslint/no-explicit-any */
}

/**
 * Raw route definition.
 */
interface RawRouteDefinition {
    readonly id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly params: v.ObjectType<any> | undefined;
}

interface RoutePathDefinition {
    // Note: Only main panel routes should have a path
    readonly path: RoutePath;
}

/**
 * Parsed route definition for a {@link RawRouteDefinition}.
 */
type RouteDefinition<TRoute extends RawRouteDefinition & Partial<RoutePathDefinition>> = TRoute & {
    /**
     * Function that matches a path against a route definition, and – if the
     * route matches – returns a route instance.
     */
    readonly matches: (path: string, log: Logger) => RouteInstance<TRoute> | undefined;

    /**
     * Function that validates a set of parameters against a parameter schema,
     * and – if it passes – returns a route instance.
     *
     * If a route has no parameters, this should be called with `undefined` as
     * argument.
     */
    readonly withUntypedParams: (params?: Record<string, unknown>) => RouteInstance<TRoute>;

    /**
     * Function that returns a route instance with the specified params.
     *
     * If a route has no parameters, this should be called with `undefined` as
     * argument.
     */
    readonly withTypedParams: (
        params: RouteInstanceParams<TRoute['params']>,
    ) => RouteInstance<TRoute>;
};

/**
 * Map parameter schemas to their resulting type (if any).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteInstanceParams<TParams> = TParams extends v.ObjectType<any>
    ? v.Infer<TParams>
    : undefined;

/**
 * A route whose parameters have been validated using the corresponding schema.
 *
 * The type is wrapped in a `WeakOpaque` so that a `RouteDefinition` cannot accidentally be used in
 * place of a `RouteInstance`.
 *
 * Note: A route instance should usually be constructed either through
 *       {@link RouteDefinition.matches}, {@link RouteDefinition.withUntypedParams} or
 *       {@link RouteDefinition.withTypedParams}.
 */
type RouteInstance<TRoute extends RawRouteDefinition> = WeakOpaque<
    Pick<TRoute, 'id'> & {
        /**
         * Validated route parameters.
         */
        readonly params: RouteInstanceParams<TRoute['params']>;
    },
    {readonly RouteInstance: unique symbol}
>;

/**
 * Function used to define new routes.
 *
 * The function will generate a matcher for the {@link RawRouteDefinition} and return a
 * {@link RouteDefinition}.
 *
 * Note: Do not use this function directly! Instead, use {@link defineNav}, {@link defineMain} or
 *       {@link defineAside}!
 */
function defineImplementation<TRoute extends RawRouteDefinition & Partial<RoutePathDefinition>>(
    route: TRoute,
): RouteDefinition<TRoute> {
    let matches: (path: string, log: Logger) => RouteInstance<TRoute> | undefined;
    if (route.path === undefined) {
        matches = (): undefined => undefined;
    } else {
        matches = (path, log): RouteInstance<TRoute> | undefined => {
            assert(route.path !== undefined);

            // Match regex against provided path
            const match = path.match(route.path.match);
            if (match === null) {
                return undefined;
            }

            // A match was found. Validate capture groups against schema.
            let params = undefined;
            if (route.params !== undefined) {
                const groups = match.groups ?? {};
                const transformedGroups =
                    route.path.transform !== undefined ? route.path.transform(groups) : groups;
                try {
                    params = route.params.parse(transformedGroups);
                } catch (e) {
                    // Validation failed, reject this route
                    log.warn(`Route matched, but validation failed: ${e}`);
                    log.debug('Transformed groups:', transformedGroups);
                    return undefined;
                }
            }
            return {
                id: route.id,
                params: params as RouteInstanceParams<TRoute['params']>,
            } as RouteInstance<TRoute>;
        };
    }

    function withUntypedParams(params: Record<string, unknown> | undefined): RouteInstance<TRoute> {
        // Handle routes without a parameter schema
        if (route.params === undefined) {
            assert(
                params === undefined,
                `A route without parameters may not be constructed with parameters`,
            );
            return {
                id: route.id,
                params: undefined as RouteInstanceParams<TRoute['params']>,
            } as RouteInstance<TRoute>;
        }

        // Otherwise, the route has parameters. Validate the argument passed in.
        let validatedParams;
        try {
            validatedParams = route.params.parse(params);
        } catch (error) {
            throw new Error(`Cannot validate untyped route params: ${error}`);
        }
        return withTypedParams(validatedParams as RouteInstanceParams<TRoute['params']>);
    }

    function withTypedParams(params: RouteInstanceParams<TRoute['params']>): RouteInstance<TRoute> {
        // Since the params are already correctly typed, we can use them without validation
        return {
            id: route.id,
            params,
        } as RouteInstance<TRoute>;
    }

    return {...route, matches, withUntypedParams, withTypedParams};
}

function defineNav<TRoute extends RawRouteDefinition>(route: TRoute): RouteDefinition<TRoute> {
    return defineImplementation(route);
}

function defineMain<TRoute extends RawRouteDefinition & RoutePathDefinition>(
    route: TRoute,
): RouteDefinition<TRoute> {
    return defineImplementation(route);
}

function defineAside<TRoute extends RawRouteDefinition>(route: TRoute): RouteDefinition<TRoute> {
    return defineImplementation(route);
}

function defineModal<TRoute extends RawRouteDefinition>(route: TRoute): RouteDefinition<TRoute> {
    return defineImplementation(route);
}

/**
 * If `value` is not undefined, apply the `parseInt` function and ensure that the value is not too
 * large to fit in an u53.
 *
 * @returns a u53 (if the value is a valid integer string) or undefined (if the value is undefined,
 *   empty, or not a valid u53).
 */
function parseU53IfDefined(value: string | undefined): u53 | undefined {
    if (value === undefined) {
        return undefined;
    }
    const intValue = parseInt(value, 10);
    if (isNaN(intValue) || intValue < 0 || intValue > Number.MAX_SAFE_INTEGER) {
        return undefined;
    }
    return intValue;
}

/**
 * If `value` is not undefined, apply the `BigInt` constructor function and ensure that the value is
 * not too large to fit in an u64.
 *
 * @returns a u64 (if the value is a valid integer string) or undefined (if the value is undefined,
 *   empty, or not a valid u64).
 */
function parseU64IfDefined(value: string | undefined): u64 | undefined {
    if (value === undefined || value === '') {
        return undefined;
    }
    try {
        const bigintValue = BigInt(value);
        if (bigintValue < 0n || bigintValue >= 2n ** 64n) {
            return undefined;
        }
        return bigintValue;
    } catch (e) {
        return undefined;
    }
}

/**
 * All valid combination of subroutes, including the schema of their params.
 */
/* eslint-disable prefer-regex-literals */
export const ROUTE_DEFINITIONS = {
    nav: {
        conversationList: defineNav({
            id: 'conversationList',
            params: undefined,
        } as const),
        contactList: defineNav({
            id: 'contactList',
            params: undefined,
        } as const),
        contactAdd: defineNav({
            id: 'contactAdd',
            params: PARAM_OPTIONAL_IDENTITY_SCHEMA,
        } as const),
        contactAddDetails: defineNav({
            id: 'contactAddDetails',
            params: PARAM_IDENTITY_DATA_SCHEMA,
        } as const),
    },
    main: {
        welcome: defineMain({
            id: 'welcome',
            params: undefined,
            path: {
                match: new RegExp('^/$', 'u'),
                template: '/',
            },
        } as const),
        profile: defineMain({
            id: 'profile',
            params: undefined,
            path: {
                match: new RegExp('^/profile/$', 'u'),
                template: '/profile/',
            },
        } as const),
        conversation: defineMain({
            id: 'conversation',
            params: PARAM_RECEIVER_LOOKUP_SCHEMA,
            path: {
                match: new RegExp(
                    '^/conversation/(?<receiverType>\\d+)/(?<receiverUid>\\d+)/$',
                    'u',
                ),
                template: '/conversation/:receiverLookup.type/:receiverLookup.uid/',
                transform: (captureGroups: Record<string, string>) => ({
                    receiverLookup: {
                        type: parseU53IfDefined(captureGroups.receiverType),
                        uid: parseU64IfDefined(captureGroups.receiverUid),
                    },
                }),
            },
        } as const),
    },
    aside: {
        contactDetails: defineAside({
            id: 'contactDetails',
            params: PARAM_CONTACT_LOOKUP_SCHEMA,
        } as const),
        groupDetails: defineAside({
            id: 'groupDetails',
            params: PARAM_GROUP_LOOKUP_SCHEMA,
        } as const),
    },
    modal: {
        contactEdit: defineModal({
            id: 'contactEdit',
            params: PARAM_CONTACT_LOOKUP_SCHEMA,
        } as const),
        groupEdit: defineModal({
            id: 'groupEdit',
            params: PARAM_GROUP_LOOKUP_SCHEMA,
        } as const),
    },
} as const;
/* eslint-enable prefer-regex-literals */

/**
 * Map of all possible route instances (derived from route definitions).
 */
export interface RouteInstances {
    nav: {
        [K in keyof typeof ROUTE_DEFINITIONS.nav]: RouteInstance<typeof ROUTE_DEFINITIONS.nav[K]>;
    };
    main: {
        [K in keyof typeof ROUTE_DEFINITIONS.main]: RouteInstance<typeof ROUTE_DEFINITIONS.main[K]>;
    };
    aside: {
        [K in keyof typeof ROUTE_DEFINITIONS.aside]: RouteInstance<
            typeof ROUTE_DEFINITIONS.aside[K]
        >;
    };
    modal: {
        [K in keyof typeof ROUTE_DEFINITIONS.modal]: RouteInstance<
            typeof ROUTE_DEFINITIONS.modal[K]
        >;
    };
}

/**
 * Any possible route instance.
 */
export interface AnyRouteInstance {
    nav: RouteInstances['nav'][keyof typeof ROUTE_DEFINITIONS.nav];
    main: RouteInstances['main'][keyof typeof ROUTE_DEFINITIONS.main];
    aside: RouteInstances['aside'][keyof typeof ROUTE_DEFINITIONS.aside] | undefined;
    modal: RouteInstances['modal'][keyof typeof ROUTE_DEFINITIONS.modal] | undefined;
}

/**
 * Type alias for forwarded message lookup (as part of the {@link PARAM_RECEIVER_LOOKUP_SCHEMA}).
 */
export type ForwardedMessageLookup = Exclude<
    v.Infer<typeof PARAM_RECEIVER_LOOKUP_SCHEMA>['forwardedMessage'],
    undefined
>;
