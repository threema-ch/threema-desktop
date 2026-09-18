import type {SfuPeekResult} from '@threema/call';
import type {DtlsFingerprint} from '@threema/webrtc/sdp';

import type {JoinResponse} from '~/common/network/protobuf/validate/group-call';
import type {GroupCallBaseData} from '~/common/network/protocol/call/group-call';
import type {SfuToken} from '~/common/network/protocol/directory';

export interface SfuHttpBackend {
    /**
     * Peek a call on the SFU.
     *
     * @returns the current group call state (if known) or `undefined` (which still means the group
     *   call exists).
     * @throws {GroupCallError} if something went wrong.
     */
    peek: (data: GroupCallBaseData, token: SfuToken) => Promise<SfuPeekResult | undefined>;

    /**
     * Join or create a call on the SFU.
     *
     * Note: If no group call with the provided {@link CallId} is active, the group call will be
     * created.
     *
     * @returns necessary information to connect to the group call via WebRTC.
     * @throws {GroupCallError} if something went wrong.
     */
    join: (
        data: GroupCallBaseData,
        fingerprint: DtlsFingerprint,
        token: SfuToken,
    ) => Promise<JoinResponse>;
}
