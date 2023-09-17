import {CloseCode} from '~/common/enum';
import type {u16} from '~/common/types';

export {CloseCode};

export interface CloseInfo {
    /**
     * The close code used to close the connection.
     *
     * Note: Usually expected to contain one of the {@link CloseCode}s.
     */
    code: u16;

    /**
     * Optional connection reason string. Only used for documentation reasons.
     */
    reason?: string;

    /**
     * A boolean if the connection closing was explicitly initiated by the client or the server
     * (e.g. when closing the connection due to a protocol version mismatch). May be undefined if it
     * is unclear who initiated the closing (e.g. network failure).
     */
    clientInitiated: boolean | undefined;
}
