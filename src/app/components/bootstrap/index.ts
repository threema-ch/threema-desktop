import {type WeakOpaque} from '~/common/types';

/**
 * The client's linking code as a string.
 *
 * See {@link LINKING_CODE_RE} for its pattern.
 *
 */
export type LinkingCode = WeakOpaque<string, {readonly LinkingCode: unique symbol}>;

/**
 * Regular expression for {@link LinkingCode}.
 */
const LINKING_CODE_RE = /^[A-Z0-9]{16}$/u;

/**
 * Type guard for {@link LinkingCode}.
 */
export function isLinkingCode(linkingCode: unknown): linkingCode is LinkingCode {
    return typeof linkingCode === 'string' && LINKING_CODE_RE.test(linkingCode);
}

/**
 * Ensure input is a valid {@link LinkingCode}.
 */
export function ensureLinkingCode(linkingCode: unknown): LinkingCode {
    if (!isLinkingCode(linkingCode)) {
        throw new Error(`Not a valid Threema Linking Code: ${linkingCode}`);
    }
    return linkingCode;
}
