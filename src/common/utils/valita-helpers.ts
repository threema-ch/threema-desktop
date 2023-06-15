/**
 * Helper functions for valita.
 */

import * as v from '@badrap/valita';
import Long from 'long';

import {type u53, type u64} from '~/common/types';

import {intoU64} from './number';

/**
 * Ensure that a value is an instance of a certain type.
 *
 * Note that the return type can _not_ be chained with `.optional()`!
 *
 * Example:
 *
 *     const t = v.object({
 *       fourBytes: instanceOf(Uint8Array).assert((a) => a.length === 4),
 *       timestamp: instanceOf(Date),
 *       etcetera: instanceOf(Worker),
 *     });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function instanceOf<T>(t: abstract new (...args: any) => T): v.Type<T> {
    return v
        .unknown()
        .assert<T>(
            (value) => value instanceof t,
            `expected an instance of ${t.name !== '' ? t.name : 'an anonymous type'}`,
        );
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
 * Ensure that a value is an instance of a certain type, or undefined.
 *
 * Example:
 *
 *     const t = v.object({
 *       fourBytes: optionalInstanceOf(Uint8Array).assert((a) => a.length === 4),
 *       timestamp: optionalInstanceOf(Date),
 *     });
 */
export function optionalInstanceOf<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: abstract new (...args: any) => T,
): v.Type<T | undefined> {
    return v
        .unknown()
        .assert<T | undefined>(
            (value) => value instanceof t || value === undefined,
            `expected an optional instance of ${t.name !== '' ? t.name : 'an anonymous type'}`,
        );
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
