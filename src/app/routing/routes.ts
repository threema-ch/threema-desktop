import * as v from '@badrap/valita';

import type {DbReceiverLookup} from '~/common/db';
import {ReceiverType, ReceiverTypeUtils} from '~/common/enum';
import type {Logger} from '~/common/logging';
import {VALID_IDENTITY_DATA_SCHEMA} from '~/common/network/protocol/directory';
import {ensureIdentityString, ensureMessageId} from '~/common/network/types';
import {ensureSettingsCategory} from '~/common/settings';
import {
    ensureU64,
    type ReadonlyUint8Array,
    type u53,
    type u64,
    type WeakOpaque,
} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {instanceOf} from '~/common/utils/valita-helpers';

/**
 * Information needed to look up a receiver.
 *
 * Note: Keep this compatible with {@link DbReceiverLookup}.
 */
const PARAM_RECEIVER_LOOKUP_SCHEMA = v
    .object({
        type: v.number().map((value) => ReceiverTypeUtils.fromNumber(value)),
        uid: v.bigint().map(ensureU64),
    })
    .map((value) => value as DbReceiverLookup);

/**
 * Information needed to look up a contact.
 *
 * Note: Keep this compatible with {@link DbContactReceiverLookup}.
 */
const PARAM_CONTACT_LOOKUP_SCHEMA = PARAM_RECEIVER_LOOKUP_SCHEMA.assert(
    (lookup) => lookup.type === ReceiverType.CONTACT,
);

/**
 * Information needed to look up a group.
 *
 * Note: Keep this compatible with {@link DbGroupReceiverLookup}.
 */
const PARAM_GROUP_LOOKUP_SCHEMA = PARAM_RECEIVER_LOOKUP_SCHEMA.assert(
    (lookup) => lookup.type === ReceiverType.GROUP,
);

/**
 * Information needed to look up a conversation, together with additional data that will be used by
 * the conversation view.
 */
const PARAM_CONVERSATION_LOOKUP_SCHEMA = v.object({
    receiverLookup: PARAM_RECEIVER_LOOKUP_SCHEMA,
    forwardedMessage: v
        .object({
            receiverLookup: v
                .object({
                    type: v.number().map((value) => ReceiverTypeUtils.fromNumber(value)),
                    uid: v.bigint().map(ensureU64),
                })
                .map((value) => value as DbReceiverLookup),
            messageId: v.number().map(ensureMessageId),
        })
        .optional(),
    preloadedFiles: v
        .array(
            v.object({
                bytes: instanceOf<ReadonlyUint8Array>(Uint8Array),
                fileName: v.string(),
                mediaType: v.string(),
            }),
        )
        .optional(),
    initialMessage: v
        .object({
            messageId: v.number().map(ensureMessageId),
        })
        .optional(),
});

const PARAM_SETTINGS_SCHEMA = v.object({
    category: v.string().map(ensureSettingsCategory),
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
 * Group call activity data.
 */
const PARAM_CALL_ACTIVITY_SCHEMA = v.union(
    v.object({
        receiverLookup: PARAM_GROUP_LOOKUP_SCHEMA,
        intent: v.union(v.literal('join'), v.literal('join-or-create')),
    }),
);

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
    readonly params: v.Type | undefined;
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
} & (TRoute['params'] extends undefined
        ? {
              /**
               * Function that returns a route instance that does not have params.
               */
              readonly withoutParams: () => RouteInstance<TRoute>;
          }
        : {
              /**
               * Function that returns a route instance with the specified params.
               *
               * If a route has no parameters, this should be called with `undefined` as
               * argument.
               */
              readonly withParams: (
                  params: RouteInstanceParams<TRoute['params']>,
              ) => RouteInstance<TRoute>;
          });

/**
 * Map parameter schemas to their resulting type (if any).
 */
type RouteInstanceParams<TParams> =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TParams extends v.Type<any> ? v.Infer<TParams> : undefined;

/**
 * A route whose parameters have been validated using the corresponding schema.
 *
 * The type is wrapped in a `WeakOpaque` so that a `RouteDefinition` cannot accidentally be used in
 * place of a `RouteInstance`.
 *
 * Note: A route instance should usually be constructed either through
 * {@link RouteDefinition.matches} or {@link RouteDefinition.withParams}.
 */
export type RouteInstance<TRoute extends RawRouteDefinition> = WeakOpaque<
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
 * {@link defineAside}!
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
                } catch (error) {
                    // Validation failed, reject this route
                    log.warn(`Route matched, but validation failed: ${error}`);
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

    function withParams(params: RouteInstanceParams<TRoute['params']>): RouteInstance<TRoute> {
        // Since the params are already correctly typed, we can use them without validation
        return {
            id: route.id,
            params,
        } as RouteInstance<TRoute>;
    }

    function withoutParams(): RouteInstance<TRoute> {
        return {
            id: route.id,
            params: undefined,
        } as RouteInstance<TRoute>;
    }

    return {...route, matches, withParams, withoutParams};
}

