import * as v from '@badrap/valita';
import {
    ensureCookie,
    ensureEncryptedDataWithNonceAhead,
    ensurePublicKey,
    wrapRawKey,
} from '@threema/crypto';
import {ensureIdentityString, ensureNickname} from '@threema/domain';
import {group_call} from '@threema/protocol/protobuf';
import {NULL_OR_UNDEFINED_SCHEMA, UNIT_SCHEMA, validator} from '@threema/protocol/protobuf/utils';
import {unixTimestampToDateMs} from '@threema/ts-utils/conversion/unix-timestamp-to-date-ms';
import {unsignedLongAsU64} from '@threema/ts-utils/conversion/unsigned-long-as-u64';
import {ensureU16} from '@threema/ts-utils/integer/u16';
import {ensureU53} from '@threema/ts-utils/integer/u53';
import {ensureU8} from '@threema/ts-utils/integer/u8';
import {assert} from '@threema/ts-utils/meta/assert';
import {instanceOf} from '@threema/ts-utils/meta/instance-of';
import {tag} from '@threema/ts-utils/meta/newtype';
import {nullEmptyStringOptional} from '@threema/ts-utils/null/null-empty-string-optional';
import {nullOptional} from '@threema/ts-utils/null/null-optional';
import {
    ensureDtlsFingerprint,
    ensureIcePassword,
    ensureIceUsernameFragment,
    ensureRtpHeaderExtensionId,
} from '@threema/webrtc/sdp';

import {PCMK_LENGTH, type RawParticipantCallMediaKey} from './media-key.js';
import type {
    LocalParticipantCookie,
    RemoteParticipantCallKey,
    RemoteParticipantCookie,
} from './participant-channel.js';
import {ensureParticipantId} from './participant.js';
import {SfuSupportedFeatures} from './sfu.js';

