import * as v from '@badrap/valita';

import {deriveKey} from '~/common/crypto/blake2b';
import {PERSONALBYTES} from '~/common/crypto/blake2b/implementation';
import {
    alignMediaKeyStateWith,
    ensureMediaKeySuccessorState,
    ensureRawGroupCallKeyHash,
    type MediaCryptoHandleForBackend,
    type ParticipantCallMediaKeyState,
    type RawGroupCallKeyHash,
} from '~/common/crypto/group-call';
import {ensureEndpoint} from '~/common/dom/utils/endpoint';
import type {GroupCallIdValue, ParticipantId} from '~/common/network/protocol/call/group-call';
import {ensureU8, tag, type ReadonlyUint8Array, type WeakOpaque, type u8} from '~/common/types';
import {UTF8} from '~/common/utils/codec';
import type {ProxyMarked} from '~/common/utils/endpoint';
import {instanceOf} from '~/common/utils/valita-helpers';

export const MEDIA_CRYPTO_INIT_SCHEMA = v.object({
    backendEndpoint: instanceOf(MessagePort).map((endpoint) =>
        ensureEndpoint<MediaCryptoHandleForBackend>(endpoint),
    ),
    callId: v.object({
        bytes: instanceOf(Uint8Array).map((bytes) => bytes as ReadonlyUint8Array),
        id: v.string().map((id) => tag<GroupCallIdValue>(id)),
        shortened: v.string(),
    }),
    gckh: instanceOf(Uint8Array).map(ensureRawGroupCallKeyHash),
    initialLocalPcmk: v.object({
        epoch: v.number().map(ensureU8),
        ratchetCounter: v.number().map(ensureU8),
        pcmk: instanceOf(Uint8Array),
    }),
});
export type MediaCryptoInit = Readonly<v.Infer<typeof MEDIA_CRYPTO_INIT_SCHEMA>>;

/**
 * An imported Participant Call Media Frame Key (PCMFK) (bytes). Must be exactly
 * 32 bytes long.
 */
export type ImportedParticipantCallMediaFrameKey = WeakOpaque<
    CryptoKey,
    {readonly ImportedParticipantCallMediaFrameKey: unique symbol}
>;

const PERSONAL = UTF8.encodeFullyInto('3ma-call', new Uint8Array(PERSONALBYTES)).array;
const PCMFK_SALT = UTF8.encodeFullyInto('mf', new Uint8Array(PERSONALBYTES)).array;

/**
 * Manages a PCMK. Allows to ratchet the PCMK as well as lazily derive a PCMFK
 * from the current PCMK. The PCMK epoch can also be replaced by a subsequent
 * epoch.
 *
 * Note: The lazy derivation does not exist for performance reason but because
 * the PCMFK must be imported with an async call. And async calls in synchronous
 * code suck.
 */
export class WorkerParticipantCallMediaKey {
    #_state: {
        readonly state: ParticipantCallMediaKeyState;
        pcmfk: Promise<ImportedParticipantCallMediaFrameKey> | undefined;
    };

    public constructor(
        private readonly _gckh: RawGroupCallKeyHash,
        source: ParticipantCallMediaKeyState,
    ) {
        this.#_state = {state: source, pcmfk: undefined};
    }

    public get state(): ParticipantCallMediaKeyState {
        return this.#_state.state;
    }

    public update(successor: ParticipantCallMediaKeyState): this {
        this.#_state = {
            state: ensureMediaKeySuccessorState(this.#_state.state, successor),
            pcmfk: undefined,
        };
        return this;
    }

    public alignWith(ratchetCounter: u8): this | undefined {
        const current = this.#_state.state;

        // Same ratchet counter: No-op.
        if (current.ratchetCounter === ratchetCounter) {
            return this;
        }

        // Old ratchet counter: Discard.
        if (ratchetCounter < current.ratchetCounter) {
            return undefined;
        }

        // Newer ratchet counter: Apply the ratchet until the counter matches.
        this.#_state = {state: alignMediaKeyStateWith(current, ratchetCounter), pcmfk: undefined};
        return this;
    }

    public async pcmfk(
        usage: 'encrypt' | 'decrypt',
    ): Promise<ImportedParticipantCallMediaFrameKey> {
        let raw;
        const state = this.#_state;
        if (state.pcmfk === undefined) {
            // PCMFK = BLAKE2b(key=PCMK, salt='mf', personal='3ma-call', input=GCKH)
            raw = deriveKey(32, state.state.pcmk.asReadonly(), {
                personal: PERSONAL,
                salt: PCMFK_SALT,
                input: this._gckh,
            });
            state.pcmfk = self.crypto.subtle.importKey(
                'raw',
                raw.unwrap(),
                {name: 'AES-GCM', length: 32},
                false,
                [usage],
            ) as Promise<ImportedParticipantCallMediaFrameKey>;
        }

        // IMPORTANT: Critical section over, async is now allowed!
        const pcmfk = await state.pcmfk;
        raw?.purge();
        return pcmfk;
    }
}

export type AnyEncodedFrame = RTCEncodedAudioFrame | RTCEncodedVideoFrame;

export type MediaStreamPayloadCodec = 'opus' | 'vp8';

export interface MediaCryptoWorkerStream {
    readonly mid: string;
    readonly codec: MediaStreamPayloadCodec;
    readonly pair: {
        readonly readable: ReadableStream<AnyEncodedFrame>;
        readonly writable: WritableStream<AnyEncodedFrame>;
    };
}

export type MediaCryptoEncryptorMainThreadHandle = ProxyMarked & {
    /** Add stream to the local encryptor context. */
    readonly addStream: (stream: MediaCryptoWorkerStream) => void;
};

export type MediaCryptoDecryptorMainThreadHandle = ProxyMarked & {
    /**
     * Add stream to the remote participant decryptor context.
     *
     * Note: Implicitly adds the remote participant if needed.
     */
    readonly addStream: (participant: ParticipantId, stream: MediaCryptoWorkerStream) => void;
};

export interface MediaCryptoMainThreadHandle extends ProxyMarked {
    readonly encryptor: MediaCryptoEncryptorMainThreadHandle;
    readonly decryptor: MediaCryptoDecryptorMainThreadHandle;
}
