import type {GroupCallId} from '~/common/network/protocol/call/group-call';
import type {WeakOpaque, ReadonlyUint8Array} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';
import type {RemoteAbortListener} from '~/common/utils/signal';
import type {AnyGroupCallContextAbort, GroupCallContext} from '~/common/webrtc/group-call';

// From grammar for SDP 'token':
// https://www.rfc-editor.org/rfc/rfc4566#section-9
// prettier-ignore
export const SDP_TOKEN_RANGE = [
    '!', '#', '$', '%', '&', "'", '*', '+', '-', '.',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z', '^', '_', '`', 'a',
    'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k',
    'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u',
    'v', 'w', 'x', 'y', 'z', '{', '|', '}', '~'
] as const;

/** An ICE username fragment must be at least 4 characters. */
export type IceUsernameFragment = WeakOpaque<string, {readonly IceUsernameFragment: unique symbol}>;
export function isIceUsernameFragment(value: string): value is IceUsernameFragment {
    return value.length >= 4;
}
export function ensureIceUsernameFragment(value: string): IceUsernameFragment {
    if (!isIceUsernameFragment(value)) {
        throw Error(`Not a valid ICE username fragment: '${value}'`);
    }
    return value;
}

/** An ICE password must be at least 22 characters. */
export type IcePassword = WeakOpaque<string, {readonly IcePassword: unique symbol}>;
export function isIcePassword(value: string): value is IcePassword {
    return value.length >= 22;
}
export function ensureIcePassword(value: string): IcePassword {
    if (!isIcePassword(value)) {
        throw Error(`Not a valid ICE password: '${value}'`);
    }
    return value;
}

/** We're exclusively using SHA-256 for DTLS fingerprints. */
export type DtlsFingerprint = WeakOpaque<
    ReadonlyUint8Array,
    {readonly DtlsFingerprint: unique symbol}
>;
export function isDtlsFingerprint(array: ReadonlyUint8Array): array is DtlsFingerprint {
    return array.byteLength === 32 && !array.every((byte) => byte === 0);
}
export function ensureDtlsFingerprint(array: Uint8Array): DtlsFingerprint {
    if (!isDtlsFingerprint(array)) {
        throw Error('Not a valid DTLS fingerprint');
    }
    return array;
}

export interface WebRtcService extends ProxyMarked {
    /**
     * Create a {@link GroupCallContext} for a {@link callId}.
     *
     * @param remoteAbort signal that removes the context when raised.
     * @param callId Group Call ID used as a lookup value for the context via
     *   {@link getGroupCallContextHandle}.
     * */
    readonly createGroupCallContext: (
        remoteAbort: RemoteAbortListener<AnyGroupCallContextAbort>,
        callId: GroupCallId,
    ) => GroupCallContext;
}
