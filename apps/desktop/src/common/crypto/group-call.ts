import {
    deriveGroupCallId,
    deriveGroupCallKeys,
    type GroupCallId,
    type GroupCallKeys,
    type RawParticipantCallMediaKeyState,
} from '@threema/call';

import type {ServicesForBackend} from '~/common/backend';
import type {GroupView} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import type {ParticipantId, GroupCallBaseData} from '~/common/network/protocol/call/group-call';
import type {ProxyMarked} from '~/common/utils/endpoint';

// TODO(DESK-2248): Remove re-exports in favor of updating the changed imports
export {
    ensureRawGroupCallKeyHash,
    GROUP_CALL_KEY_LENGTH,
    wrapRawGroupCallKey,
    type RawGroupCallKey,
    type RawGroupCallKeyHash,
} from '@threema/call';

// TODO(DESK-2248): Remove re-exports in favor of updating the changed imports
export {
    deriveGroupCallNormalHandshakeAuthKey,
    type GroupCallNormalHandshakeAuthBox,
    type LocalParticipantCallKey,
    type LocalParticipantCookie,
    type LocalParticipantSequenceNumberValue,
    type ParticipantCallBox,
    type RemoteParticipantCallKey,
    type RemoteParticipantCookie,
    type RemoteParticipantSequenceNumberValue,
} from '@threema/call';

// TODO(DESK-2248): Remove re-exports in favor of updating the changed imports
export {
    alignMediaKeyStateWith,
    ensureMediaKeySuccessorState,
    LocalParticipantCallMediaKey,
    PCMK_LENGTH,
    type ParticipantCallMediaKeyState,
    type RawParticipantCallMediaKey,
    type RawParticipantCallMediaKeyState,
} from '@threema/call';

/**
 * Group call key derivation collection based on GCK.
 */
export interface GroupCallKeyDerivations extends GroupCallKeys {
    readonly callId: GroupCallId;
}

/**
 * Derive all group call properties.
 */
export function deriveGroupCallProperties(
    services: Pick<ServicesForBackend, 'crypto' | 'device'>,
    group: GroupView,
    data: Omit<GroupCallBaseData, 'group' | 'derivations'>,
): GroupCallKeyDerivations {
    return {
        callId: deriveGroupCallId({
            creatorIdentity: getIdentityString(services.device, group.creator),
            groupId: group.groupId,
            protocolVersion: data.protocolVersion,
            gck: data.gck,
            sfuBaseUrl: data.sfuBaseUrl.raw,
        }),
        ...deriveGroupCallKeys(services.crypto, data.gck),
    };
}

export type MediaCryptoEncryptorBackendHandle = ProxyMarked & {
    readonly setPcmk: (pcmk: RawParticipantCallMediaKeyState) => void;
};

export type MediaCryptoDecryptorBackendHandle = ProxyMarked & {
    /** Remove a remote participant. */
    readonly remove: (participant: ParticipantId) => void;

    /**
     * Add PCMKs to the remote participant decryptor context.
     *
     * Note: Implicitly adds the remote participant if needed.
     */
    readonly addPcmks: (
        participant: ParticipantId,
        pcmks: readonly RawParticipantCallMediaKeyState[],
    ) => void;
};

export interface MediaCryptoHandleForBackend extends ProxyMarked {
    readonly encryptor: MediaCryptoEncryptorBackendHandle;
    readonly decryptor: MediaCryptoDecryptorBackendHandle;
}
