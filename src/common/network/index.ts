import {CloseCode} from '~/common/enum';
import {type u16} from '~/common/types';
export {CloseCode};

export interface CloseInfo {
    /**
     * The close code used to close the connection.
     */
    code: u16 | CloseCode;

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
