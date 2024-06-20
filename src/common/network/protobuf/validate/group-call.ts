import * as v from '@badrap/valita';

import {
    ensureCookie,
    ensureEncryptedDataWithNonceAhead,
    ensurePublicKey,
    wrapRawKey,
} from '~/common/crypto';
import {
    PCMK_LENGTH,
    type LocalParticipantCookie,
    type RawParticipantCallMediaKey,
    type RemoteParticipantCallKey,
    type RemoteParticipantCookie,
} from '~/common/crypto/group-call';
import {groupcall} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import * as Unit from '~/common/network/protobuf/validate/common/unit';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {ensureParticipantId} from '~/common/network/protocol/call/group-call';
import {ensureIdentityString, ensureNickname} from '~/common/network/types';
import {ensureU16, ensureU53, ensureU8, tag} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {unixTimestampToDateMs} from '~/common/utils/number';
import {
    instanceOf,
    nullEmptyStringOptional,
    nullOptional,
    unsignedLongAsU64,
} from '~/common/utils/valita-helpers';
import {ensureIceUsernameFragment, ensureIcePassword, ensureDtlsFingerprint} from '~/common/webrtc';

export const CALL_STATE_SNAPSHOT_SCHEMA = validator(
    groupcall.CallState,
    v
        .object({
            padding: v.unknown(), // We don't care about the padding
            stateCreatedBy: v.number().map(ensureParticipantId),
            stateCreatedAt: unsignedLongAsU64().map(unixTimestampToDateMs),
            participants: v.record(
                validator(
                    groupcall.CallState.Participant,
                    v
                        .object({
                            threema: nullOptional(
                                validator(
                                    groupcall.CallState.Participant.Normal,
                                    v.object({
                                        identity: v.string().map(ensureIdentityString),
                                        nickname: nullEmptyStringOptional(
                                            v.string().map(ensureNickname),
                                        ),
                                    }),
                                ),
                            ),
                            guest: nullOptional(v.unknown()),
                        })
                        .rest(v.unknown()),
                ).map((participant) => {
                    assert(
                        participant.guest === undefined,
                        'Guest participants are not allowed in a group call',
                    );
                    assert(participant.threema !== undefined);
                    return participant.threema;
                }),
            ),
        })
        .rest(v.unknown()),
);
export type PeekCallStateSnapshot = Readonly<v.Infer<typeof CALL_STATE_SNAPSHOT_SCHEMA>>;

export const PEEK_RESPONSE_SCHEMA = validator(
    groupcall.SfuHttpResponse.Peek,
    v
        .object({
            startedAt: unsignedLongAsU64().map(unixTimestampToDateMs),
            maxParticipants: v.number().map(ensureU53),
            encryptedCallState: nullOptional(
                instanceOf(Uint8Array).map(ensureEncryptedDataWithNonceAhead),
            ),
        })
        .rest(v.unknown()),
);
export type PeekResponse = Readonly<v.Infer<typeof PEEK_RESPONSE_SCHEMA>>;

export const JOIN_RESPONSE_SCHEMA = validator(
    groupcall.SfuHttpResponse.Join,
    v
        .object({
            startedAt: unsignedLongAsU64().map(unixTimestampToDateMs),
            maxParticipants: v.number().map(ensureU53),
            participantId: v.number().map(ensureParticipantId),
            addresses: v.array(
                validator(
                    groupcall.SfuHttpResponse.Join.Address,
                    v
                        .object({
                            protocol: v
                                .number()
                                .assert(
                                    (protocol) =>
                                        protocol ===
                                        groupcall.SfuHttpResponse.Join.Address.Protocol.UDP.valueOf(),
                                ),
                            port: v.number().map(ensureU16),
                            ip: v.string(),
                        })
                        .rest(v.unknown()),
                ),
            ),
            iceUsernameFragment: v.string().map(ensureIceUsernameFragment),
            icePassword: v.string().map(ensureIcePassword),
            dtlsFingerprint: instanceOf(Uint8Array).map(ensureDtlsFingerprint),
        })
        .rest(v.unknown()),
);
export type JoinResponse = Readonly<v.Infer<typeof JOIN_RESPONSE_SCHEMA>>;

