import {type IdentityBytes, type IdentityString} from '~/common/network/types';
import {UTF8} from '~/common/utils/codec';

/**
 * Helper to freely convert between Threema identity string and (ASCII) bytes.
 */
export class Identity {
    private _bytes?: IdentityBytes;

    public constructor(public readonly string: IdentityString) {}

    /**
     * Return the identity as ASCII bytes.
     *
     * The encoded bytes will be memoized.
     */
    public get bytes(): IdentityBytes {
        this._bytes ??= UTF8.encode(this.string) as IdentityBytes;
        return this._bytes;
    }
}