export const CALL_STATE_SNAPSHOT_SCHEMA = validator(
    group_call.CallState,
    v
        .object({
            padding: v.unknown(), // We don't care about the padding
            stateCreatedBy: v.number().map(ensureParticipantId),
            stateCreatedAt: unsignedLongAsU64().map(unixTimestampToDateMs),
            participants: v.record(
                validator(
                    group_call.CallState.Participant,
                    v
                        .object({
                            threema: nullOptional(
                                validator(
                                    group_call.CallState.Participant.Normal,
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
    group_call.SfuHttpResponse.Peek,
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
    group_call.SfuHttpResponse.Join,
    v
        .object({
            startedAt: unsignedLongAsU64().map(unixTimestampToDateMs),
            maxParticipants: v.number().map(ensureU53),
            participantId: v.number().map(ensureParticipantId),
            addresses: v.array(
                validator(
                    group_call.SfuHttpResponse.Join.Address,
                    v
                        .object({
                            protocol: v
                                .number()
                                .assert(
                                    (protocol) =>
                                        protocol ===
                                        group_call.SfuHttpResponse.Join.Address.Protocol.UDP.valueOf(),
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

            rtpHeaderExtensionIds: nullOptional(
                validator(
                    group_call.SfuHttpResponse.Join.RtpHeaderExtensionIds,
                    v
                        .object({
                            mid: v.number().map(ensureRtpHeaderExtensionId),
                            rtpStreamId: v.number().map(ensureRtpHeaderExtensionId),
                            repairedRtpStreamId: v.number().map(ensureRtpHeaderExtensionId),
                            absoluteSendTime: v.number().map(ensureRtpHeaderExtensionId),
                            // eslint-disable-next-line @typescript-eslint/naming-convention
                            transportWideCongestionControl_01: v
                                .number()
                                .map(ensureRtpHeaderExtensionId),
                            videoOrientation: v.number().map(ensureRtpHeaderExtensionId),
                            timeOffset: v.number().map(ensureRtpHeaderExtensionId),
                        })
                        .rest(v.unknown()),
                ),
            ).default({
                mid: ensureRtpHeaderExtensionId(1),
                rtpStreamId: ensureRtpHeaderExtensionId(2),
                repairedRtpStreamId: ensureRtpHeaderExtensionId(3),
                absoluteSendTime: ensureRtpHeaderExtensionId(4),
                // eslint-disable-next-line @typescript-eslint/naming-convention
                transportWideCongestionControl_01: ensureRtpHeaderExtensionId(5),
                videoOrientation: ensureRtpHeaderExtensionId(11),
                timeOffset: ensureRtpHeaderExtensionId(12),
            }),

            supportedFeatures: unsignedLongAsU64()
                .map(SfuSupportedFeatures.fromBitmask)
                .default(SfuSupportedFeatures.base()),
        })
        .rest(v.unknown()),
);
export type JoinResponse = Readonly<v.Infer<typeof JOIN_RESPONSE_SCHEMA>>;

const S2P_HELLO_SCHEMA = validator(
    group_call.SfuToParticipant.Hello,
    v
        .object({
            participantIds: v.array(v.number().map(ensureParticipantId)),
        })
        .rest(v.unknown()),
);
export type S2pHello = Readonly<v.Infer<typeof S2P_HELLO_SCHEMA>>;
const P2P_OUTER_ENVELOPE_SCHEMA = validator(
    group_call.ParticipantToParticipant.OuterEnvelope,
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
    group_call.SfuToParticipant.ParticipantJoined,
    v
        .object({
            participantId: v.number().map(ensureParticipantId),
        })
        .rest(v.unknown()),
);
const S2P_PARTICIPANT_LEFT_SCHEMA = validator(
    group_call.SfuToParticipant.ParticipantLeft,
    v
        .object({
            participantId: v.number().map(ensureParticipantId),
        })
        .rest(v.unknown()),
);

const S2P_PARTICIPANT_TIMESTAMP_SCHEMA = validator(
    group_call.SfuToParticipant.Timestamp,
    v
        .object({
            ms: unsignedLongAsU64(),
        })
        .rest(v.unknown()),
);
const S2P_ENVELOPE_BASE_SCHEMA = {
    padding: v.unknown(),
    hello: NULL_OR_UNDEFINED_SCHEMA,
    relay: NULL_OR_UNDEFINED_SCHEMA,
    participantJoined: NULL_OR_UNDEFINED_SCHEMA,
    participantLeft: NULL_OR_UNDEFINED_SCHEMA,
    timestampResponse: NULL_OR_UNDEFINED_SCHEMA,
} as const;
export const S2P_ENVELOPE_SCHEMA = validator(
    group_call.SfuToParticipant.Envelope,
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
                content: v.literal('timestampResponse'),
                timestampResponse: S2P_PARTICIPANT_TIMESTAMP_SCHEMA,
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
    group_call.ParticipantToParticipant.Handshake.Hello,
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
    group_call.ParticipantToParticipant.Handshake.HelloEnvelope,
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
    group_call.ParticipantToParticipant.MediaKey,
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
    group_call.ParticipantToParticipant.Handshake.Auth,
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
    group_call.ParticipantToParticipant.Handshake.AuthEnvelope,
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
    group_call.ParticipantToParticipant.CaptureState.Microphone,
    v.union(
        v
            .object({
                ...P2P_CAPTURE_STATE_MICROPHONE_BASE_SCHEMA,
                state: v.literal('on'),
                on: UNIT_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_CAPTURE_STATE_MICROPHONE_BASE_SCHEMA,
                state: v.literal('off'),
                off: UNIT_SCHEMA,
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

const P2P_CAPTURE_STATE_SCREEN_BASE_SCHEMA = {
    on: NULL_OR_UNDEFINED_SCHEMA,
    off: NULL_OR_UNDEFINED_SCHEMA,
};
const P2P_CAPTURE_STATE_CAMERA_SCHEMA = validator(
    group_call.ParticipantToParticipant.CaptureState.Camera,
    v.union(
        v
            .object({
                ...P2P_CAPTURE_STATE_CAMERA_BASE_SCHEMA,
                state: v.literal('on'),
                on: UNIT_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_CAPTURE_STATE_CAMERA_BASE_SCHEMA,
                state: v.literal('off'),
                off: UNIT_SCHEMA,
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

const P2P_CAPTURE_STATE_SCREEN_SCHEMA = validator(
    group_call.ParticipantToParticipant.CaptureState.Screen,
    v.union(
        v
            .object({
                ...P2P_CAPTURE_STATE_SCREEN_BASE_SCHEMA,
                state: v.literal('on'),
                on: validator(
                    group_call.ParticipantToParticipant.CaptureState.Screen.On,
                    v.object({
                        startedAt: unsignedLongAsU64(),
                    }),
                ),
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_CAPTURE_STATE_SCREEN_BASE_SCHEMA,
                state: v.literal('off'),
                off: UNIT_SCHEMA,
            })
            .rest(v.unknown()),
        v
            .object({
                ...P2P_CAPTURE_STATE_SCREEN_BASE_SCHEMA,
                state: v.undefined(),
            })
            .rest(v.unknown()),
    ),
).map((obj) => {
    if (obj.state === undefined) {
        return undefined;
    }
    if (obj.state === 'off') {
        return 'off';
    }
    return obj.on;
});

const P2P_CAPTURE_STATE_BASE_SCHEMA = {
    microphone: NULL_OR_UNDEFINED_SCHEMA,
    camera: NULL_OR_UNDEFINED_SCHEMA,
    screen: NULL_OR_UNDEFINED_SCHEMA,
} as const;
const P2P_CAPTURE_STATE_SCHEMA = validator(
    group_call.ParticipantToParticipant.CaptureState,
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
                state: v.literal('screen'),
                screen: P2P_CAPTURE_STATE_SCREEN_SCHEMA,
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
    group_call.ParticipantToParticipant.Envelope,
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