const S2P_HELLO_SCHEMA = validator(
    groupcall.SfuToParticipant.Hello,
    v
        .object({
            participantIds: v.array(v.number().map(ensureParticipantId)),
        })
        .rest(v.unknown()),
);
export type S2pHello = Readonly<v.Infer<typeof S2P_HELLO_SCHEMA>>;
const P2P_OUTER_ENVELOPE_SCHEMA = validator(
    groupcall.ParticipantToParticipant.OuterEnvelope,
    v
        .object({
            sender: v.number().map(ensureParticipantId),
            receiver: v.number().map(ensureParticipantId),
            encryptedData: instanceOf(Uint8Array),
        })
        .rest(v.unknown()),
);
export type P2pOuterEnvelope = Readonly<v.Infer<typeof P2P_OUTER_ENVELOPE_SCHEMA>>;
const S2P_PARTICIPANT_JOINED_SCHEMA = validator(
    groupcall.SfuToParticipant.ParticipantJoined,
    v
        .object({
            participantId: v.number().map(ensureParticipantId),
        })
        .rest(v.unknown()),
);
const S2P_PARTICIPANT_LEFT_SCHEMA = validator(
    groupcall.SfuToParticipant.ParticipantLeft,
    v
        .object({
            participantId: v.number().map(ensureParticipantId),
        })
        .rest(v.unknown()),
);
const S2P_ENVELOPE_BASE_SCHEMA = {
    padding: v.unknown(),
    hello: NULL_OR_UNDEFINED_SCHEMA,
    relay: NULL_OR_UNDEFINED_SCHEMA,
    participantJoined: NULL_OR_UNDEFINED_SCHEMA,
    participantLeft: NULL_OR_UNDEFINED_SCHEMA,
} as const;
export const S2P_ENVELOPE_SCHEMA = validator(
    groupcall.SfuToParticipant.Envelope,
    v.union(
        v
            .object({
                ...S2P_ENVELOPE_BASE_SCHEMA,
                content: v.literal('relay'),
                relay: P2P_OUTER_ENVELOPE_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...S2P_ENVELOPE_BASE_SCHEMA,
                content: v.literal('hello'),
                hello: S2P_HELLO_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...S2P_ENVELOPE_BASE_SCHEMA,
                content: v.literal('participantJoined'),
                participantJoined: S2P_PARTICIPANT_JOINED_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...S2P_ENVELOPE_BASE_SCHEMA,
                content: v.literal('participantLeft'),
                participantLeft: S2P_PARTICIPANT_LEFT_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...S2P_ENVELOPE_BASE_SCHEMA,
                content: v.undefined(),
            })
            .rest(v.unknown()),
    ),
);
export type S2pEnvelope = Readonly<v.Infer<typeof S2P_ENVELOPE_SCHEMA>>;

const P2P_HANDSHAKE_HELLO_SCHEMA = validator(
    groupcall.ParticipantToParticipant.Handshake.Hello,
    v
        .object({
            identity: v.string().map(ensureIdentityString),
            nickname: v.string(),
            pck: instanceOf(Uint8Array).map(ensurePublicKey<RemoteParticipantCallKey>),
            pcck: instanceOf(Uint8Array).map(ensureCookie<RemoteParticipantCookie>),
        })
        .rest(v.unknown()),
);
const P2P_HANDSHAKE_HELLO_ENVELOPE_BASE_SCHEMA = {
    padding: v.unknown(),
    hello: NULL_OR_UNDEFINED_SCHEMA,
    guestHello: NULL_OR_UNDEFINED_SCHEMA,
} as const;
export const P2P_HANDSHAKE_HELLO_ENVELOPE_SCHEMA = validator(
    groupcall.ParticipantToParticipant.Handshake.HelloEnvelope,
    v.union(
        v
            .object({
                ...P2P_HANDSHAKE_HELLO_ENVELOPE_BASE_SCHEMA,
                content: v.literal('hello'),
                hello: P2P_HANDSHAKE_HELLO_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_HANDSHAKE_HELLO_ENVELOPE_BASE_SCHEMA,
                content: v.literal('guestHello'),
                guestHello: v.unknown(),
            })
            .rest(v.unknown()),
        // Note: Major protocol version update expected for other variants
    ),
);

const P2P_MEDIA_KEY_SCHEMA = validator(
    groupcall.ParticipantToParticipant.MediaKey,
    v
        .object({
            epoch: v.number().map(ensureU8),
            ratchetCounter: v.number().map(ensureU8),
            pcmk: instanceOf(Uint8Array).map((pcmk) =>
                tag<RawParticipantCallMediaKey>(wrapRawKey<typeof PCMK_LENGTH>(pcmk, PCMK_LENGTH)),
            ),
        })
        .rest(v.unknown()),
);

