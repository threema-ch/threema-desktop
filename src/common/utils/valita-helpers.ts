/**
 * Helper functions for valita.
 */

import * as v from '@badrap/valita';
import Long from 'long';

import * as Unit from '~/common/network/protobuf/validate/common/unit';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {type u53, type u64} from '~/common/types';
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
                return v.ok(value);
            }
            return v.err(
                `Expected a Long value, but "Long.isLong" returns false for value "${value}" with type "${typeof value}"`,
            );
        })
        .map(intoU64);
}

/**
 * Parse an optional parameter which also treats null as non-existent.
 */
export function nullOptional<T>(schema: v.Type<T>): v.Optional<T | undefined> {
    return v
        .union(v.null(), schema)
        .map((value) => (value === null ? undefined : value))
        .optional();
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
 * This value indicates that a policy override parameter specifies that the default policy must be
 * used.
 */
export const VALITA_DEFAULT = Symbol('valita-default');
type ValitaDefault = typeof VALITA_DEFAULT;

/**
 * Parse a parameter that represents a string where the empty string represents the default value,
 * not a set value.
 */
export function nonEmptyStringOrDefault<TNonDefault extends string>(): v.Type<
    ValitaDefault | TNonDefault
> {
    return v.string().map((value) => (value === '' ? VALITA_DEFAULT : (value as TNonDefault)));
}

/**
 * Parse a parameter that represents a simple policy override.
 */
export function policyOverrideOrDefault<TEnum>(enumUtils: {
    fromNumber: (value: u53) => TEnum;
}): v.Type<ValitaDefault | TEnum> {
    return customPolicyOverrideOrDefault(v.number().map(enumUtils.fromNumber));
}

/**
 * Parse a parameter that represents a policy override with an optional expiration date.
 */
export function policyOverrideWithOptionalExpirationDateOrDefault<TEnum>(enumUtils: {
    fromNumber: (value: u53) => TEnum;
}): v.Type<ValitaDefault | {policy: TEnum; expiresAt?: Date}> {
    return customPolicyOverrideOrDefault(
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
function customPolicyOverrideOrDefault<T>(schema: v.Type<T>): v.Type<ValitaDefault | T> {
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
 * Set all properties from an object whose value is VALITA_DEFAULT to undefined. In order to
 * properly return the expected types, probably `as const` has to be used in the `object` parameter.
 */
export function setDefaultsToUndefined<
    TObjectIn extends object,
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
