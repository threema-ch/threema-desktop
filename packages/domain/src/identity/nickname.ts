import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

/**
 * The nickname of a user, guaranteed to be non-empty.
 */
export type Nickname = WeakOpaque<string, {readonly Nickname: unique symbol}>;

/**
 * Type guard for {@link Nickname}.
 */
export function isNickname(nickname: unknown): nickname is Nickname {
    return typeof nickname === 'string' && nickname.length > 0;
}

/**
 * Ensure input is a valid {@link Nickname}.
 */
export function ensureNickname(nickname: string): Nickname {
    if (!isNickname(nickname)) {
        throw new Error(`Not a valid nickname: '${nickname}'`);
    }
    return nickname;
}
