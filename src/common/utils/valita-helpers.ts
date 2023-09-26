/**
 * Helper functions for valita.
 */

import * as v from '@badrap/valita';
import Long from 'long';

import * as Unit from '~/common/network/protobuf/validate/common/unit';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import type {u53, u64} from '~/common/types';
import {ensureError} from '~/common/utils/assert';
import {intoU64, unixTimestampToDateMs} from '~/common/utils/number';

/**
 * Ensure that a value is an instance of a certain type.
 *
 * Note: May not be used with `Long`! To check if a value is a `Long`, use {@link Long.isLong}. In
 * the context of Valita, use {@link unsignedLongAsU64}.
 *
 * Example:
 *
 *     const t = v.object({
 *       fourBytes: instanceOf(Uint8Array).assert((a) => a.length === 4),
 *       timestamp: instanceOf(Date),
 *       etcetera: instanceOf(Worker),
 *     });
 */
export function instanceOf<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: abstract new (...args: any) => T,
): T extends Long ? never : v.Type<T> {
    return v
        .unknown()
        .assert<T>(
            (value) => value instanceof t,
            `expected an instance of ${t.name !== '' ? t.name : 'an anonymous type'}`,
        ) as T extends Long ? never : v.Type<T>;
}

/**
 * Expect a `Long` value (validated through `Long.isLong`), then convert it into an u64.
 */
export function unsignedLongAsU64(): v.Type<u64> {
    return v
        .unknown()
        .chain((value: unknown) => {
            if (Long.isLong(value)) {
                // When Protobuf falls back to the default value of 0, this is a signed `Long`
                // value. Convert to unsigned.
                if (value.isZero()) {
                    return v.ok(Long.UZERO);
                }

                return v.ok(value);
            }
            return v.err(
                `Expected a Long value, but "Long.isLong" returns false for value "${value}" with type "${typeof value}"`,
            );
        })
        .map(intoU64);
}

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

/**
 * Parse an optional parameter which also treats null as non-existent.
 */
export function nullOptional<T>(schema: v.Type<T>): v.Optional<T | undefined> {
    return (
        schema
            .nullable()
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            .map((value) => (value === null ? undefined : value))
            .optional()
    );
}

/**
 * Parse an optional parameter which also treats null and empty string as non-existent.
 */
export function nullEmptyStringOptional<T>(schema: v.Type<T>): v.Optional<T | undefined> {
    return v
        .union(v.null(), v.literal(''), schema)
        .map((value) => (value === null || value === '' ? undefined : value))
        .optional();
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
