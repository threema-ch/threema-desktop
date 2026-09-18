import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

/**
 * The client's Threema ID as a string.
 *
 * See {@link IDENTITY_STRING_RE} for its pattern.
 *
 */
export type IdentityString = WeakOpaque<string, {readonly IdentityString: unique symbol}>;

/**
 * Regular expression for {@link IdentityString}.
 *
 * Note: This is not 100% accurate since some characters and numbers are disallowed. But it's
 *       accurate enough for our purposes.
 */
const IDENTITY_STRING_RE = /^[A-Z0-9*]{1}[A-Z0-9]{7}$/u;

/**
 * Type guard for {@link IdentityString}.
 */
export function isIdentityString(identity: unknown): identity is IdentityString {
    return typeof identity === 'string' && IDENTITY_STRING_RE.test(identity);
}

/**
 * Ensure input is a valid {@link IdentityString}.
 */
export function ensureIdentityString(identity: unknown): IdentityString {
    if (!isIdentityString(identity)) {
        throw new Error(`Not a valid Threema ID: ${identity}`);
    }
    return identity;
}
