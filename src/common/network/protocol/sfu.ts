import type {
    JoinResponse,
    PeekResponse as RawPeekResponse,
} from '~/common/network/protobuf/validate/group-call';
import type {GroupCallBaseData} from '~/common/network/protocol/call/group-call';
import type {SfuToken} from '~/common/network/protocol/directory';
import type {IdentityString} from '~/common/network/types';
import type {DtlsFingerprint} from '~/common/webrtc';

export type PeekResponse = Pick<RawPeekResponse, 'startedAt' | 'maxParticipants'> & {
    /** IMPORTANT: This may include contacts more than once, including the user itself! */
    readonly participants: readonly IdentityString[] | undefined;
};

export interface SfuHttpBackend {
    /**
     * Peek a call on the SFU.
     *
     * @returns the current group call state (if known) or `undefined` (which still means the group
     *   call exists).
     * @throws {GroupCallError} if something went wrong. See {@link SfuHttpErrorType} for a list of
     *   possible error types.
     */
    peek: (data: GroupCallBaseData, token: SfuToken) => Promise<PeekResponse | undefined>;

    /**
     * Join or create a call on the SFU.
     *
     * Note: If no group call with the provided {@link CallId} is active, the group call will be
     * created.
     *
     * @returns necessary information to connect to the group call via WebRTC.
     * @throws {GroupCallError} if something went wrong. See {@link SfuHttpErrorType} for a list of
     *   possible error types.
     */
    join: (
        data: GroupCallBaseData,
        fingerprint: DtlsFingerprint,
        token: SfuToken,
    ) => Promise<JoinResponse>;
}