const P2P_HANDSHAKE_AUTH_SCHEMA = validator(
    groupcall.ParticipantToParticipant.Handshake.Auth,
    v
        .object({
            pck: instanceOf(Uint8Array).map(ensurePublicKey),
            pcck: instanceOf(Uint8Array).map(ensureCookie<LocalParticipantCookie>),
            mediaKeys: v.array(P2P_MEDIA_KEY_SCHEMA),
        })
        .rest(v.unknown()),
);
const P2P_HANDSHAKE_AUTH_ENVELOPE_BASE_SCHEMA = {
    padding: v.unknown(),
    auth: NULL_OR_UNDEFINED_SCHEMA,
    guestAuth: NULL_OR_UNDEFINED_SCHEMA,
} as const;
export const P2P_HANDSHAKE_AUTH_ENVELOPE_SCHEMA = validator(
    groupcall.ParticipantToParticipant.Handshake.AuthEnvelope,
    v.union(
        v
            .object({
                ...P2P_HANDSHAKE_AUTH_ENVELOPE_BASE_SCHEMA,
                content: v.literal('auth'),
                auth: P2P_HANDSHAKE_AUTH_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_HANDSHAKE_AUTH_ENVELOPE_BASE_SCHEMA,
                content: v.literal('guestAuth'),
                guestAuth: v.unknown(),
            })
            .rest(v.unknown()),
        // Note: Major protocol version update expected for other variants
    ),
);

const P2P_CAPTURE_STATE_MICROPHONE_BASE_SCHEMA = {
    on: NULL_OR_UNDEFINED_SCHEMA,
    off: NULL_OR_UNDEFINED_SCHEMA,
};
const P2P_CAPTURE_STATE_MICROPHONE_SCHEMA = validator(
    groupcall.ParticipantToParticipant.CaptureState.Microphone,
    v.union(
        v
            .object({
                ...P2P_CAPTURE_STATE_MICROPHONE_BASE_SCHEMA,
                state: v.literal('on'),
                on: Unit.SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_CAPTURE_STATE_MICROPHONE_BASE_SCHEMA,
                state: v.literal('off'),
                off: Unit.SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_CAPTURE_STATE_MICROPHONE_BASE_SCHEMA,
                state: v.undefined(),
            })
            .rest(v.unknown()),
    ),
).map(({state}) => state);
const P2P_CAPTURE_STATE_CAMERA_BASE_SCHEMA = {
    on: NULL_OR_UNDEFINED_SCHEMA,
    off: NULL_OR_UNDEFINED_SCHEMA,
};
const P2P_CAPTURE_STATE_CAMERA_SCHEMA = validator(
    groupcall.ParticipantToParticipant.CaptureState.Camera,
    v.union(
        v
            .object({
                ...P2P_CAPTURE_STATE_CAMERA_BASE_SCHEMA,
                state: v.literal('on'),
                on: Unit.SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_CAPTURE_STATE_CAMERA_BASE_SCHEMA,
                state: v.literal('off'),
                off: Unit.SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_CAPTURE_STATE_CAMERA_BASE_SCHEMA,
                state: v.undefined(),
            })
            .rest(v.unknown()),
    ),
).map(({state}) => state);
const P2P_CAPTURE_STATE_BASE_SCHEMA = {
    microphone: NULL_OR_UNDEFINED_SCHEMA,
    camera: NULL_OR_UNDEFINED_SCHEMA,
} as const;
const P2P_CAPTURE_STATE_SCHEMA = validator(
    groupcall.ParticipantToParticipant.CaptureState,
    v.union(
        v
            .object({
                ...P2P_CAPTURE_STATE_BASE_SCHEMA,
                state: v.literal('microphone'),
                microphone: P2P_CAPTURE_STATE_MICROPHONE_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_CAPTURE_STATE_BASE_SCHEMA,
                state: v.literal('camera'),
                camera: P2P_CAPTURE_STATE_CAMERA_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_CAPTURE_STATE_BASE_SCHEMA,
                state: v.undefined(),
            })
            .rest(v.unknown()),
    ),
);

const P2P_ENVELOPE_BASE_SCHEMA = {
    padding: v.unknown(),
    encryptedAdminEnvelope: NULL_OR_UNDEFINED_SCHEMA,
    rekey: NULL_OR_UNDEFINED_SCHEMA,
    captureState: NULL_OR_UNDEFINED_SCHEMA,
    holdState: NULL_OR_UNDEFINED_SCHEMA,
} as const;
export const P2P_ENVELOPE_SCHEMA = validator(
    groupcall.ParticipantToParticipant.Envelope,
    v.union(
        v
            .object({
                ...P2P_ENVELOPE_BASE_SCHEMA,
                content: v.literal('encryptedAdminEnvelope'),
                encryptedAdminEnvelope: v.unknown(),
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_ENVELOPE_BASE_SCHEMA,
                content: v.literal('rekey'),
                rekey: P2P_MEDIA_KEY_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_ENVELOPE_BASE_SCHEMA,
                content: v.literal('captureState'),
                captureState: P2P_CAPTURE_STATE_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_ENVELOPE_BASE_SCHEMA,
                content: v.literal('holdState'),
                holdState: v.unknown(),
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_ENVELOPE_BASE_SCHEMA,
                content: v.undefined(),
            })
            .rest(v.unknown()),
    ),
);
