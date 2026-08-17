/**
 * Helper functions for valita.
 */

import * as v from '@badrap/valita';
import type {u53} from '@threema/ts-utils/integer/u53';
import {ensureError} from '@threema/ts-utils/meta/ensure-error';
import {nullEmptyStringOptional} from '@threema/ts-utils/null/null-empty-string-optional';
import {nullOptional} from '@threema/ts-utils/null/null-optional';
import {unixTimestampToDateMs} from '@threema/ts-utils/number/unix-timestamp-to-date-ms';
import {unsignedLongAsU64} from '@threema/ts-utils/number/unsigned-long-as-u64';

import * as Unit from '~/common/network/protobuf/validate/common/unit';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';

// Re-exported for convenience, so that the many existing import sites of these generic helpers do
// not need to be rewritten.
// TODO(DESK-2248): Remove re-exports in favor of updating the changed imports
export {instanceOf} from '@threema/ts-utils/meta/instance-of';
export {nullEmptyStringOptional, nullOptional, unsignedLongAsU64};

/**
 * Validate and cast a value with a `ensure`-function which throws an error if the validation fails.
 */
export function validate<TIn, TOut>(
    schema: v.Type<TIn>,
    ensureFunction: (value: TIn) => TOut,
): v.Type<TOut> {
    return schema.chain((inValue) => {
        try {
            return v.ok(ensureFunction(inValue));
        } catch (error) {
            return v.err(ensureError(error));
        }
    });
}

export const VALITA_NULL = Symbol('valita-null');
type ValitaNull = typeof VALITA_NULL;
export const VALITA_UNDEFINED = Symbol('valita-undefined');
type ValitaUndefined = typeof VALITA_UNDEFINED;
export const VALITA_EMPTY_STRING = Symbol('valita-empty-string');
type ValitaEmptyString = typeof VALITA_EMPTY_STRING;

/**
 * Parse a parameter that can be null, undefined, or empty string giving it a concrete type.
 */
export function mappedOptional<T>(
    schema: v.Type<T>,
): v.Type<ValitaNull | ValitaUndefined | ValitaEmptyString | T> {
    return v
        .union(v.null(), v.undefined(), v.literal(''), schema)
        .optional()
        .map((value) => {
            switch (value) {
                case null:
                    return VALITA_NULL;
                case undefined:
                    return VALITA_UNDEFINED;
                case '':
                    return VALITA_EMPTY_STRING;
                default:
                    return value;
            }
        });
}

function mappedEnum<T>(enumUtils: {fromNumber: (value: u53) => T}): v.Type<T> {
    return v.number().map(enumUtils.fromNumber);
}

/**
 * Parse a parameter that can be null, undefined, or empty string giving it a concrete type.
 */
export function optionalEnum<T>(enumUtils: {
    fromNumber: (value: u53) => T;
}): v.Optional<T | undefined> {
    return nullOptional(mappedEnum(enumUtils));
}

/**
 * A value that can be used as a placeholder for a "default value" (as opposed to a value that is
 * not set at all).
 *
 * For example, when receiving a contact update, an empty string in the "nickname" field is treated
 * as "no nickname set", while `undefined` is treated as "nickname not changed". If both would get
 * mapped to `undefined`, then we could not differentiate the two. By mapping the empty string to
 * `VALITA_DEFAULT`, we can distinguish between these two cases.
 *
 * Note: This is especially useful in combination with {@link filterUndefinedProperties} followed by
 *       {@link mapValitaDefaultsToUndefined}.
 */
export const VALITA_DEFAULT = Symbol('valita-default');
export type ValitaDefault = typeof VALITA_DEFAULT;

/**
 * Parse a parameter that represents a simple policy override.
 */
export function policyOverrideOrValitaDefault<TEnum>(enumUtils: {
    fromNumber: (value: u53) => TEnum;
}): v.Type<TEnum | ValitaDefault> {
    return customPolicyOverrideOrValitaDefault(v.number().map(enumUtils.fromNumber));
}

/**
 * Parse a parameter that represents a policy override with an optional expiration date.
 */
export function policyOverrideWithOptionalExpirationDateOrValitaDefault<TEnum>(enumUtils: {
    fromNumber: (value: u53) => TEnum;
}): v.Type<{policy: TEnum; expiresAt?: Date} | ValitaDefault> {
    return customPolicyOverrideOrValitaDefault(
        v
            .object({
                policy: v.number().map(enumUtils.fromNumber),
                expiresAt: nullOptional(unsignedLongAsU64().map(unixTimestampToDateMs)),
            })
            .rest(v.unknown()),
    );
}

/**
 * Parse a parameter that represents a custom policy override.
 */
function customPolicyOverrideOrValitaDefault<T>(schema: v.Type<T>): v.Type<T | ValitaDefault> {
    return v
        .union(
            v
                .object({
                    default: Unit.SCHEMA,
                    policy: NULL_OR_UNDEFINED_SCHEMA,
                })
                .rest(v.unknown()),
            v
                .object({
                    default: NULL_OR_UNDEFINED_SCHEMA,
                    policy: schema,
                })
                .rest(v.unknown()),
        )
        .map((value) => {
            if (value.policy !== undefined) {
                return value.policy;
            }
            return VALITA_DEFAULT;
        });
}

/**
 * Map all properties from an object whose value is {@link VALITA_DEFAULT} to undefined.
 */
export function mapValitaDefaultsToUndefined<
    const TObjectIn extends object,
    TObjectOut extends {
        [K in keyof TObjectIn]: Extract<TObjectIn[K], ValitaDefault> extends never
            ? TObjectIn[K]
            : Exclude<TObjectIn[K], ValitaDefault> | undefined;
    },
>(object: TObjectIn): TObjectOut {
    return Object.fromEntries(
        Object.entries(object).map(([key, value]) => [
            key,
            value === VALITA_DEFAULT ? undefined : value,
        ]),
    ) as TObjectOut;
}

/**
 * Adapter to use a type validation function (ensureXxx) in a Valita chain.
 */
export function chainAdapter<T>(ensureT: (val: unknown) => T): (val: unknown) => v.ValitaResult<T> {
    return (value: unknown) => {
        try {
            return v.ok(ensureT(value));
        } catch (error) {
            return v.err(`Type guard failed: ${error}`);
        }
    };
}