function defineNav<const TRoute extends RawRouteDefinition>(
    route: TRoute,
): RouteDefinition<TRoute> {
    return defineImplementation(route);
}

function defineMain<const TRoute extends RawRouteDefinition & RoutePathDefinition>(
    route: TRoute,
): RouteDefinition<TRoute> {
    return defineImplementation(route);
}

function defineAside<const TRoute extends RawRouteDefinition>(
    route: TRoute,
): RouteDefinition<TRoute> {
    return defineImplementation(route);
}

function defineModal<const TRoute extends RawRouteDefinition>(
    route: TRoute,
): RouteDefinition<TRoute> {
    return defineImplementation(route);
}

function defineActivity<const TRoute extends RawRouteDefinition>(
    route: TRoute,
): RouteDefinition<TRoute> {
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
    } catch (error) {
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
        }),
        receiverList: defineNav({
            id: 'receiverList',
            params: undefined,
        }),
        contactAdd: defineNav({
            id: 'contactAdd',
            params: PARAM_OPTIONAL_IDENTITY_SCHEMA,
        }),
        contactAddDetails: defineNav({
            id: 'contactAddDetails',
            params: PARAM_IDENTITY_DATA_SCHEMA,
        }),
        settingsList: defineNav({
            id: 'settingsList',
            params: undefined,
        }),
    },
    main: {
        welcome: defineMain({
            id: 'welcome',
            params: undefined,
            path: {
                match: new RegExp('^/$', 'u'),
                template: '/',
            },
        }),
        conversation: defineMain({
            id: 'conversation',
            params: PARAM_CONVERSATION_LOOKUP_SCHEMA,
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
        }),

        settings: defineMain({
            id: 'settings',
            params: PARAM_SETTINGS_SCHEMA,
            path: {
                match: new RegExp('^/settings/(?<category>[a-z]+)/$', 'u'),
                template: '/settings/:category',
            },
        }),
    },
    aside: {
        contactDetails: defineAside({
            id: 'contactDetails',
            params: PARAM_CONTACT_LOOKUP_SCHEMA,
        }),
        groupDetails: defineAside({
            id: 'groupDetails',
            params: PARAM_GROUP_LOOKUP_SCHEMA,
        }),
    },
    modal: {
        changePassword: defineModal({
            id: 'changePassword',
            params: undefined,
        }),
    },
    activity: {
        call: defineActivity({
            id: 'call',
            params: PARAM_CALL_ACTIVITY_SCHEMA,
        }),
    },
};
/* eslint-enable prefer-regex-literals */

/** Get a route instance for a specific panel and ID. */
export type RouteInstanceFor<
    TPanel extends keyof typeof ROUTE_DEFINITIONS,
    TId extends keyof (typeof ROUTE_DEFINITIONS)[TPanel],
> = (typeof ROUTE_DEFINITIONS)[TPanel][TId] extends RawRouteDefinition
    ? RouteInstance<(typeof ROUTE_DEFINITIONS)[TPanel][TId]>
    : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteInstancesFor<TDefinitions extends Record<string, RouteDefinition<any>>> = {
    [TKey in keyof TDefinitions]: RouteInstance<TDefinitions[TKey]>;
}[keyof TDefinitions];

/** Map of all possible route instances (derived from route definitions). */
export type RouteInstances = {
    [TPanel in keyof typeof ROUTE_DEFINITIONS]: RouteInstancesFor<
        (typeof ROUTE_DEFINITIONS)[TPanel]
    >;
};
