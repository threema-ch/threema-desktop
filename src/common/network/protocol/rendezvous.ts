import {RendezvousCloseCode} from '~/common/enum';
import type {u16} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

const RENDEZVOUS_CLOSE_CAUSES = [
    'unknown',
    'closed',
    'timeout',
    'protocol-error',
    'complete',
] as const;

/**
 * A rendezvous connection close cause.
 *
 * - unknown: The connection was closed with an unknown reason.
 * - closed: The rendezvous connection stream was closed before the ULP was complete.
 * - timeout: The connection was closed due to a timeout.
 * - protocol-error: The connection was closed due to a Rendezvous/ULP protocol error.
 * - complete: The connection was closed because the ULP has completed successfully.
 * */
export type RendezvousCloseCause = (typeof RENDEZVOUS_CLOSE_CAUSES)[number];

export function isRendezvousCloseCause(value: unknown): value is RendezvousCloseCause {
    return (
        typeof value === 'string' && (RENDEZVOUS_CLOSE_CAUSES as readonly string[]).includes(value)
    );
}

/**
 * Return WebSocket close info for the specified close cause.
 */
export function closeCauseToCloseInfo(cause: RendezvousCloseCause): {
    readonly code: u16;
    readonly reason?: string;
} {
    let code;
    let reason;
    switch (cause) {
        case 'unknown':
            code = RendezvousCloseCode.NORMAL;
            reason = 'Unknown close reason';
            break;
        case 'closed':
            code = RendezvousCloseCode.NORMAL;
            reason = 'Connection stream was closed before the ULP was complete';
            break;
        case 'timeout':
            // Should not be caused by the client, only by the server
            code = RendezvousCloseCode.RENDEZVOUS_PROTOCOL_ERROR;
            break;
        case 'protocol-error':
            code = RendezvousCloseCode.ULP_ERROR;
            reason = 'Protocol error';
            break;
        case 'complete':
            code = RendezvousCloseCode.NORMAL;
            reason = 'Device join completed';
            break;
        default:
            unreachable(cause);
    }
    return {code, reason};
}
