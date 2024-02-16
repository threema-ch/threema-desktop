import {CloseCode} from '~/common/enum';
import type {u16} from '~/common/types';

export {CloseCode};

export interface CloseInfo {
    /**
     * The close code used to close the connection.
     *
     * Note: Usually expected to contain one of the {@link CloseCode}s.
     */
    readonly code: u16;

    /**
     * Optional connection reason string. Only used for documentation reasons.
     */
    readonly reason?: string;

    /**
     * Whether closing the connection was initiated locally or remotely (e.g. when closing the
     * connection due to a protocol version mismatch). May be unknown if it is unclear who initiated
     * the closing (e.g. network failure).
     */
    readonly origin: 'local' | 'remote' | 'unknown';
}
