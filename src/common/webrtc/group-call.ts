import {
    COOKIE_LENGTH,
    NACL_CONSTANTS,
    NONCE_UNGUARDED_SCOPE,
    ensureEncryptedDataWithNonceAhead,
    wrapRawKey,
    type CryptoBackend,
    type EncryptedData,
    type EncryptedDataWithNonceAhead,
    type PlainData,
} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN, SharedBoxFactory} from '~/common/crypto/box';
import {
    LocalParticipantCallMediaKey,
    deriveGroupCallNormalHandshakeAuthKey,
    type GroupCallNormalHandshakeAuthBox,
    type LocalParticipantCallKey,
    type LocalParticipantCookie,
    type LocalParticipantSequenceNumberValue,
    type MediaCryptoHandleForBackend as MediaCryptoBackendHandle,
    type ParticipantCallBox,
    type ParticipantCallMediaKeyState,
    type RawGroupCallKeyHash,
    type RawParticipantCallMediaKeyState,
    type RemoteParticipantCallKey,
    type RemoteParticipantCookie,
    type RemoteParticipantSequenceNumberValue,
} from '~/common/crypto/group-call';
import {randomU8} from '~/common/crypto/random';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import type {Contact} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import type {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import type {ProtobufInstanceOf} from '~/common/network/protobuf/utils';
import {
    P2P_ENVELOPE_SCHEMA,
    P2P_HANDSHAKE_AUTH_ENVELOPE_SCHEMA,
    P2P_HANDSHAKE_HELLO_ENVELOPE_SCHEMA,
    S2P_ENVELOPE_SCHEMA,
    type JoinResponse,
    type S2pEnvelope,
    type S2pHello,
} from '~/common/network/protobuf/validate/group-call';
import {
    getGroupMember,
    type GroupCallBaseData,
    type ParticipantId,
    type ServicesForGroupCall,
} from '~/common/network/protocol/call/group-call';
import {tag, type Dimensions, type ReadonlyUint8Array, type u53} from '~/common/types';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import {u8aToBase64} from '~/common/utils/base64';
import {byteEquals, bytesToHex} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {Delayed} from '~/common/utils/delayed';
import {
    type ProxyMarked,
    type RemoteProxy,
    type ProxyEndpoint,
    PROXY_HANDLER,
} from '~/common/utils/endpoint';
import {AsyncLock} from '~/common/utils/lock';
import {dateToUnixTimestampMs, intoUnsignedLong, u64ToBytesLe} from '~/common/utils/number';
import {SequenceNumberU53, SequenceNumberU64} from '~/common/utils/sequence-number';
import {AbortRaiser, type AbortListener} from '~/common/utils/signal';
import {WritableStore, type IQueryableStore, type ReadableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {TIMER, type TimerCanceller} from '~/common/utils/timer';
import {
    type IceUsernameFragment,
    type IcePassword,
    type DtlsFingerprint,
    SDP_TOKEN_RANGE,
} from '~/common/webrtc';

const MIDS = [
    ...SDP_TOKEN_RANGE,
    ...SDP_TOKEN_RANGE.map((left) => SDP_TOKEN_RANGE.map((right) => `${left}${right}`)).flat(),
] as const;
const MIDS_STEP = 8;
export const MIDS_MAX = MIDS.length / MIDS_STEP;
assert(Number.isInteger(MIDS_MAX));

/**
 * MIDs are technically transmitted as bytes but **THANKS TO SDP** we are actually limited to what
 * is accepted as an SDP token. This means that if we want to only transfer 1 byte, out of 256
 * possible MIDs we can only use 79. Considering that we need multiple media lines for each
 * participant, that won't be enough, so we need to expand to one and two bytes. This means we have
 * a total amount of 79 + 79^2 = 6320 MIDs. In order to leave some room for future media lines (e.g.
 * screenshare), we slice these MIDs into partitions of 8 MIDs per participant, so we can
 * theoretically serve 790 participants in a single call.
 *
 * The MID permutations **must** be generated in exactly the same order on all clients to get the
 * correct MIDs for a participant.
 */
export function getMids(participantId: ParticipantId): {
    readonly microphone: string;
    readonly camera: string;
    readonly data: string;
} {
    const offset = participantId * MIDS_STEP;
    const mids = MIDS.slice(offset, offset + MIDS_STEP);
    if (mids.length !== MIDS_STEP) {
        throw new Error(`Unable to infer MIDs from participant id '${participantId}'`);
    }
    const [microphone, camera, , , , , , data] = mids;
    return {
        microphone: unwrap(microphone),
        camera: unwrap(camera),
        data: unwrap(data),
    };
}

/**
 * IMPORTANT: These parameters are hard-coded and MUST be kept in sync with the SFU.
 */
export const DATA_CHANNEL_PARAMETERS = {
    MAX_MESSAGE_SIZE: 131072,
    STREAM_ID: {
        P2S: 0,
    },
} as const;

interface RtcpFeedback {
    readonly type: string;
    readonly parameter?: string;
}
interface RtpAudioCodec {
    readonly mimeType: string;
    readonly payloadType: u53;
    readonly clockRate: u53;
    readonly channels: u53;
    readonly parameters: Record<string, u53>;
    readonly rtcpFeedback: readonly RtcpFeedback[];
}
interface RtpVideoCodec {
    readonly mimeType: string;
    readonly payloadType: u53;
    readonly clockRate: u53;
    readonly channels?: never;
    readonly parameters?: never;
    readonly rtcpFeedback: readonly RtcpFeedback[];
}
interface RtpVideoFeatureCodec {
    readonly mimeType: string;
    readonly payloadType: u53;
    readonly clockRate: u53;
    readonly channels?: never;
    readonly parameters: Record<string, u53>;
    readonly rtcpFeedback?: never;
}

/**
 * IMPORTANT: The media codecs and _some_ associated parameters are hard-coded and MUST be kept in
 * sync with the SFU.
 */
const MEDIA_CODECS: {
    readonly MICROPHONE: RtpAudioCodec;
    readonly CAMERA: {
        readonly VP8: RtpVideoCodec;
        readonly VP8_RTX: RtpVideoFeatureCodec;
    };
} = {
    MICROPHONE: {
        mimeType: 'audio/opus',
        payloadType: 111,
        clockRate: 48_000,
        channels: 2,
        parameters: {
            minptime: 10,
            useinbandfec: 1,
            usedtx: 1,
        },
        rtcpFeedback: [{type: 'transport-cc'}],
    },
    CAMERA: {
        VP8: {
            mimeType: 'video/VP8',
            payloadType: 96,
            clockRate: 90_000,
            rtcpFeedback: [
                {type: 'transport-cc'},
                {type: 'ccm', parameter: 'fir'},
                {type: 'nack'},
                {type: 'nack', parameter: 'pli'},
                {type: 'goog-remb'},
            ],
        },
        VP8_RTX: {
            mimeType: 'video/rtx',
            payloadType: 97,
            clockRate: 90_000,
            parameters: {
                apt: 96,
            },
        },
    },
} as const;

/**
 * IMPORTANT: The header extension ids are hard-coded and MUST be kept in sync with the SFU.
 */
const HEADER_EXTENSIONS = {
    MICROPHONE: [
        {
            id: 1,
            uri: 'urn:ietf:params:rtp-hdrext:sdes:mid',
        },
        {
            id: 4,
            uri: 'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
        },
        {
            id: 5,
            uri: 'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
        },
        // TODO(SE-257): Disabled until we can use cryptex
        // {
        //     id: 10,
        //     uri: 'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
        // },
    ],
    CAMERA: [
        {
            id: 1,
            uri: 'urn:ietf:params:rtp-hdrext:sdes:mid',
        },
        {
            id: 2,
            uri: 'urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id',
        },
        {
            id: 3,
            uri: 'urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id',
        },
        {
            id: 4,
            uri: 'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
        },
        {
            id: 5,
            uri: 'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
        },
        {
            id: 11,
            uri: 'urn:3gpp:video-orientation',
        },
        {
            id: 12,
            uri: 'urn:ietf:params:rtp-hdrext:toffset',
        },
    ],
} as const;

interface SdpRtpAudioCodec {
    readonly payloadType: u53;
    readonly clockRate: u53;
    readonly channels: u53;
    readonly feedback: readonly string[];
    readonly fmtp: string;
}
interface SdpRtpVideoCodec {
    readonly payloadType: u53;
    readonly clockRate: u53;
    readonly channels?: never;
    readonly feedback: readonly string[] | undefined;
    readonly fmtp: string | undefined;
}

const DESIRED_MICROPHONE_CODECS: {readonly opus: SdpRtpAudioCodec} = {
    opus: {
        payloadType: MEDIA_CODECS.MICROPHONE.payloadType,
        clockRate: MEDIA_CODECS.MICROPHONE.clockRate,
        channels: MEDIA_CODECS.MICROPHONE.channels,
        feedback: MEDIA_CODECS.MICROPHONE.rtcpFeedback.map((value) =>
            `${value.type} ${value.parameter ?? ''}`.trimEnd(),
        ),
        fmtp: Object.entries(MEDIA_CODECS.MICROPHONE.parameters)
            .map(([key, value]) => `${key}=${value}`)
            .join(';'),
    },
} as const;

const DESIRED_CAMERA_CODECS: {
    readonly VP8: SdpRtpVideoCodec;
    readonly rtx: SdpRtpVideoCodec;
} = {
    VP8: {
        payloadType: MEDIA_CODECS.CAMERA.VP8.payloadType,
        clockRate: MEDIA_CODECS.CAMERA.VP8.clockRate,
        feedback: unwrap(MEDIA_CODECS.CAMERA.VP8.rtcpFeedback).map((value) =>
            `${value.type} ${value.parameter ?? ''}`.trimEnd(),
        ),
        fmtp: undefined,
    },
    rtx: {
        payloadType: MEDIA_CODECS.CAMERA.VP8_RTX.payloadType,
        clockRate: MEDIA_CODECS.CAMERA.VP8_RTX.clockRate,
        feedback: undefined,
        fmtp: Object.entries(unwrap(MEDIA_CODECS.CAMERA.VP8_RTX.parameters))
            .map(([key, value]) => `${key}=${value}`)
            .join(';'),
    },
} as const;

interface SdpRtpEncodingParameters {
    readonly rid: string;
    readonly maxBitrate: number;
    readonly scaleResolutionDownBy: number;
    readonly scalabilityMode: 'L1T3';
}

export const CAMERA_ENCODINGS: readonly SdpRtpEncodingParameters[] = [
    {
        rid: 'l',
        scaleResolutionDownBy: 4,
        maxBitrate: 100_000,
        scalabilityMode: 'L1T3',
    },
    {
        rid: 'm',
        scaleResolutionDownBy: 2,
        maxBitrate: 250_000,
        scalabilityMode: 'L1T3',
    },
    {
        rid: 'h',
        scaleResolutionDownBy: 1,
        maxBitrate: 1_200_000,
        scalabilityMode: 'L1T3',
    },
] as const;

type SdpRtpMediaType = 'local' | 'remote';
type SdpRtpMediaKind = 'audio' | 'video';
type SdpRtpHeaderExtensions = readonly {readonly id: u53; readonly uri: string}[];
interface SdpRtpLineOptions {
    readonly simulcast: readonly SdpRtpEncodingParameters[];
}

interface RemoteSessionDescriptionInit {
    readonly static: {
        readonly iceUsernameFragment: IceUsernameFragment;
        readonly icePassword: IcePassword;
        readonly dtlsFingerprintHex: string;
    };
    readonly version: u53;
    readonly mLineOrder: ParticipantId[];
    readonly local: ParticipantId;
    readonly remote: Set<ParticipantId>;
}

function createRemoteSessionDescription({
    static: {iceUsernameFragment, icePassword, dtlsFingerprintHex},
    version,
    mLineOrder,
    local,
    remote,
}: RemoteSessionDescriptionInit): string {
    function createRtpMediaLines<TKind extends SdpRtpMediaKind>(
        type: SdpRtpMediaType,
        kind: TKind,
        active: boolean,
        headerExtensions: SdpRtpHeaderExtensions,
        codecs: Record<string, SdpRtpAudioCodec | SdpRtpVideoCodec>,
        mid: string,
        options?: SdpRtpLineOptions,
    ): readonly string[] {
        const payloadTypes = Object.values(codecs).map(({payloadType}) => payloadType);

        // Determine direction
        let direction = 'inactive';
        if (active) {
            direction = type === 'local' ? 'recvonly' : 'sendonly';
        }

        // Add media-specific lines
        const lines_ = [
            `m=${kind} ${active ? '9' : '0'} UDP/TLS/RTP/SAVPF ${payloadTypes.join(' ')}`,
            'c=IN IP4 0.0.0.0',
            'a=rtcp:9 IN IP4 0.0.0.0',
            `a=mid:${mid}`,
            ...headerExtensions.map(({id, uri}) => `a=extmap:${id} ${uri}`),
            `a=${direction}`,
            'a=rtcp-mux',
        ];
        if (kind === 'video') {
            lines_.push('a=rtcp-rsize');
        }

        // Add codec-specific lines
        for (const [name, codec] of Object.entries(codecs)) {
            const codecParameters = [codec.clockRate, codec.channels].filter(
                (parameter) => parameter !== undefined,
            );
            lines_.push(
                `a=rtpmap:${codec.payloadType} ${name}/${codecParameters.join('/')}`,
                ...(codec.feedback ?? []).map(
                    (feedback) => `a=rtcp-fb:${codec.payloadType} ${feedback}`,
                ),
            );
            if (codec.fmtp !== undefined) {
                lines_.push(`a=fmtp:${codec.payloadType} ${codec.fmtp}`);
            }
        }

        // Add simulcast lines, if necessary
        if (active && options?.simulcast !== undefined) {
            if (kind !== 'video') {
                throw new Error("Can only do simulcast for 'video'");
            }
            if (type !== 'local') {
                throw new Error('Can only do simulcast for local media');
            }
            const rids = options.simulcast.map(({rid}) => rid);
            lines_.push(
                ...rids.map((rid) => `a=rid:${rid} recv`),
                `a=simulcast:recv ${rids.join(';')}`,
            );
        }

        return lines_;
    }

    function createSctpMediaLines(mid: string): readonly string[] {
        return [
            'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
            'c=IN IP4 0.0.0.0',
            `a=mid:${mid}`,
            'a=sctp-port:5000',
            `a=max-message-size:${DATA_CHANNEL_PARAMETERS.MAX_MESSAGE_SIZE}`,
        ];
    }

    function createSessionLines(bundle_: readonly string[]): readonly string[] {
        return [
            'v=0',
            `o=SDP_IS_LOVE 1 ${version} IN IP4 127.0.0.1`,
            's=-',
            't=0 0',
            `a=group:BUNDLE ${bundle_.join(' ')}`,
            'a=msid-semantic: WMS *',
            `a=ice-ufrag:${iceUsernameFragment}`,
            `a=ice-pwd:${icePassword}`,
            'a=ice-options:trickle',
            'a=ice-lite',
            `a=fingerprint:sha-256 ${dtlsFingerprintHex}`,
            'a=setup:passive',
        ];
    }

    // List of all bundled MIDs
    const bundle = [];

    // Generated remote lines
    const lines = [];

    // Add local media lines.
    //
    // Note: We can assert that local m-lines are **always** first!
    {
        assert(mLineOrder.shift() === local);
        const mids = getMids(local);

        // Add RTP media lines
        bundle.push(mids.microphone);
        lines.push(
            ...createRtpMediaLines(
                'local',
                'audio',
                true,
                HEADER_EXTENSIONS.MICROPHONE,
                DESIRED_MICROPHONE_CODECS,
                mids.microphone,
            ),
        );
        bundle.push(mids.camera);
        lines.push(
            ...createRtpMediaLines(
                'local',
                'video',
                true,
                HEADER_EXTENSIONS.CAMERA,
                DESIRED_CAMERA_CODECS,
                mids.camera,
                {simulcast: CAMERA_ENCODINGS},
            ),
        );

        // Add SCTP media line
        bundle.push(mids.data);
        lines.push(...createSctpMediaLines(mids.data));
    }

    // Add remote media lines
    for (const participantId of mLineOrder) {
        const mids = getMids(participantId);

        // Check if the remote participant is active
        const active = remote.delete(participantId);

        // Add RTP media lines
        bundle.push(mids.microphone);
        lines.push(
            ...createRtpMediaLines(
                'remote',
                'audio',
                active,
                HEADER_EXTENSIONS.MICROPHONE,
                DESIRED_MICROPHONE_CODECS,
                mids.microphone,
            ),
        );
        bundle.push(mids.camera);
        lines.push(
            ...createRtpMediaLines(
                'remote',
                'video',
                active,
                HEADER_EXTENSIONS.CAMERA,
                DESIRED_CAMERA_CODECS,
                mids.camera,
            ),
        );
    }

    // Sanity-check
    assert(remote.size === 0);

    // Prepend session lines
    lines.unshift(...createSessionLines(bundle));

    // Generate description
    lines.push('');
    return lines.join('\r\n');
}
export interface MainThreadGroupCallContextAbort {
    readonly origin: 'main-thread';
    readonly cause: 'disconnected' | 'unexpected-error';
}
export interface BackendWorkerGroupCallContextAbort {
    readonly origin: 'backend-worker';
    readonly cause:
        | 'user-hangup'
        | 'group-left-kicked-or-removed'
        | 'group-calls-disabled'
        | 'call-not-running'
        | 'call-full'
        | 'disconnected-due-to-inactivity'
        | 'unexpected-error';
}
export type AnyGroupCallContextAbort =
    | MainThreadGroupCallContextAbort
    | BackendWorkerGroupCallContextAbort;

interface SdpState {
    readonly static: RemoteSessionDescriptionInit['static'];
    readonly version: SequenceNumberU53<u53>;
    readonly mLineOrder: Set<ParticipantId>;
}

interface ConnectionContext {
    readonly context: RemoteProxy<GroupCallContext>;
    readonly sdp: SdpState;
    readonly mediaCryptoHandle: RemoteProxy<MediaCryptoBackendHandle>;
}

interface LocalParticipant {
    readonly id: ParticipantId;
    readonly pck: LocalParticipantCallKey;
    readonly pcmk: LocalParticipantCallMediaKey;
}

type LockContext =
    | 'create'
    | 'incoming-p2s'
    | 'abort-participant'
    | 'increase-epoch-stale'
    | 'apply-to-participant'
    | 'broadcast-to-participants'
    | 'restart-ice';

interface RemoteParticipantCryptoContext {
    readonly pck: ParticipantCallBox;
    readonly local: {
        readonly pcck: LocalParticipantCookie;
        readonly sn: SequenceNumberU64<LocalParticipantSequenceNumberValue>;
    };
    readonly remote: {
        readonly pcck: RemoteParticipantCookie;
        readonly sn: SequenceNumberU64<RemoteParticipantSequenceNumberValue>;
    };
}

interface AuthenticatedRemoteParticipantInit {
    readonly contact: ModelStore<Contact> | 'me';

    /**
     * Local PCMKs that have been created while the handshake has been ongoing that we still need to
     * send.
     *
     * Note: An arbitrary amount of PCMKs could be queued if the handshake takes... forever. This is
     * such an edge case that we simply don't care.
     */
    readonly queuedLocalPcmks: readonly ParticipantCallMediaKeyState[];

    /** Initial remote PCMKs gathered during the handshake. */
    readonly initialRemotePcmks: readonly ParticipantCallMediaKeyState[];

    /** Current local capture state. */
    readonly localCaptureState: CaptureState;
}

const ZERO_BYTES = new Uint8Array(0);

function createP2sEnvelopeFragment(
    crypto: CryptoBackend | 'no-padding',
): ProtobufInstanceOf<typeof protobuf.groupcall.ParticipantToSfu.Envelope> {
    return protobuf.utils.creator(protobuf.groupcall.ParticipantToSfu.Envelope, {
        padding: crypto === 'no-padding' ? ZERO_BYTES : new Uint8Array(randomU8(crypto)),
        relay: undefined,
        updateCallState: undefined,
        requestParticipantMicrophone: undefined,
        requestParticipantCamera: undefined,
        requestParticipantScreenShare: undefined,
    });
}

function createP2pEnvelopeFragment(
    crypto: CryptoBackend,
): ProtobufInstanceOf<typeof protobuf.groupcall.ParticipantToParticipant.Envelope> {
    return protobuf.utils.creator(protobuf.groupcall.ParticipantToParticipant.Envelope, {
        padding: new Uint8Array(randomU8(crypto)),
        encryptedAdminEnvelope: undefined,
        rekey: undefined,
        captureState: undefined,
        holdState: undefined,
    });
}

/** Base handle for {@link AnyRemoteParticipant} to interact with {@link GroupCall}.  */
interface BaseGroupCallHandle {
    readonly abort: AbortRaiser<AnyGroupCallContextAbort>;
    readonly data: GroupCallBaseData;
    readonly lock: AsyncLock<LockContext, unknown>;

    /** Send participant to participant (relayed) messages to the remote participant. */
    readonly sendP2p: (
        articipantId: ParticipantId,
        encryptedItems: readonly (EncryptedDataWithNonceAhead | EncryptedData)[],
    ) => void;
}

/** Handle for {@link UnauthenticatedRemoteParticipant} to interact with {@link GroupCall}. */
interface UnauthenticatedParticipantGroupCallHandle extends BaseGroupCallHandle {
    /**
     * Mark the remote participant as authenticated. As a consequence, this will make the
     * participant visible in the UI.
     *
     * WARNING: Only call this with `lock` acquired in 'incoming-p2s' context!
     */
    readonly authenticate: (
        crypto: RemoteParticipantCryptoContext,
        init: Omit<AuthenticatedRemoteParticipantInit, 'localCaptureState'>,
    ) => void;
}

/** Handle for {@link AuthenticatedRemoteParticipant} to interact with {@link GroupCall}. */
interface AuthenticatedParticipantGroupCallHandle extends BaseGroupCallHandle {
    readonly mediaCryptoHandle: RemoteProxy<MediaCryptoBackendHandle>;

    /** Send participant to SFU messages (e.g. subscriptions). */
    readonly sendP2s: (
        envelopes: readonly ProtobufInstanceOf<
            typeof protobuf.groupcall.ParticipantToSfu.Envelope
        >[],
    ) => void;
}

type RemoteParticipantAuthState = 'await-np-hello' | 'await-ep-hello' | 'await-auth' | 'done';
type RemoteParticipantRemoveEvent =
    | {
          readonly origin: 'local';
          readonly cause: 'unexpected-error';
      }
    | {
          readonly origin: 'remote';
          readonly cause: 'protocol-error';
      }
    | {
          readonly origin: 'sfu';
          readonly cause: 'left';
      }
    | {
          readonly origin: 'group';
          readonly cause: 'member-removed';
      };

/**
 * A remote participant context holding the authentication and subscription state. It also holds
 * encryption keys towards that participant.
 *
 * Note: The interaction with {@link GroupCall} is that the remote participant can be removed from
 * it and P2S and P2P (relay) messages may be sent from it. However, it is only a state machine and
 * does not run on its own.
 */
interface BaseRemoteParticipant<TAuthentication extends RemoteParticipantAuthState> {
    /** Current authentication state (from local point of view). */
    readonly authentication: TAuthentication;

    /** Participant ID */
    readonly id: ParticipantId;

    /** Raising removes the remote participant from the group call. */
    readonly abort: AbortRaiser<RemoteParticipantRemoveEvent>;

    /** Handle a relayed message received from the remote participant. */
    readonly handleP2p: (encrypted: Uint8Array) => void;

    /** Relay new PCMKs to the remote participant (or queue it if not yet authenticated). */
    readonly sendLocalPcmks: (states: readonly ParticipantCallMediaKeyState[]) => void;
}

class UnauthenticatedRemoteParticipant
    implements BaseRemoteParticipant<Exclude<RemoteParticipantAuthState, 'done'>>
{
    private readonly _log: Logger;
    private readonly _queuedLocalPcmks: ParticipantCallMediaKeyState[] = [];
    private readonly _contact = Delayed.simple<ModelStore<Contact> | 'me'>('ContactOrSelf');
    private readonly _crypto: {
        readonly gcnhak: Delayed<GroupCallNormalHandshakeAuthBox>;
        readonly pck: Delayed<ParticipantCallBox>;
        readonly local: {
            readonly pcck: LocalParticipantCookie;
            readonly sn: SequenceNumberU64<LocalParticipantSequenceNumberValue>;
        };
        readonly remote: {
            readonly pcck: Delayed<RemoteParticipantCookie>;
            readonly sn: SequenceNumberU64<RemoteParticipantSequenceNumberValue>;
        };
    };
    private _state: Exclude<RemoteParticipantAuthState, 'done'>;

    public constructor(
        private readonly _services: Pick<
            ServicesForGroupCall,
            'crypto' | 'device' | 'logging' | 'model'
        >,
        private readonly _local: LocalParticipant,
        private readonly _call: UnauthenticatedParticipantGroupCallHandle,
        public readonly id: ParticipantId,
        handshake: 'local-initiated' | 'remote-initiated',
        public readonly abort: AbortRaiser<RemoteParticipantRemoveEvent>,
    ) {
        this._log = _services.logging.logger(
            `group-call.${_call.data.derivations.callId.shortened}.remote.unauthenticated.${id}`,
        );

        // Initialise crypto properties
        this._crypto = {
            gcnhak: Delayed.simple('GroupCallNormalHandshakeAuthBox'),
            pck: Delayed.simple('ParticipantCallBox'),
            local: {
                pcck: _services.crypto.randomBytes(
                    new Uint8Array(COOKIE_LENGTH),
                ) as LocalParticipantCookie,
                sn: new SequenceNumberU64(0n),
            },
            remote: {
                pcck: Delayed.simple('RemoteParticipantCookie'),
                sn: new SequenceNumberU64(0n),
            },
        };

        // Send '*hello' when the user is a newly joined participant (and consequently the remote
        // participant is an existing participant).
        if (handshake === 'local-initiated') {
            this._state = 'await-ep-hello';
            this._sendHello();
        } else {
            this._state = 'await-np-hello';
        }
    }

    /** @inheritdoc */
    public get authentication(): Exclude<RemoteParticipantAuthState, 'done'> {
        return this._state;
    }

    /** @inheritdoc */
    public handleP2p(encrypted: Uint8Array): void {
        switch (this._state) {
            case 'await-np-hello':
            case 'await-ep-hello':
                // Expect a `Handshake.HelloEnvelope`
                return this._handleHello(encrypted);
            case 'await-auth':
                // Expect a `Handshake.AuthEnvelope`
                return this._handleAuth(encrypted);
            default:
                return unreachable(this._state);
        }
    }

    /** @inheritdoc */
    public sendLocalPcmks(states: readonly ParticipantCallMediaKeyState[]): void {
        if (import.meta.env.VERBOSE_LOGGING.CALLS) {
            this._log.debug(`Queuing #${states.length} Rekeys to be sent once authenticated`);
        }
        this._queuedLocalPcmks.push(...states);
    }

    protected _handleHello(encrypted: Uint8Array): void {
        // Sanity-check
        assert(this._state === 'await-np-hello' || this._state === 'await-ep-hello');

        // Decrypt and decode
        const gchk = this._call.data.derivations.gchk;
        let envelope;
        try {
            const {plainData: decrypted} = gchk
                .decryptorWithNonceAhead(
                    CREATE_BUFFER_TOKEN,
                    ensureEncryptedDataWithNonceAhead(encrypted),
                )
                .decrypt(undefined);
            envelope = P2P_HANDSHAKE_HELLO_ENVELOPE_SCHEMA.parse(
                protobuf.groupcall.ParticipantToParticipant.Handshake.HelloEnvelope.decode(
                    decrypted,
                ),
            );
        } catch (error) {
            this._log.warn('Unable to decrypt or decode Handshake.HelloEnvelope', error);
            this.abort.raise({origin: 'remote', cause: 'protocol-error'});
            return;
        }
        if (import.meta.env.VERBOSE_LOGGING.CALLS) {
            this._log.debug('Received Handshake.*HelloEnvelope', envelope);
        }

        // Handle hello
        let pck, pcck;
        switch (envelope.content) {
            case 'hello': {
                const {identity} = envelope.hello;
                ({pck, pcck} = envelope.hello);

                // Check if the participant is a member of our group and get its public key.
                //
                // We need to backlog participants which are not a member of the group yet but
                // become a member of the group later at which point we answer the hello.
                const member = getGroupMember(
                    this._services,
                    this._call.data.group.get(),
                    identity,
                );
                if (member === undefined) {
                    this._log.warn(
                        `Backlogging remote participant '${identity}' which is not (yet) a member of our group`,
                    );
                    const unsubscribe = this._call.data.group.subscribe((group) => {
                        if (getGroupMember(this._services, group, identity) === undefined) {
                            return;
                        }

                        // Because this is a total edge case, we'll KISS and call this function
                        // again even though this means re-decrypting and re-decoding the hello.
                        unsubscribe();
                        this._handleHello(encrypted);
                    });
                    this.abort.subscribe(unsubscribe);
                    return;
                }

                // Ensure the participant is removed from the group call when it is removed from the
                // members list of the associated group.
                this.abort.subscribe(
                    this._call.data.group.subscribe(({controller}) => {
                        // Note: We don't need to check if the group has been removed as this is
                        // already done by tearing down the whole call in that case by
                        // `GroupCallManager`.
                        if (!controller.hasMember(member.contact)) {
                            this._log.info(
                                `Removing participant, remote identity '${identity}' is no longer a member of our group`,
                            );
                            this.abort.raise({origin: 'group', cause: 'member-removed'});
                        }
                    }),
                );

                // Set the participant contact information
                this._contact.set(member.contact);

                // Derive the client key shared key and derive GCNHAK.
                this._crypto.gcnhak.set(
                    deriveGroupCallNormalHandshakeAuthKey(
                        this._services,
                        this._services.device.csp.ck,
                        this._call.data.derivations.gckh,
                        member.publicKey,
                    ),
                );
                break;
            }
            case 'guestHello':
                // Not allowed in a group call
                this._log.warn('Guest handshake attempted which is not allowed in a group call');
                this.abort.raise({origin: 'remote', cause: 'protocol-error'});
                return;
            default:
                unreachable(envelope);
        }

        // Ensure the sender did not reflect our own PCK/PCCK combination (i.e.
        // reflected our own message).
        //
        // Roughly maps to step 4.1 but we always do this since we pregenerate
        // the local PCK and PCCK.
        if (byteEquals(pck, this._local.pck.public)) {
            this._log.warn('Remote claimed the public key associated to our local PCK');
            this.abort.raise({origin: 'remote', cause: 'protocol-error'});
            return;
        }
        if (byteEquals(pcck, this._crypto.local.pcck)) {
            this._log.warn('Remote claimed a PCCK identical to our local PCCK');
            this.abort.raise({origin: 'remote', cause: 'protocol-error'});
            return;
        }

        // Derive the PCK box from our local secret PCK and the remote public
        // PCK. Store the remote PCCK for subsequent encryption.
        this._crypto.remote.pcck.set(pcck);
        this._crypto.pck.set(this._local.pck.getSharedBox(pck, NONCE_UNGUARDED_SCOPE, undefined));

        // Check if we need to send a Hello message (step 3.1.)
        if (this._state === 'await-np-hello') {
            this._sendHello();
        }

        // Send an Auth message (steps 3.1 and 4.2)
        this._sendAuth(pck);
    }

    private _handleAuth(encrypted: Uint8Array): void {
        // Sanity-check (receive step 1)
        assert(this._state === 'await-auth');

        // Decrypt and decode
        let envelope;
        try {
            // Decrypt outer part (encrypt step 3)
            const {plainData: outerDecrypted} = this._crypto.pck
                .unwrap()
                .decryptorWithCspNonce(
                    CREATE_BUFFER_TOKEN,
                    this._crypto.remote.pcck.unwrap(),
                    this._crypto.remote.sn.next(),
                    tag<EncryptedData>(encrypted),
                )
                .decrypt(undefined);
            const innerEncryptedWithNonceAhead = ensureEncryptedDataWithNonceAhead(outerDecrypted);

            // Decrypt inner part (encrypt step 2) and
            const {plainData: innerDecrypted} = this._crypto.gcnhak
                .unwrap()
                .decryptorWithNonceAhead(CREATE_BUFFER_TOKEN, innerEncryptedWithNonceAhead)
                .decrypt(undefined);

            // Decode inner part (encrypt step 2)
            envelope = P2P_HANDSHAKE_AUTH_ENVELOPE_SCHEMA.parse(
                protobuf.groupcall.ParticipantToParticipant.Handshake.AuthEnvelope.decode(
                    innerDecrypted,
                ),
            );
        } catch (error) {
            this._log.warn('Unable to decrypt or decode Handshake.AuthEnvelope', error);
            this.abort.raise({origin: 'remote', cause: 'protocol-error'});
            return;
        }
        if (import.meta.env.VERBOSE_LOGGING.CALLS) {
            this._log.debug('Received Handshake.*AuthEnvelope', envelope);
        }

        // Ensure the correct variant is being provided (receive steps 1 and 2).
        if (envelope.content !== 'auth') {
            this._log.warn(
                `Remote sent us a different auth variant ('${envelope.content}') than was negotiated`,
            );
            this.abort.raise({origin: 'remote', cause: 'protocol-error'});
            return;
        }

        // Ensure the correct PCK and PCCK were used (receive steps 2 and 3)
        if (!byteEquals(envelope.auth.pck, this._local.pck.public)) {
            this._log.warn('Remote failed the auth challenge: Incorrect repeated PCK');
            this.abort.raise({origin: 'remote', cause: 'protocol-error'});
            return;
        }
        if (!byteEquals(envelope.auth.pcck, this._crypto.local.pcck)) {
            this._log.warn('Remote failed the auth challenge: Incorrect repeated PCCK');
            this.abort.raise({origin: 'remote', cause: 'protocol-error'});
            return;
        }

        // Signal that the participant was authenticated (receive step 4)
        this._log.info('Handshake complete!');
        this._call.authenticate(
            {
                pck: this._crypto.pck.unwrap(),
                local: this._crypto.local,
                remote: {
                    pcck: this._crypto.remote.pcck.unwrap(),
                    sn: this._crypto.remote.sn,
                },
            },
            {
                contact: this._contact.unwrap(),
                queuedLocalPcmks: this._queuedLocalPcmks,
                initialRemotePcmks: envelope.auth.mediaKeys,
            },
        );
    }

    private _sendHello(): void {
        // Sanity-check
        assert(this._state === 'await-np-hello' || this._state === 'await-ep-hello');

        // Encode
        const user = this._services.model.user;
        const hello = protobuf.utils.creator(
            protobuf.groupcall.ParticipantToParticipant.Handshake.Hello,
            {
                identity: user.identity,
                nickname: user.profileSettings.get().view.nickname,
                pck: this._local.pck.public as ReadonlyUint8Array as Uint8Array,
                pcck: this._crypto.local.pcck,
            },
        );
        const encoded = tag<PlainData>(
            protobuf.groupcall.ParticipantToParticipant.Handshake.HelloEnvelope.encode(
                protobuf.utils.creator(
                    protobuf.groupcall.ParticipantToParticipant.Handshake.HelloEnvelope,
                    {
                        padding: new Uint8Array(randomU8(this._services.crypto)),
                        hello,
                        guestHello: undefined,
                    },
                ),
            ).finish(),
        );

        // Encrypt
        const gchk = this._call.data.derivations.gchk;
        let encrypted;
        try {
            encrypted = gchk
                .encryptor(CREATE_BUFFER_TOKEN, encoded)
                .encryptWithRandomNonceAhead(undefined);
        } catch (error) {
            // Infallible
            this._log.error('Unable to encrypt Handshake.*Hello', error);
            this.abort.raise({origin: 'local', cause: 'unexpected-error'});
            throw error;
        }

        // Send
        if (import.meta.env.VERBOSE_LOGGING.CALLS) {
            this._log.debug('Sending Handshake.*Hello', hello);
        }
        this._call.sendP2p(this.id, [encrypted]);
    }

    private _sendAuth(pck: RemoteParticipantCallKey): void {
        // Sanity-check
        assert(this._state === 'await-np-hello' || this._state === 'await-ep-hello');

        // Encode
        const auth = protobuf.utils.creator(
            protobuf.groupcall.ParticipantToParticipant.Handshake.Auth,
            {
                pck: pck as ReadonlyUint8Array as Uint8Array,
                pcck: this._crypto.remote.pcck.unwrap() as ReadonlyUint8Array as Uint8Array,
                mediaKeys: this._local.pcmk.all().map((state) => ({
                    epoch: state.epoch,
                    ratchetCounter: state.ratchetCounter,
                    pcmk: state.pcmk.unwrap() as ReadonlyUint8Array as Uint8Array,
                })),
            },
        );
        const encoded = tag<PlainData>(
            protobuf.groupcall.ParticipantToParticipant.Handshake.AuthEnvelope.encode(
                protobuf.utils.creator(
                    protobuf.groupcall.ParticipantToParticipant.Handshake.AuthEnvelope,
                    {
                        padding: new Uint8Array(randomU8(this._services.crypto)),
                        auth,
                        guestAuth: undefined,
                    },
                ),
            ).finish(),
        );

        let encrypted;
        try {
            // Encrypt inner part (encrypt steps 1 and 2)
            const innerEncryptedWithNonceAhead = tag<PlainData>(
                this._crypto.gcnhak
                    .unwrap()
                    .encryptor(CREATE_BUFFER_TOKEN, encoded)
                    .encryptWithRandomNonceAhead(undefined),
            );

            // Encrypt outer part (encrypt step 3)
            encrypted = this._crypto.pck
                .unwrap()
                .encryptor(CREATE_BUFFER_TOKEN, innerEncryptedWithNonceAhead)
                .encryptWithCspNonce(this._crypto.local.pcck, this._crypto.local.sn.next());
        } catch (error) {
            // Infallible
            this._log.error('Unable to encrypt Handshake.*Auth', error);
            this.abort.raise({origin: 'local', cause: 'unexpected-error'});
            throw error;
        }

        // Send
        if (import.meta.env.VERBOSE_LOGGING.CALLS) {
            this._log.debug('Sending Handshake.*Auth', auth);
        }
        this._call.sendP2p(this.id, [encrypted]);

        // Update the handshake state (steps 3.2 and 4.3)
        this._state = 'await-auth';
    }
}

/** Current capture state of capturing devices. */
export interface CaptureState {
    readonly microphone: 'on' | 'off';
    readonly camera: 'on' | 'off';
}

/** State of the user. */
export interface LocalParticipantState {
    /** Assigned participant ID. */
    readonly id: ParticipantId;
    /** Current capture state of the user's capturing devices. */
    readonly capture: CaptureState;
}

/**
 * An (authenticated) remote participant present in the call.
 */
export interface RemoteParticipantState {
    /** Assigned participant ID. */
    readonly id: ParticipantId;

    /** IMPORTANT: A contact may be present more than once, including the user itself! */
    readonly contact: ModelStore<Contact> | 'me';

    /** Current capture state of the remote participant's capturing devices. */
    readonly capture: CaptureState;

    /** Subscriptions we currently have to the remote participant's capturing devices. */
    readonly subscriptions: {
        readonly microphone: 'subscribed' | 'unsubscribed';
        readonly camera:
            | {
                  readonly type: 'subscribed';
                  readonly resolution: Dimensions;
              }
            | {
                  readonly type: 'unsubscribed';
              };
    };
}

class AuthenticatedRemoteParticipant implements BaseRemoteParticipant<'done'> {
    public readonly authentication = 'done';
    private readonly _log: Logger;
    private readonly _state: WritableStore<RemoteParticipantState>;

    // WARNING: Only call this with `lock` acquired in 'incoming-p2s' context!
    public constructor(
        private readonly _services: Pick<ServicesForGroupCall, 'crypto' | 'endpoint' | 'logging'>,
        private readonly _call: AuthenticatedParticipantGroupCallHandle,
        public readonly id: ParticipantId,
        public readonly abort: AbortRaiser<RemoteParticipantRemoveEvent>,
        private readonly _crypto: RemoteParticipantCryptoContext,
        init: AuthenticatedRemoteParticipantInit,
    ) {
        assert(this._call.lock.context === 'incoming-p2s');
        this._log = _services.logging.logger(
            `group-call.${_call.data.derivations.callId.shortened}.remote.authenticated.${id}`,
        );

        // Set initial state
        this._state = new WritableStore<RemoteParticipantState>({
            id,
            contact: init.contact,
            capture: {
                microphone: 'off',
                camera: 'off',
            },
            subscriptions: {
                microphone: 'unsubscribed',
                camera: {
                    type: 'unsubscribed',
                },
            },
        });

        // Add initial remote PCMKs
        this._handleRemotePcmk(init.initialRemotePcmks);

        // Send new local PCMKs (if any and only those who haven't already been purged)
        this.sendLocalPcmks(init.queuedLocalPcmks.filter((state) => !state.pcmk.purged));

        // Send initial local capture states
        this.localCaptureState('microphone', init.localCaptureState.microphone);
        this.localCaptureState('camera', init.localCaptureState.camera);

        // Auto-subscribe remote microphone
        this.remoteMicrophone('subscribe');
    }

    public get state(): ReadableStore<RemoteParticipantState> {
        return this._state;
    }

    /** @inheritdoc */
    public handleP2p(encrypted: Uint8Array): void {
        // Decrypt and decode
        let envelope;
        try {
            const {plainData: decrypted} = this._crypto.pck
                .decryptorWithCspNonce(
                    CREATE_BUFFER_TOKEN,
                    this._crypto.remote.pcck,
                    this._crypto.remote.sn.next(),
                    tag<EncryptedData>(encrypted),
                )
                .decrypt(undefined);
            envelope = P2P_ENVELOPE_SCHEMA.parse(
                protobuf.groupcall.ParticipantToParticipant.Envelope.decode(decrypted),
            );
        } catch (error) {
            this._log.warn('Unable to decrypt or decode post-auth Envelope', error);
            this.abort.raise({origin: 'remote', cause: 'protocol-error'});
            return;
        }

        // Handle message
        switch (envelope.content) {
            case 'encryptedAdminEnvelope':
                // Ignored (for now))
                this._log.warn('Discarding unsupported encrypted admin envelope message');
                break;
            case 'rekey':
                if (import.meta.env.VERBOSE_LOGGING.CALLS) {
                    this._log.debug('Received Rekey', envelope.rekey);
                }
                this._handleRemotePcmk([envelope.rekey]);
                break;
            case 'captureState': {
                const {captureState} = envelope;
                this._state.update((current) => {
                    switch (captureState.state) {
                        case 'microphone':
                            if (captureState.microphone === undefined) {
                                return current;
                            }
                            return {
                                ...current,
                                capture: {
                                    ...current.capture,
                                    microphone: captureState.microphone,
                                },
                            };
                        case 'camera':
                            if (captureState.camera === undefined) {
                                return current;
                            }
                            return {
                                ...current,
                                capture: {
                                    ...current.capture,
                                    camera: captureState.camera,
                                },
                            };
                        case undefined:
                            return current;
                        default:
                            return unreachable(captureState);
                    }
                });
                break;
            }
            case 'holdState':
                // Ignored (for now)
                this._log.warn('Discarding unsupported hold state message');
                break;
            case undefined:
                this._log.warn('Discarding unknown P2P envelope variant');
                break;
            default:
                unreachable(envelope);
        }
    }

    /** @inheritdoc */
    public sendLocalPcmks(states: readonly ParticipantCallMediaKeyState[]): void {
        this._sendP2p(
            states.map((state) => {
                const rekey = protobuf.utils.creator(
                    protobuf.groupcall.ParticipantToParticipant.MediaKey,
                    {
                        epoch: state.epoch,
                        ratchetCounter: state.ratchetCounter,
                        pcmk: state.pcmk.unwrap() as ReadonlyUint8Array as Uint8Array,
                    },
                );
                if (import.meta.env.VERBOSE_LOGGING.CALLS) {
                    this._log.debug('Sending Rekey', rekey);
                }
                return {
                    ...createP2pEnvelopeFragment(this._services.crypto),
                    rekey,
                };
            }),
        );
    }

    /** Announce the current local capture state. */
    public localCaptureState(device: 'microphone' | 'camera', state: 'on' | 'off'): void {
        let captureState;
        switch (device) {
            case 'microphone':
                captureState = {
                    microphone: protobuf.utils.creator(
                        protobuf.groupcall.ParticipantToParticipant.CaptureState.Microphone,
                        {
                            on: state === 'on' ? protobuf.UNIT_MESSAGE : undefined,
                            off: state === 'off' ? protobuf.UNIT_MESSAGE : undefined,
                        },
                    ),
                    camera: undefined,
                };
                break;
            case 'camera':
                captureState = {
                    microphone: undefined,
                    camera: protobuf.utils.creator(
                        protobuf.groupcall.ParticipantToParticipant.CaptureState.Camera,
                        {
                            on: state === 'on' ? protobuf.UNIT_MESSAGE : undefined,
                            off: state === 'off' ? protobuf.UNIT_MESSAGE : undefined,
                        },
                    ),
                };
                break;
            default:
                unreachable(device);
        }
        if (import.meta.env.VERBOSE_LOGGING.CALLS) {
            this._log.debug('Sending CaptureState', captureState);
        }
        this._sendP2p([
            {
                ...createP2pEnvelopeFragment(this._services.crypto),
                captureState: protobuf.utils.creator(
                    protobuf.groupcall.ParticipantToParticipant.CaptureState,
                    captureState,
                ),
            },
        ]);
    }

    /** Subscribe to or unsubscribe from this participant's microphone stream. */
    public remoteMicrophone(intent: 'subscribe' | 'unsubscribe'): void {
        if (
            this._state.run(
                ({subscriptions: {microphone: state}}) =>
                    (intent === 'subscribe' && state === 'subscribed') ||
                    (intent === 'unsubscribe' && state === 'unsubscribed'),
            )
        ) {
            return;
        }
        let requestParticipantMicrophone: ProtobufInstanceOf<
            typeof protobuf.groupcall.ParticipantToSfu.ParticipantMicrophone
        >;
        switch (intent) {
            case 'subscribe':
                requestParticipantMicrophone = protobuf.utils.creator(
                    protobuf.groupcall.ParticipantToSfu.ParticipantMicrophone,
                    {
                        participantId: this.id,
                        subscribe: protobuf.utils.creator(
                            protobuf.groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe,
                            {},
                        ),
                        unsubscribe: undefined,
                    },
                );
                break;
            case 'unsubscribe':
                requestParticipantMicrophone = protobuf.utils.creator(
                    protobuf.groupcall.ParticipantToSfu.ParticipantMicrophone,
                    {
                        participantId: this.id,
                        subscribe: undefined,
                        unsubscribe: protobuf.utils.creator(
                            protobuf.groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe,
                            {},
                        ),
                    },
                );
                break;
            default:
                unreachable(intent);
        }
        if (import.meta.env.VERBOSE_LOGGING.CALLS) {
            this._log.debug('Sending ParticipantMicrophone', requestParticipantMicrophone);
        }
        this._call.sendP2s([
            {
                ...createP2sEnvelopeFragment(this._services.crypto),
                requestParticipantMicrophone,
            },
        ]);
        this._state.update((state) => ({
            ...state,
            subscriptions: {
                ...state.subscriptions,
                microphone: intent === 'subscribe' ? 'subscribed' : 'unsubscribed',
            },
        }));
    }

    /** Subscribe to or unsubscribe from this participant's camera stream. */
    public remoteCamera(
        intent:
            | {readonly type: 'unsubscribe'}
            | {readonly type: 'subscribe'; readonly resolution: Dimensions},
    ): void {
        if (
            this._state.run(
                ({subscriptions: {camera: state}}) =>
                    (intent.type === 'subscribe' &&
                        state.type === 'subscribed' &&
                        intent.resolution.width === state.resolution.width &&
                        intent.resolution.height === state.resolution.height) ||
                    (intent.type === 'unsubscribe' && state.type === 'unsubscribed'),
            )
        ) {
            return;
        }
        let requestParticipantCamera: ProtobufInstanceOf<
            typeof protobuf.groupcall.ParticipantToSfu.ParticipantCamera
        >;
        switch (intent.type) {
            case 'subscribe':
                this._log.debug(
                    `Subscribing camera: ${intent.resolution.width}x${intent.resolution.height}`,
                );
                requestParticipantCamera = protobuf.utils.creator(
                    protobuf.groupcall.ParticipantToSfu.ParticipantCamera,
                    {
                        participantId: this.id,
                        subscribe: protobuf.utils.creator(
                            protobuf.groupcall.ParticipantToSfu.ParticipantCamera.Subscribe,
                            {
                                desiredFps: 30,
                                desiredResolution: protobuf.utils.creator(
                                    protobuf.common.Resolution,
                                    intent.resolution,
                                ),
                            },
                        ),
                        unsubscribe: undefined,
                    },
                );
                break;
            case 'unsubscribe':
                this._log.debug('Unsubscribing camera');
                requestParticipantCamera = protobuf.utils.creator(
                    protobuf.groupcall.ParticipantToSfu.ParticipantCamera,
                    {
                        participantId: this.id,
                        subscribe: undefined,
                        unsubscribe: protobuf.utils.creator(
                            protobuf.groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe,
                            {},
                        ),
                    },
                );
                break;
            default:
                unreachable(intent);
        }
        if (import.meta.env.VERBOSE_LOGGING.CALLS) {
            this._log.debug('Sending ParticipantCamera', requestParticipantCamera);
        }
        this._call.sendP2s([
            {
                ...createP2sEnvelopeFragment(this._services.crypto),
                requestParticipantCamera,
            },
        ]);
        this._state.update((state) => ({
            ...state,
            subscriptions: {
                ...state.subscriptions,
                camera:
                    intent.type === 'subscribe'
                        ? {type: 'subscribed', resolution: intent.resolution}
                        : {type: 'unsubscribed'},
            },
        }));
    }

    private _handleRemotePcmk(states: readonly ParticipantCallMediaKeyState[]): void {
        this._call.mediaCryptoHandle.decryptor
            .addPcmks(
                this.id,
                states.map((state) => {
                    const pcmk = state.pcmk.unwrap();
                    return {
                        epoch: state.epoch,
                        ratchetCounter: state.ratchetCounter,
                        // Note: This effectively purges the PCMK from this endpoint
                        pcmk: this._services.endpoint.transfer(pcmk, [pcmk.buffer]),
                    };
                }),
            )
            .catch((error: unknown) => {
                if (this._call.abort.aborted) {
                    return;
                }
                this._log.error('Adding remote PCMKs failed', error);
                this._call.abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
            });
    }

    private _sendP2p(
        envelopes: readonly ProtobufInstanceOf<
            typeof protobuf.groupcall.ParticipantToParticipant.Envelope
        >[],
    ): void {
        // Encode and encrypt envelopes
        const encrypted = envelopes.map((envelope) => {
            // Encode
            const encoded = tag<PlainData>(
                protobuf.groupcall.ParticipantToParticipant.Envelope.encode(envelope).finish(),
            );

            // Encrypt
            try {
                return this._crypto.pck
                    .encryptor(CREATE_BUFFER_TOKEN, encoded)
                    .encryptWithCspNonce(this._crypto.local.pcck, this._crypto.local.sn.next());
            } catch (error) {
                // Infallible
                this._log.error('Unable to encrypt post-auth Envelope', error);
                this.abort.raise({origin: 'local', cause: 'unexpected-error'});
                throw error;
            }
        });

        // Send
        this._call.sendP2p(this.id, encrypted);
    }
}

type AnyRemoteParticipant = UnauthenticatedRemoteParticipant | AuthenticatedRemoteParticipant;

export interface OngoingGroupCallState {
    /** State of the user. */
    readonly local: LocalParticipantState;

    /**
     * A list of all (authenticated) remote participants present in the call.
     *
     * IMPORTANT: This may include contacts more than once, including the user itself!
     */
    readonly remote: readonly RemoteParticipantState[];
}

/**
 * A group call, controlling a remote {@link GroupCallContext} in order to maintain the group call
 * from the backend.
 */
export class GroupCall {
    public readonly state: IQueryableStore<OngoingGroupCallState>;
    private readonly _state: {
        readonly local: WritableStore<{
            readonly capture: CaptureState;
        }>;
        readonly remote: AsyncLock<
            LockContext,
            WritableStore<Map<ParticipantId, AnyRemoteParticipant>>
        >;
    };
    private _cancelSendStateUpdate: TimerCanceller | undefined;
    private _cancelLingeringLonerTimer: TimerCanceller | undefined;

    private constructor(
        private readonly _services: Pick<
            ServicesForGroupCall,
            'crypto' | 'device' | 'endpoint' | 'logging' | 'model'
        >,
        private readonly _abort: AbortRaiser<AnyGroupCallContextAbort>,
        private readonly _data: GroupCallBaseData,
        private readonly _log: Logger,
        endpoint: ProxyEndpoint<GroupCallConnectionHandle>,
        private readonly _connection: ConnectionContext,
        remote: AsyncLock<LockContext, WritableStore<Map<ParticipantId, AnyRemoteParticipant>>>,
        private readonly _local: LocalParticipant,
        nInitialParticipants: u53,
    ) {
        assert(remote.context === 'create');

        // Set initial internal state
        this._state = {
            local: new WritableStore<{
                readonly capture: CaptureState;
            }>({
                capture: {
                    // Auto-mute microphone at startup when remote participants are < 4.
                    microphone: nInitialParticipants < 4 ? 'on' : 'off',

                    // Always mute camera at startup.
                    camera: 'off',
                },
            }),
            remote,
        };

        // Continuously derive (external) state from the internal state
        {
            // Note: Unwrap is fine here as the `assert` at the beginning ensures we're in the
            // correct locking context.
            const participants = remote.unwrap();
            this.state = derive(
                [this._state.local, participants],
                ([{currentValue: local}, {currentValue: participants_}], getAndSubscribe) => ({
                    local: {id: _local.id, capture: local.capture},
                    remote: [...participants_.values()]
                        .map((participant) =>
                            participant.authentication === 'done'
                                ? getAndSubscribe(participant.state)
                                : undefined,
                        )
                        .filter(
                            (participant): participant is NonNullable<typeof participant> =>
                                participant !== undefined,
                        ),
                }),
                {subscriptionMode: 'persistent'},
            );
        }

        // Listen for communication from the group call context
        _services.endpoint.exposeProxy<GroupCallConnectionHandle>(
            {
                [TRANSFER_HANDLER]: PROXY_HANDLER,
                handleP2s: (array) => {
                    let envelope: S2pEnvelope;
                    try {
                        // Decode S2P envelope
                        envelope = S2P_ENVELOPE_SCHEMA.parse(
                            protobuf.groupcall.SfuToParticipant.Envelope.decode(array),
                        );
                    } catch (error) {
                        _log.warn('Discarding invalid SfuToParticipant envelope', error);
                        return;
                    }
                    this._state.remote
                        .with(
                            async (remote_) => await this._handleP2s(remote_, envelope),
                            'incoming-p2s',
                        )
                        .catch((error: unknown) => {
                            if (this._abort.aborted) {
                                return;
                            }
                            this._log.error('Handling P2S failed', error);
                            this._abort.raise({
                                origin: 'backend-worker',
                                cause: 'unexpected-error',
                            });
                        });
                },
                triggerIceRestart: () => {
                    this._state.remote
                        .with(async (remote_) => {
                            this._log.debug('Triggering ICE restart');
                            const answer = this._createNextSdpVersionRemoteSessionDescription(
                                remote_.get(),
                            );
                            await this._connection.context.restartIce(answer);
                        }, 'restart-ice')
                        .catch((error: unknown) => {
                            if (this._abort.aborted) {
                                return;
                            }
                            this._log.error('Restarting ice failed', error);
                            this._abort.raise({
                                origin: 'backend-worker',
                                cause: 'unexpected-error',
                            });
                        });
                },
            },
            endpoint,
            _services.logging.logger('com.bw.group-call-connection-handle'),
        );

        // Start sending state updates to the SFU and start the lingering loner timer, if necessary.
        // Stop sending state updates when aborting.
        //
        // Note: Unwrap is fine here as the `assert` at the beginning ensures we're in the correct
        // locking context.
        _abort.subscribe(() => this._cancelSendStateUpdate?.());
        if (nInitialParticipants === 0) {
            this._maybeSendStateUpdates(remote.unwrap());
            this._updateLingeringLonerTimer(0);
        }
    }

    /**
     * Establish a WebRTC connection to a group call and create a {@link GroupCall} instance from
     * it.
     */
    public static async create(
        services: Pick<
            ServicesForGroupCall,
            'crypto' | 'device' | 'endpoint' | 'logging' | 'model'
        >,
        abort: AbortRaiser<AnyGroupCallContextAbort>,
        data: GroupCallBaseData,
        context: RemoteProxy<GroupCallContext>,
        join: JoinResponse,
    ): Promise<GroupCall> {
        const log = services.logging.logger(`group-call.${data.derivations.callId.shortened}`);

        // Set up SDP state and create initial offer
        const sdp: SdpState = {
            static: {
                iceUsernameFragment: join.iceUsernameFragment,
                icePassword: join.icePassword,
                dtlsFingerprintHex: bytesToHex(join.dtlsFingerprint, ':'),
            },
            version: new SequenceNumberU53(0),
            mLineOrder: new Set<ParticipantId>([join.participantId]),
        };
        const offer = createRemoteSessionDescription({
            static: sdp.static,
            version: sdp.version.next(),
            mLineOrder: [...sdp.mLineOrder],
            local: join.participantId,
            remote: new Set(),
        });

        // Create initial PCMK for encrypting local streams
        const pcmk = new LocalParticipantCallMediaKey(services.crypto);
        assert(pcmk.pending === undefined, 'Expected no pending PCMK to exist');

        // Set up the peer connection, all necessary data channels and the media crypto worker.
        const endpoints = {
            connection: services.endpoint.createEndpointPair<GroupCallConnectionHandle>(),
            mediaCrypto: services.endpoint.createEndpointPair<MediaCryptoBackendHandle>(),
        };
        log.debug('Connecting');
        const s2pHello = await context.connect(
            data.derivations.gckh,
            join.participantId,
            offer,
            join.addresses.map(({port, ip}) => ({
                candidate: `candidate:${[
                    // Foundation is irrelevant because we bundle
                    0,
                    // Component ID is always RTP (1) because we bundle
                    1,
                    // Always UDP
                    'udp',
                    // IPv6 takes priority but we only expect one address
                    // for each family.
                    ip.includes(':') ? 2 : 1,
                    ip,
                    port,
                    'typ',
                    'host',
                ].join(' ')}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                sdpMLineIndex: 0, // Irrelevant because we bundle all MIDs
            })),
            services.endpoint.transfer(
                {
                    connection: endpoints.connection.remote,
                    mediaCrypto: endpoints.mediaCrypto.remote,
                },
                [endpoints.connection.remote, endpoints.mediaCrypto.remote],
            ),
            {
                epoch: pcmk.current.epoch,
                ratchetCounter: pcmk.current.ratchetCounter,
                pcmk: pcmk.current.pcmk.unwrap(),
            },
        );
        const connection: ConnectionContext = {
            context,
            sdp,
            mediaCryptoHandle: services.endpoint.wrap<MediaCryptoBackendHandle>(
                endpoints.mediaCrypto.local,
                services.logging.logger('com.bw.media-crypto-provider'),
            ),
        };
        log.debug('Connected');

        // Print call init in debug builds
        if (import.meta.env.VERBOSE_LOGGING.CALLS) {
            const group = data.group.get();
            const init = {
                type: 'group-call',
                protocolVersion: data.protocolVersion,
                group: {
                    creator: getIdentityString(services.device, group.view.creator),
                    id: u8aToBase64(u64ToBytesLe(group.view.groupId)),
                },
                members: [
                    // Note: It's impossible that the user is not an active member of the group at
                    // this point in time, so including the user explicitly here.
                    {
                        identity: services.device.identity.string,
                        publicKey: u8aToBase64(services.device.csp.ck.public),
                    },
                    [...group.view.members].map((contact) =>
                        contact.run(({view}) => ({
                            identity: view.identity,
                            publicKey: u8aToBase64(view.publicKey),
                        })),
                    ),
                ],
                gck: u8aToBase64(data.gck.unwrap()),
                sfuBaseUrl: data.sfuBaseUrl.raw,
            } as const;
            log.debug(`Call init: ${u8aToBase64(UTF8.encode(JSON.stringify(init)))}`);
        }

        // Create group call instance
        //
        // Note: We need to create the instance as early as possible after the call to
        // `context.connect` was successful as this binds the endpoint. If we don't do this, we
        // might produce deadlocks if the `GroupCallContext` contacts the backend but the backend
        // doesn't respond.
        //
        // We'll run the rest of the flow with the lock held to mitigate any races that might occur
        // if we'll receive a P2S message.
        const guardedRemote = new AsyncLock<
            LockContext,
            WritableStore<Map<ParticipantId, AnyRemoteParticipant>>
        >(new WritableStore<Map<ParticipantId, AnyRemoteParticipant>>(new Map()));
        return await guardedRemote.with(async (remote) => {
            // Create initial local participant by generating random PCK and PCMK.
            //
            // Note: We're using the same PCK towards multiple participants, which is fine because
            //       we use random cookies.
            const local: LocalParticipant = {
                id: join.participantId,
                pck: tag<LocalParticipantCallKey>(
                    new SharedBoxFactory<ParticipantCallBox>(
                        services.crypto,
                        wrapRawKey(
                            services.crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                            NACL_CONSTANTS.KEY_LENGTH,
                        ).asReadonly(),
                    ),
                ),
                pcmk,
            };

            // Create group call instance
            const call = new GroupCall(
                services,
                abort,
                data,
                log,
                endpoints.connection.local,
                connection,
                guardedRemote,
                local,
                s2pHello.participantIds.length,
            );

            // Add initial remote participants (if any)
            if (s2pHello.participantIds.length > 0) {
                log.debug(
                    `Adding initial participants '${s2pHello.participantIds.join(', ')}' to call`,
                );
                await call._update(remote, {
                    removed: new Map(),
                    added: new Map(
                        s2pHello.participantIds.map((participantId) => [
                            participantId,
                            {handshake: 'local-initiated'},
                        ]),
                    ),
                });
            }

            log.info('Established');
            return call;
        }, 'create');
    }

    /** Broadcast the current local capture state. */
    public localCaptureState(device: 'microphone' | 'camera', state: 'on' | 'off'): void {
        this._state.local.update((current) => ({
            capture: {
                microphone: device === 'microphone' ? state : current.capture.microphone,
                camera: device === 'camera' ? state : current.capture.camera,
            },
        }));
        this._broadcastToParticipants((participant) =>
            participant.localCaptureState(device, state),
        );
    }

    /** Subscribe to or unsubscribe from a participant's microphone stream. */
    public remoteMicrophone(
        participantId: ParticipantId,
        intent: 'subscribe' | 'unsubscribe',
    ): void {
        this._applyToParticipant(participantId, (participant) =>
            participant?.remoteMicrophone(intent),
        );
    }

    /** Subscribe to or unsubscribe from a participant's camera stream. */
    public remoteCamera(
        participantId: ParticipantId,
        intent:
            | {readonly type: 'unsubscribe'}
            | {readonly type: 'subscribe'; readonly resolution: Dimensions},
    ): void {
        this._applyToParticipant(participantId, (participant) => participant?.remoteCamera(intent));
    }

    private async _handleP2s(
        remote: WritableStore<Map<ParticipantId, AnyRemoteParticipant>>,
        envelope: S2pEnvelope,
    ): Promise<void> {
        assert(this._state.remote.context === 'incoming-p2s');
        switch (envelope.content) {
            case 'relay': {
                if (envelope.relay.receiver !== this._local.id) {
                    this._log.warn(
                        `Discarding P2P message due to receiver mismatch, got '${envelope.relay.receiver}'`,
                    );
                    return;
                }
                const participant = remote.get().get(envelope.relay.sender);
                if (participant === undefined) {
                    this._log.warn(
                        `Discarding P2P message from unknown sender '${envelope.relay.sender}'`,
                    );
                    return;
                }
                try {
                    participant.handleP2p(envelope.relay.encryptedData);
                } catch (error) {
                    this._log.error('Handling P2P message failed', error);
                    this._abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
                }
                return;
            }
            case 'participantJoined':
                try {
                    await this._handleParticipantJoined(
                        remote,
                        envelope.participantJoined.participantId,
                    );
                } catch (error) {
                    this._log.error(
                        `Adding participant '${envelope.participantJoined.participantId}' to call failed`,
                        error,
                    );
                    this._abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
                }
                return;
            case 'participantLeft':
                try {
                    await this._handleParticipantLeft(
                        remote,
                        envelope.participantLeft.participantId,
                    );
                } catch (error) {
                    this._log.error(
                        `Removing participant '${envelope.participantLeft.participantId}' from call failed`,
                        error,
                    );
                    this._abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
                }
                return;
            case 'hello':
                this._log.warn('Discarding repeated SfuToParticipant.Hello', envelope.hello);
                return;
            case undefined:
                this._log.warn('Discarding unknown P2S envelope variant');
                return;
            default:
                unreachable(envelope);
        }
    }

    private async _handleParticipantJoined(
        remote: WritableStore<Map<ParticipantId, AnyRemoteParticipant>>,
        participantId: ParticipantId,
    ): Promise<void> {
        assert(this._state.remote.context === 'incoming-p2s');

        // Discard if already added
        if (remote.get().has(participantId)) {
            this._log.warn(
                `Discarding added participant '${participantId}' that was already added`,
            );
            return;
        }

        // Update PCMK (for outbound media frames) with a new ratchet round and apply it
        // immediately.
        //
        // IMPORTANT: The surrounding async lock ensures that we cannot race with other add/remove
        // calls.
        this._increaseRatchetCounter();

        // Add participant
        this._log.debug(`Adding participant '${participantId}' to call`);
        await this._update(remote, {
            removed: new Map(),
            added: new Map([[participantId, {handshake: 'remote-initiated'}]]),
        });
        assert(remote.get().has(participantId));

        // Stop the lingering loner timer, if any
        this._updateLingeringLonerTimer(remote.get().size);
    }

    private async _handleParticipantLeft(
        remote: WritableStore<Map<ParticipantId, AnyRemoteParticipant>>,
        participantId: ParticipantId,
    ): Promise<void> {
        assert(this._state.remote.context === 'incoming-p2s');

        // Discard if already removed
        const participant = remote.get().get(participantId);
        if (participant === undefined) {
            this._log.warn(
                `Discarding removed participant '${participantId}' that was already removed`,
            );
            return;
        }

        // Remove the participant
        await this._removeParticipant(remote, participantId, {origin: 'sfu', cause: 'left'});
    }

    // WARNING: The provided participant must exist in the map of remote participants!
    private async _removeParticipant(
        remote: WritableStore<Map<ParticipantId, AnyRemoteParticipant>>,
        participantId: ParticipantId,
        event: RemoteParticipantRemoveEvent,
    ): Promise<void> {
        // Remove participant
        this._log.debug(
            `Removing participant '${participantId}' from call (origin=${event.origin}, cause=${event.cause})`,
        );
        await this._update(remote, {
            removed: new Map([[participantId, {event}]]),
            added: new Map(),
        });
        assert(!remote.get().has(participantId));

        // Start the process of replacing the PCMK (for outbound media frames) with a new epoch and
        // random PCMK.
        //
        // IMPORTANT: The surrounding async lock ensures that we cannot race with other add/remove
        // calls.
        this._increaseEpoch(remote);

        // Send state updates to the SFU, if designated, and start the lingering loner timer, if
        // necessary.
        this._maybeSendStateUpdates(remote);
        this._updateLingeringLonerTimer(remote.get().size);
    }

    /**
     * Add or remove participants from the WebRTC context, i.e. do the silly offer/answer dance (for
     * no reason but to satisfy the ego of Cisco and some other arcane SDP wizards out there) and
     * add/remove transceivers.
     *
     * WARNING: The _removed_ participants **must exist** in the map of remote participants! The
     * _added_ participants **must not exist** in the map of remote participants!
     */
    private async _update(
        remoteStore: WritableStore<Map<ParticipantId, AnyRemoteParticipant>>,
        change: {
            readonly removed: ReadonlyMap<
                ParticipantId,
                {readonly event: RemoteParticipantRemoveEvent}
            >;
            readonly added: ReadonlyMap<
                ParticipantId,
                {readonly handshake: 'local-initiated' | 'remote-initiated'}
            >;
        },
    ): Promise<void> {
        assert(this._state.remote.context !== undefined);

        // Work on a copy of the remote participants map. We'll propagate it further down.
        //
        // Note: We can't use `.update` because there are `await` calls in between. But the lock
        // guards us from other write accesses.
        const remote = new Map(remoteStore.get());

        // Remove participants to be removed
        for (const [participantId, {event}] of change.removed) {
            // Remove first, then abort to prevent a double-update!
            const participant = unwrap(
                remote.get(participantId),
                `Expected participant '${participantId}' to be removed to exist`,
            );
            assert(remote.delete(participantId));
            participant.abort.raise(event);

            // Remove participant from the decryptor
            await this._connection.mediaCryptoHandle.decryptor.remove(participantId);
        }

        // Add participants to be added
        for (const [participantId, {handshake}] of change.added) {
            // Remove the participant from the group call when it is aborted
            assert(
                !remote.has(participantId),
                `Expected participant '${participantId}' to be added to not exist`,
            );
            const abort = new AbortRaiser<RemoteParticipantRemoveEvent>();
            this._abort.subscribe(
                abort.subscribe((event) => {
                    // Remove participant when the associated abort is raised
                    this._state.remote
                        .with(async (remote_) => {
                            // Check if already removed. This happens e.g. when the SFU notifies that the
                            // participant has left which first removes the participant and then raises the
                            // abort event.
                            if (!remote_.get().has(participantId)) {
                                return;
                            }
                            await this._removeParticipant(remote_, participantId, event);
                        }, 'abort-participant')
                        .catch((error: unknown) => {
                            if (this._abort.aborted) {
                                return;
                            }
                            this._log.error('Removing participant failed', error);
                            this._abort.raise({
                                origin: 'backend-worker',
                                cause: 'unexpected-error',
                            });
                        });
                }),
            );

            // Create new remote participant
            const participant = new UnauthenticatedRemoteParticipant(
                this._services,
                this._local,
                {
                    abort: this._abort,
                    data: this._data,
                    lock: this._state.remote,
                    sendP2p: this._sendP2p.bind(this),
                    authenticate: (crypto, init) => {
                        // Note: The caller does not have access to the guarded store, so we'll need
                        // to unwrap it. This is safe because the `assert` ensures we're in the
                        // correct locking context.
                        assert(this._state.remote.context === 'incoming-p2s');
                        const remote_ = this._state.remote.unwrap();
                        remote_.update((participants) => {
                            // Create a new _authenticated_ participant to replace the current instance
                            // with.
                            const authenticated = new AuthenticatedRemoteParticipant(
                                this._services,
                                {
                                    abort: this._abort,
                                    data: this._data,
                                    lock: this._state.remote,
                                    mediaCryptoHandle: this._connection.mediaCryptoHandle,
                                    sendP2s: this._sendP2s.bind(this),
                                    sendP2p: this._sendP2p.bind(this),
                                },
                                participantId,
                                abort,
                                crypto,
                                {...init, localCaptureState: this._state.local.get().capture},
                            );
                            participants.set(participantId, authenticated);
                            return participants;
                        });

                        // Send state updates to the SFU, if designated
                        this._maybeSendStateUpdates(remote_);
                    },
                },
                participantId,
                handshake,
                abort,
            );
            remote.set(participantId, participant);

            // Insert into SDP m-line order
            this._connection.sdp.mLineOrder.add(participantId);
        }

        // At this point we can propagate the remote participants update. The rest is WebRTC
        // shenanigans.
        remoteStore.update(() => remote);

        // Create offer
        const offer = this._createNextSdpVersionRemoteSessionDescription(remote);

        // Wait for the update to be applied
        await this._connection.context.update(offer, this._connection.sdp.mLineOrder, {
            added: new Set(change.added.keys()),
            removed: new Set(change.removed.keys()),
        });
    }

    private _createNextSdpVersionRemoteSessionDescription(
        remote: Map<ParticipantId, AnyRemoteParticipant>,
    ): string {
        assert(this._state.remote.context !== undefined);

        return createRemoteSessionDescription({
            static: this._connection.sdp.static,
            version: this._connection.sdp.version.next(),
            mLineOrder: [...this._connection.sdp.mLineOrder],
            local: this._local.id,
            remote: new Set(remote.keys()),
        });
    }

    private _applyToParticipant(
        participantId: ParticipantId,
        executor: (participant: AuthenticatedRemoteParticipant | undefined) => void,
    ): void {
        this._state.remote
            .with((remote) => {
                const participant = remote.get().get(participantId);
                if (participant?.authentication !== 'done') {
                    return executor(undefined);
                }
                return executor(participant);
            }, 'apply-to-participant')
            .catch((error: unknown) => {
                if (this._abort.aborted) {
                    return;
                }
                this._log.error('Apply for participant failed', error);
                this._abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
            });
    }

    private _broadcastToParticipants(
        executor: (participant: AuthenticatedRemoteParticipant) => void,
    ): void {
        this._state.remote
            .with((remote) => {
                for (const participant of remote.get().values()) {
                    if (participant.authentication !== 'done') {
                        continue;
                    }
                    executor(participant);
                }
            }, 'broadcast-to-participants')
            .catch((error: unknown) => {
                if (this._abort.aborted) {
                    return;
                }
                this._log.error('Broadcasting failed', error);
                this._abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
            });
    }

    private _sendP2p(
        participantId: ParticipantId,
        encryptedItems: readonly (EncryptedDataWithNonceAhead | EncryptedData)[],
    ): void {
        this._sendP2s(
            encryptedItems.map((encrypted) => ({
                ...createP2sEnvelopeFragment('no-padding'), // No padding for relay messages!
                relay: protobuf.utils.creator(
                    protobuf.groupcall.ParticipantToParticipant.OuterEnvelope,
                    {
                        sender: this._local.id,
                        receiver: participantId,
                        encryptedData: encrypted,
                    },
                ),
            })),
        );
    }

    private _sendP2s(
        envelopes: readonly ProtobufInstanceOf<
            typeof protobuf.groupcall.ParticipantToSfu.Envelope
        >[],
    ): void {
        this._connection.context
            .sendP2s(
                envelopes.map((envelope) => {
                    const encoded =
                        protobuf.groupcall.ParticipantToSfu.Envelope.encode(envelope).finish();
                    return this._services.endpoint.transfer(encoded, [encoded.buffer]);
                }),
            )
            .catch((error: unknown) => {
                if (this._abort.aborted) {
                    return;
                }
                this._log.error('Sending P2S failed', error);
                this._abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
            });
    }

    private _increaseEpoch(remote: WritableStore<Map<ParticipantId, AnyRemoteParticipant>>): void {
        assert(this._state.remote.context !== undefined);

        // Start the process of replacing the PCMK (for outbound media frames) with a new epoch and
        // random PCMK.
        const currentEpoch = this._local.pcmk.current.epoch;
        const pending = this._local.pcmk.nextEpoch();
        if (pending.stale) {
            // The pending PCMK is marked _stale_. A subsequent call to this function will be made
            // when the timer fires (further below) that applies the pending PCMK, so there's
            // nothing to do.
            if (import.meta.env.VERBOSE_LOGGING.CALLS) {
                this._log.debug(
                    `Pending PCMK now marked as stale (epoch ${currentEpoch} -> ${pending.state.epoch})`,
                );
            }
            return;
        }
        if (import.meta.env.VERBOSE_LOGGING.CALLS) {
            this._log.debug(`Replacing PCMK (epoch ${currentEpoch} -> ${pending.state.epoch})`);
        }

        // Distribute the new PCMK to all (remaining) participants
        for (const participant of remote.get().values()) {
            participant.sendLocalPcmks([pending.state]);
        }

        // Delay applying the PCMK by 2s to hopefully prevent our media frames from being dropped
        // when another participant receives it because the keys had not yet been received.
        TIMER.timeout(() => {
            // Do nothing if aborted
            if (this._abort.aborted) {
                return;
            }

            // Apply it
            try {
                this._connection.mediaCryptoHandle.encryptor
                    .setPcmk({
                        epoch: pending.state.epoch,
                        ratchetCounter: pending.state.ratchetCounter,
                        pcmk: pending.state.pcmk.unwrap(),
                    })
                    .catch((error: unknown) => {
                        this._log.error('Replacing local PCMK failed', error);
                        this._abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
                    });
                pending.applied();
                if (import.meta.env.VERBOSE_LOGGING.CALLS) {
                    this._log.debug(
                        `PCMK was replaced (epoch ${currentEpoch} -> ${pending.state.epoch})`,
                    );
                }

                // If it was marked as _stale_, rerun the whole process.
                if (pending.stale) {
                    if (import.meta.env.VERBOSE_LOGGING.CALLS) {
                        this._log.debug('Replaced PCMK was stale, rerunning the process');
                    }
                    this._state.remote
                        .with((remote_) => this._increaseEpoch(remote_), 'increase-epoch-stale')
                        .catch((error: unknown) => {
                            this._log.error('Increasing epoch failed', error);
                            this._abort.raise({
                                origin: 'backend-worker',
                                cause: 'unexpected-error',
                            });
                        });
                }
            } catch (error) {
                this._log.error('Applying PCMK failed', error);
                this._abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
            }
        }, 2_000);
    }

    private _increaseRatchetCounter(): void {
        // Update PCMK (for outbound media frames) with a new ratchet round and apply it
        // immediately.
        //
        // Note: The other participants will automatically notice since the ratchet counter is sent
        // with each media frame.
        const previousRatchetCounter = this._local.pcmk.current.ratchetCounter;
        const state = this._local.pcmk.nextRatchetCounter();
        this._log.debug(
            `Applied PCMK ratchet (ratchet counter ${previousRatchetCounter} -> ${state.ratchetCounter})`,
        );
        this._connection.mediaCryptoHandle.encryptor
            .setPcmk({
                epoch: state.epoch,
                ratchetCounter: state.ratchetCounter,
                pcmk: state.pcmk.unwrap(),
            })
            .catch((error: unknown) => {
                if (this._abort.aborted) {
                    return;
                }
                this._log.error('Updating local PCMK failed', error);
                this._abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
            });
    }

    private _maybeSendStateUpdates(
        remote: ReadableStore<Map<ParticipantId, AnyRemoteParticipant>>,
    ): void {
        const authenticated = [...remote.get().values()].filter(
            (participant): participant is AuthenticatedRemoteParticipant =>
                participant.authentication === 'done',
        );

        // Only the participant with the lowest ID should send state updates to the SFU
        this._cancelSendStateUpdate?.();
        if (this._local.id > Math.min(...authenticated.map((participant) => participant.id))) {
            if (this._cancelSendStateUpdate !== undefined) {
                this._log.debug('No longer responsible for sending state updates to the SFU');
            }
            this._cancelSendStateUpdate = undefined;
            return;
        }
        if (this._cancelSendStateUpdate === undefined) {
            this._log.debug('Now responsible for sending state updates to the SFU');
        }

        // Send state updates to the SFU now and every 10s
        this._cancelSendStateUpdate = TIMER.repeat(
            () => {
                // Encode
                const participants = protobuf.utils.creatorForMap(
                    protobuf.groupcall.CallState.Participant,
                    [
                        [
                            this._local.id.toString(),
                            protobuf.utils.creator(protobuf.groupcall.CallState.Participant, {
                                threema: protobuf.utils.creator(
                                    protobuf.groupcall.CallState.Participant.Normal,
                                    {
                                        identity: this._services.device.identity.string,
                                        nickname:
                                            this._services.model.user.profileSettings.get().view
                                                .nickname,
                                    },
                                ),
                                guest: undefined,
                            }),
                        ],
                        ...authenticated.map(
                            (
                                participant,
                            ): [
                                string,
                                protobuf.utils.ProtobufInstanceOf<
                                    typeof protobuf.groupcall.CallState.Participant
                                >,
                            ] => [
                                participant.id.toString(),
                                protobuf.utils.creator(protobuf.groupcall.CallState.Participant, {
                                    threema: protobuf.utils.creator(
                                        protobuf.groupcall.CallState.Participant.Normal,
                                        participant.state.run(({contact}) =>
                                            contact === 'me'
                                                ? {
                                                      identity:
                                                          this._services.device.identity.string,
                                                      nickname:
                                                          this._services.model.user.profileSettings.get()
                                                              .view.nickname,
                                                  }
                                                : contact.run(({view: {identity, nickname}}) => ({
                                                      identity,
                                                      nickname,
                                                  })),
                                        ),
                                    ),
                                    guest: undefined,
                                }),
                            ],
                        ),
                    ],
                );
                const callState = protobuf.utils.creator(protobuf.groupcall.CallState, {
                    padding: new Uint8Array(randomU8(this._services.crypto)),
                    stateCreatedBy: this._local.id,
                    stateCreatedAt: intoUnsignedLong(dateToUnixTimestampMs(new Date())),
                    participants,
                });
                const encoded = tag<PlainData>(
                    protobuf.groupcall.CallState.encode(callState).finish(),
                );

                // Encrypt
                const encrypted = this._data.derivations.gcsk
                    .encryptor(CREATE_BUFFER_TOKEN, encoded)
                    .encryptWithRandomNonceAhead(undefined);

                // Send
                if (import.meta.env.VERBOSE_LOGGING.CALLS) {
                    this._log.debug('Sending UpdateCallState', callState);
                }
                this._sendP2s([
                    {
                        ...createP2sEnvelopeFragment(this._services.crypto),
                        updateCallState: protobuf.utils.creator(
                            protobuf.groupcall.ParticipantToSfu.UpdateCallState,
                            {encryptedCallState: encrypted},
                        ),
                    },
                ]);
            },
            10_000,
            'now',
        );
    }

    private _updateLingeringLonerTimer(nRemoteParticipants: u53): void {
        if (nRemoteParticipants > 0) {
            this._cancelLingeringLonerTimer?.();
            this._cancelLingeringLonerTimer = undefined;
            return;
        }

        // Leave the group call after 3m of alone time.
        //
        // Note: We cannot distinguish intentional disconnects by the SFU (the 5m loner timeout)
        // from other disconnect events. To prevent bad UX (the UI reporting a disconnect), we'll
        // leave early ourselves.
        if (this._cancelLingeringLonerTimer === undefined) {
            this._cancelLingeringLonerTimer = TIMER.timeout(
                () =>
                    this._abort.raise({
                        origin: 'backend-worker',
                        cause: 'disconnected-due-to-inactivity',
                    }),
                180_000,
            );
        }
    }
}

/**
 * An interface for the main thread to send updates of the connection and the associated data
 * channels after having been connected via a {@link GroupCallContext.connect} call.
 */
export interface GroupCallConnectionHandle extends ProxyMarked {
    readonly handleP2s: (array: Uint8Array) => void;
    readonly triggerIceRestart: () => void;
}

/**
 * High-level helper context to create group call related WebRTC items that can only be done in the
 * main thread. It is exposed to the backend worker as a {@link Remote}.
 *
 * WARNING: This is a tightly coupled state machine with many assumptions on internal state driven
 * from the remote {@link GroupCallManager} and the {@link GroupCall}.
 */
export interface GroupCallContext extends ProxyMarked {
    readonly abort: AbortListener<AnyGroupCallContextAbort>;
    readonly certificate: () => Promise<DtlsFingerprint>;
    readonly connect: (
        gckh: RawGroupCallKeyHash,
        local: ParticipantId,
        offerSdp: string,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        iceCandidates: readonly {readonly candidate: string; readonly sdpMLineIndex: u53}[],
        endpoints: {
            readonly connection: ProxyEndpoint<GroupCallConnectionHandle>;
            readonly mediaCrypto: ProxyEndpoint<MediaCryptoBackendHandle>;
        },
        initialLocalPcmk: RawParticipantCallMediaKeyState,
    ) => Promise<S2pHello>;
    readonly sendP2s: (arrays: readonly Uint8Array[]) => void;
    readonly restartIce: (answerSdp: string) => Promise<void>;
    readonly update: (
        offerSdp: string,
        all: Set<ParticipantId>,
        change: {
            readonly removed: ReadonlySet<ParticipantId>;
            readonly added: ReadonlySet<ParticipantId>;
        },
    ) => Promise<void>;
}
