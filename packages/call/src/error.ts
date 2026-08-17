import type {u53} from '@threema/ts-utils/integer/u53';
import {ensureError} from '@threema/ts-utils/meta/ensure-error';

/**
 * Error types associated to a group call.
 *
 * - invalid-state: The call state machine is in a state that did not allow for the desired action.
 * - directory-error: Could not acquire an SFU token.
 * - sfu-timeout: The SFU endpoint did not respond in time.
 * - sfu-fetch: An error occurred when fetching data from the SFU (e.g. a network connectivity
 *   error).
 * - sfu-status-code: The SFU endpoint did not return an acceptable HTTP status code for the call.
 * - sfu-invalid-data: Data received from the SFU endpoint that is considered critical could not be
 *   decoded.
 * - webrtc-connect: Could not connect to the SFU via WebRTC.
 *
 * Note: How an SFU token is acquired is up to the app (a group call obtains it from the directory
 * server, a conference guest will not), so the `type` of a `directory-error` is deliberately just
 * the app's own reason string rather than a shared enumeration.
 */
export type GroupCallErrorType =
    | {readonly kind: 'invalid-state'}
    | {readonly kind: 'directory-error'; readonly type: string}
    | {readonly kind: 'sfu-timeout'}
    | {readonly kind: 'sfu-fetch'}
    | {readonly kind: 'sfu-status-code'; readonly status: u53}
    | {readonly kind: 'sfu-invalid-data'}
    | {readonly kind: 'webrtc-connect'};

/**
 * Additional {@link GroupCallError} options.
 */
export interface GroupCallErrorOptions {
    /**
     * Cause of the error. Will be mapped to an {@link Error} automatically.
     *
     * Note: This intentionally deviates from the property {@link Error.cause} because every throw
     * site passes a value caught from a `catch` block, i.e. an `unknown`.
     */
    readonly from?: unknown;
}

/**
 * An error associated to a group call.
 *
 * Note: This is a plain {@link Error} subclass on purpose. An app that transfers it across a worker
 * boundary registers a transfer handler for it and attaches it to the prototype externally, so that
 * this package stays free of any RPC coupling.
 */
export class GroupCallError extends Error {
    public override readonly name = 'GroupCallError';

    public constructor(
        public readonly type: GroupCallErrorType,
        message: string,
        options?: GroupCallErrorOptions,
    ) {
        super(
            message,
            options?.from === undefined ? undefined : {cause: ensureError(options.from)},
        );
    }
}
