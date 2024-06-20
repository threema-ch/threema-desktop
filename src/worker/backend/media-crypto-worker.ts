import type * as v from '@badrap/valita';

import {wrapRawKey} from '~/common/crypto';
import {
    PCMK_LENGTH,
    type MediaCryptoDecryptorBackendHandle,
    type MediaCryptoEncryptorBackendHandle,
    type MediaCryptoHandleForBackend,
    type ParticipantCallMediaKeyState,
    type RawGroupCallKeyHash,
    type RawParticipantCallMediaKey,
    type RawParticipantCallMediaKeyState,
} from '~/common/crypto/group-call';
import {
    type MediaCryptoWorkerStream,
    type MediaCryptoEncryptorMainThreadHandle,
    type MediaCryptoDecryptorMainThreadHandle,
    type MediaCryptoMainThreadHandle,
    MEDIA_CRYPTO_INIT_SCHEMA,
    type AnyEncodedFrame,
    type MediaStreamPayloadCodec,
    WorkerParticipantCallMediaKey,
    type ImportedParticipantCallMediaFrameKey,
} from '~/common/dom/crypto/group-call';
import {createEndpointService, ensureEndpoint} from '~/common/dom/utils/endpoint';
import {extractErrorTraceback} from '~/common/error';
import {TRANSFER_HANDLER} from '~/common/index';
import {
    CONSOLE_LOGGER,
    TagLogger,
    createLoggerStyle,
    type Logger,
    type LoggerFactory,
} from '~/common/logging';
import type {ParticipantId} from '~/common/network/protocol/call/group-call';
import {type u8, type u32, tag} from '~/common/types';
import {
    assert,
    assertUnreachable,
    ensureError,
    setAssertFailLogger,
    unreachable,
} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {PROXY_HANDLER, type EndpointService} from '~/common/utils/endpoint';
import {AsyncLock} from '~/common/utils/lock';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {SequenceNumberU32} from '~/common/utils/sequence-number';
import {type AbortListener, AbortRaiser} from '~/common/utils/signal';

interface ServicesForMediaCryptoWorker {
    readonly endpoint: EndpointService;
    readonly logging: LoggerFactory;
}

declare const self: DedicatedWorkerGlobalScope;

const MEDIA_CRYPTO_INIT_INTERNAL = MEDIA_CRYPTO_INIT_SCHEMA.map((init) => ({
    backendEndpoint: init.backendEndpoint,
    callId: init.callId,
    gckh: init.gckh,
    initialLocalPcmk: {
        ...init.initialLocalPcmk,
        pcmk: tag<RawParticipantCallMediaKey>(
            wrapRawKey<typeof PCMK_LENGTH>(init.initialLocalPcmk.pcmk, PCMK_LENGTH),
        ),
    },
}));
const MAX_ENCRYPTED_FRAME_LENGTH = 131072;
const MAX_UNENCRYPTED_FRAME_LENGTH = MAX_ENCRYPTED_FRAME_LENGTH - 16 - 6;
const ZERO_BYTES = new Uint8Array(0);

/** Handle critical failures */
const closed = new ResolvablePromise<undefined>({uncaught: 'discard'});
closed.finally(() => self.close()).catch(assertUnreachable);
function fail(log: Logger, error: unknown): never {
    log.error('Critical failure, closing', error);
    closed.resolve(undefined);
    throw ensureError(error);
}

/** Returns a view to the VP8 header. */
function getVp8Header(log: Logger, frame: ArrayBuffer): Uint8Array | undefined {
    const array = new Uint8Array(frame);
    if (array.byteLength < 3) {
        log.warn('Discarding invalid VP8 payload, byte length < 3');
        return undefined;
    }
    // Note: Ok because we have validated the length above to be at least 3 bytes.
    //
    // Excuse for no-non-null-assertion: Tight performance requirements.
    //
    // eslint-disable-next-line no-bitwise, @typescript-eslint/no-non-null-assertion
    const isKeyFrame = (array[0]! & 0x01) === 0;
    if (isKeyFrame) {
        if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
            log.debug('Got a VP8 keyframe');
        }
        if (array.byteLength < 10) {
            log.warn('Discarding invalid VP8 payload key frame, byte length < 10');
            return undefined;
        }
    }
    return new Uint8Array(frame, 0, isKeyFrame ? 10 : 3);
}

/**
 * Align the decryptor state with `epoch` and `ratchetCounter` and retrieve the matching PCMFK
 * {@link ImportedParticipantCallMediaFrameKey} for decrypting.
 *
 * Returns `undefined` if alignment was not possible.
 */
type DecryptorAlignWithFn = (
    epoch: u8,
    ratchetCounter: u8,
) => Promise<ImportedParticipantCallMediaFrameKey> | undefined;

/** Decryptor for a single remote media stream. */
class FrameDecryptor implements Transformer<AnyEncodedFrame, AnyEncodedFrame> {
    private readonly _log: Logger;
    private readonly _allowEmptyFrame: boolean;
    private readonly _getHeader?: (frame: ArrayBuffer) => Uint8Array | undefined;
    readonly #_alignWith: DecryptorAlignWithFn;

    public constructor(
        services: Pick<ServicesForMediaCryptoWorker, 'logging'>,
        alignWith: DecryptorAlignWithFn,
        private readonly _codec: MediaStreamPayloadCodec,
    ) {
        this._log = services.logging.logger('decryptor');
        this.#_alignWith = alignWith;
        switch (this._codec) {
            case 'opus':
                this._allowEmptyFrame = true;
                break;
            case 'vp8':
                this._allowEmptyFrame = false;
                this._getHeader = getVp8Header.bind(this, this._log);
                break;
            default:
                unreachable(this._codec);
        }
    }

    public async transform(
        frame: AnyEncodedFrame,
        controller: TransformStreamDefaultController<AnyEncodedFrame>,
    ): Promise<void> {
        if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
            this._log.debug(
                `Encrypted frame (length=${frame.data.byteLength}, codec=${this._codec})`,
            );
        }

        // Check full frame length
        if (frame.data.byteLength === 0) {
            if (this._allowEmptyFrame) {
                // Opus DTX generates empty frames for discontinued transmission (i.e. silence)
                controller.enqueue(frame);
            } else {
                this._log.warn('Discarding invalid frame of 0 bytes');
            }
            return;
        }
        if (frame.data.byteLength > MAX_ENCRYPTED_FRAME_LENGTH) {
            this._log.warn(
                `Discarding invalid frame exceeding ${MAX_ENCRYPTED_FRAME_LENGTH} bytes`,
            );
            return;
        }

        // Extract the header that remained unencrypted
        const unencryptedHeader = this._getHeader?.(frame.data) ?? ZERO_BYTES;

        // Extract payload and footer
        let encryptedPayload, footer;
        {
            let offset = unencryptedHeader.byteLength;
            const remaining = new Uint8Array(frame.data, offset);
            if (remaining.byteLength < 6) {
                this._log.warn('Discarding invalid frame, does not contain the 6 byte footer');
                return;
            }
            encryptedPayload = remaining.subarray(0, -6);
            offset += encryptedPayload.byteLength;
            footer = {
                array: remaining.subarray(-6),
                view: new DataView(remaining.buffer, offset, 6),
            };
        }

        // Decode footer, create nonce and additional data from it
        let mfsn, pcmfk, nonce, additionalData;
        {
            // Note: Ok because we have validated the length above to be at least 6 bytes.
            //
            // Excuse for no-non-null-assertion: Tight performance requirements.
            //
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const epoch = footer.array[0]!;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const ratchetCounter = footer.array[1]!;

            // Note: We're not doing sequence number counting when decrypting since reordering may
            // happen and replay is deemed somewhat acceptable here.
            mfsn = footer.view.getUint32(2, true);

            // Lookup key
            pcmfk = this.#_alignWith(epoch, ratchetCounter);
            if (pcmfk === undefined) {
                this._log.warn('Discarding frame, no matching PCMFK could be determined');
                return;
            }

            // Space for the nonce (IV) of 12 bytes, additional data of 6 bytes and bytes for the
            // unencrypted header.
            const buffer = new ArrayBuffer(18 + unencryptedHeader.byteLength);

            // Encode nonce (IV)
            nonce = new Uint8Array(buffer, 0, 12);
            {
                const view = new DataView(buffer, 0, 4);
                view.setUint32(0, mfsn, true);
            }

            // Encode additional data
            additionalData = new Uint8Array(buffer, 12);
            additionalData.set(footer.array, 0);
            additionalData.set(unencryptedHeader, 6);
            if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
                this._log.debug(
                    `Additional data (mfsn=${mfsn}, length=${additionalData.byteLength})`,
                );
            }
        }

        // IMPORTANT: Critical section over, async is now allowed but access to `this.#_alignWith`
        // is forbidden!

        // Decrypt
        let decryptedPayload;
        try {
            decryptedPayload = await self.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    additionalData,
                    iv: nonce,
                    tagLength: 128, // 16 bytes, awkwardly defined as bits for reasons
                },
                await pcmfk,
                encryptedPayload,
            );
        } catch {
            this._log.warn('Discarding invalid frame, decryption failed');
            return;
        }

        // Copy unencrypted header and decrypted payload into struct.
        //
        // Note: Unfortunately, we have to pass an `ArrayBuffer`, otherwise we would have been able
        // to copy the decrypted payload into the existing buffer. Well, *sigh*.
        const buffer = new ArrayBuffer(unencryptedHeader.byteLength + decryptedPayload.byteLength);
        const decoded = new Uint8Array(buffer);
        let offset = 0;

        // Unencrypted header...
        decoded.set(unencryptedHeader, offset);
        offset += unencryptedHeader.byteLength;

        // Decrypted payload.
        decoded.set(new Uint8Array(decryptedPayload), offset);

        // Update frame data
        if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
            this._log.debug(
                `Decrypted frame (mfsn=${mfsn}, length=${frame.data.byteLength} -> ${decoded.byteLength}, codec=${this._codec})`,
            );
        }
        // eslint-disable-next-line require-atomic-updates
        frame.data = buffer;
        controller.enqueue(frame);
    }
}

/** Decryptor context for all media streams of a remote participant. */
class DecryptorContext {
    private readonly _log: Logger;
    private readonly _streams = new Map<
        string, // MID
        TransformStream<AnyEncodedFrame, AnyEncodedFrame>
    >();

    /**
     * An array of PCMKs, strictly ordered by epoch, ascending but also wrapping.
     */
    #_keys: WorkerParticipantCallMediaKey[] = [];

    public constructor(
        private readonly _services: Pick<ServicesForMediaCryptoWorker, 'logging'>,
        private readonly _gckh: RawGroupCallKeyHash,
        private readonly _abort: AbortListener,
        participantId: ParticipantId,
    ) {
        this._log = _services.logging.logger(`decryptor.${participantId}`);
        _abort.subscribe(() => {
            this.#_keys = [];
            this._streams.clear();
        });
    }

    public addPcmk(raw: RawParticipantCallMediaKeyState): void {
        if (this._abort.aborted) {
            this._log.error('Attempted to add PCMK after being aborted');
            return;
        }
        const successor: ParticipantCallMediaKeyState = {
            ...raw,
            pcmk: tag<RawParticipantCallMediaKey>(wrapRawKey(raw.pcmk, PCMK_LENGTH)),
        };

        // Ensure we're not adding an old/existing epoch (with the exception of wrapping)
        const newest = this.#_keys.at(-1)?.state;
        if (
            newest !== undefined &&
            !(successor.epoch === 0 && newest.epoch === 255) &&
            successor.epoch < newest.epoch
        ) {
            this._log.warn(
                `Discarding PCMK that would downgrade the epoch (newest=${newest.epoch}, provided=${successor.epoch})`,
            );
            return;
        }

        // Append PCMK
        this.#_keys.push(new WorkerParticipantCallMediaKey(this._gckh, successor));
        if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
            this._log.debug(
                `Added new PCMK (epoch=${successor.epoch}, ratchet-counter=${successor.ratchetCounter})`,
            );
        }
    }

    public addStream(stream: MediaCryptoWorkerStream): void {
        if (this._abort.aborted) {
            this._log.error('Attempted to add stream after being aborted');
            return;
        }
        if (this._streams.has(stream.mid)) {
            this._log.error(`Stream for mid '${stream.mid}' already exists`);
            return;
        }
        this._log.debug(`Adding stream (mid='${stream.mid}', codec=${stream.codec})`);

        // Create the transform stream
        const transform = new TransformStream(
            new FrameDecryptor(this._services, this._alignWith.bind(this), stream.codec),
        );
        this._streams.set(stream.mid, transform);

        // Set up the transform pipeline
        this._abort.subscribe(() => {
            this._log.debug(`Removing stream (mid='${stream.mid}', codec=${stream.codec})`);
            this._streams.delete(stream.mid);
            // Note: Once we call `pipeTo`, the stream is locked and aborting is not possible. We'll
            // just have to rely on the garbage collector working correctly.
        });
        stream.pair.readable
            .pipeThrough(transform)
            .pipeTo(stream.pair.writable)
            .catch((error: unknown) => fail(this._log, error));
    }

    private _alignWith(
        epoch: u8,
        ratchetCounter: u8,
    ): Promise<ImportedParticipantCallMediaFrameKey> | undefined {
        // Lookup the key by epoch and purge all keys of older epochs
        for (;;) {
            // Check if any keys are left
            const key = this.#_keys.at(0);
            if (key === undefined) {
                return undefined;
            }

            // Same epoch: Align the ratchet counter, if necessary.
            if (epoch === key.state.epoch) {
                return key.alignWith(ratchetCounter)?.pcmfk('decrypt');
            }

            // Older epoch: Discard.
            //
            // Note: Epoch `0` is handled specially because the epoch is allowed to wrap. Since
            // different media frames may race with each other, we apply a heuristic to prevent
            // accidental wrapping back from epoch `1` to `0`. Otherwise, we just seek until we find
            // epoch `0` again.
            if (
                (epoch === 0 && key.state.epoch < 128) ||
                (epoch !== 0 && epoch < key.state.epoch)
            ) {
                if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
                    this._log.debug(`No PCMK for old epoch ${epoch} available`);
                }
                return undefined;
            }

            // Newer epoch: Drop the current key and continue searching.
            if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
                this._log.debug(`Discarding PCMK (epoch ${key.state.epoch} < ${epoch})`);
            }
            this.#_keys.shift();
        }
    }
}

/** Entrypoint for creating, removing or modifying the decryptor of a participant. */
class DecryptorProvider
    implements MediaCryptoDecryptorBackendHandle, MediaCryptoDecryptorMainThreadHandle
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    private readonly _log: Logger;
    private readonly _decryptors = new Map<
        ParticipantId,
        {readonly abort: AbortRaiser; readonly context: DecryptorContext}
    >();

    public constructor(
        private readonly _services: ServicesForMediaCryptoWorker,
        private readonly _gckh: RawGroupCallKeyHash,
    ) {
        this._log = _services.logging.logger('decryptor-provider');
    }

    /** @inheritdoc */
    public remove(participant: ParticipantId): void {
        const decryptor = this._decryptors.get(participant);
        if (decryptor === undefined) {
            this._log.error(
                `Unable to remove, participant ${participant}} decryptor does not exist`,
            );
            return;
        }
        assert(this._decryptors.delete(participant));
        this._log.info(`Removed participant decryptor ${participant}`);
        decryptor.abort.raise(undefined);
    }

    /** @inheritdoc */
    public addPcmks(
        participant: ParticipantId,
        pcmks: readonly RawParticipantCallMediaKeyState[],
    ): void {
        const context = this._getOrCreateContext(participant);
        for (const pcmk of pcmks) {
            context.addPcmk(pcmk);
        }
    }

    /** @inheritdoc */
    public addStream(participant: ParticipantId, stream: MediaCryptoWorkerStream): void {
        this._getOrCreateContext(participant).addStream(stream);
    }

    private _getOrCreateContext(participant: ParticipantId): DecryptorContext {
        let decryptor = this._decryptors.get(participant);
        if (decryptor === undefined) {
            const abort = new AbortRaiser();
            const context = new DecryptorContext(this._services, this._gckh, abort, participant);
            decryptor = {abort, context};
            this._log.info(`Adding participant decryptor ${participant}`);
            this._decryptors.set(participant, decryptor);
        }
        return decryptor.context;
    }
}

/** Current internal state of an encryptor for all local media streams. */
interface EncryptorState {
    readonly key: WorkerParticipantCallMediaKey;
    readonly pcmfk: ImportedParticipantCallMediaFrameKey;
    readonly epochAndRatchetCounter: Uint8Array;
    readonly mfsn: SequenceNumberU32<u32>;
}

/** Retrieve the current {@link EncryptorState} for encrypting. */
type EncryptorStateFn = () => Pick<EncryptorState, 'pcmfk' | 'epochAndRatchetCounter' | 'mfsn'>;

/** Encryptor for a single local media stream. */
class FrameEncryptor implements Transformer<AnyEncodedFrame, AnyEncodedFrame> {
    private readonly _log: Logger;
    private readonly _allowEmptyFrame: boolean;
    private readonly _getHeader: ((frame: ArrayBuffer) => Uint8Array | undefined) | undefined;
    readonly #_state: EncryptorStateFn;

    public constructor(
        services: Pick<ServicesForMediaCryptoWorker, 'logging'>,
        state: EncryptorStateFn,
        private readonly _codec: MediaStreamPayloadCodec,
    ) {
        this._log = services.logging.logger('encryptor');
        this.#_state = state;
        switch (this._codec) {
            case 'opus':
                this._allowEmptyFrame = true;
                this._getHeader = undefined;
                break;
            case 'vp8':
                this._allowEmptyFrame = false;
                this._getHeader = getVp8Header.bind(this, this._log);
                break;
            default:
                unreachable(this._codec);
        }
    }

    public async transform(
        frame: AnyEncodedFrame,
        controller: TransformStreamDefaultController<AnyEncodedFrame>,
    ): Promise<void> {
        if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
            this._log.debug(
                `Unencrypted frame (length=${frame.data.byteLength}, codec=${this._codec})`,
            );
        }

        // Check frame length
        if (frame.data.byteLength === 0) {
            if (this._allowEmptyFrame) {
                // Opus DTX generates empty frames for discontinued transmission (i.e. silence)
                controller.enqueue(frame);
            } else {
                this._log.warn('Discarding invalid frame of 0 bytes');
            }
            return;
        }
        if (frame.data.byteLength > MAX_UNENCRYPTED_FRAME_LENGTH) {
            this._log.warn(
                `Discarding invalid frame exceeding ${MAX_UNENCRYPTED_FRAME_LENGTH} bytes`,
            );
            return;
        }

        // For VP8, extract the header that should remain unencrypted
        const unencryptedHeader = this._getHeader?.(frame.data) ?? ZERO_BYTES;
        const unencryptedPayload = new Uint8Array(frame.data, unencryptedHeader.byteLength);

        // Create nonce and additional data
        let pcmfk;
        let nonce;
        let mfsn;
        let additionalData;
        {
            const state = this.#_state();
            pcmfk = state.pcmfk;

            // Get and increase MFSN
            mfsn = state.mfsn.current;
            state.mfsn.next();

            // Space for the nonce (IV) of 12 bytes, additional data of 6 bytes
            // and bytes for the unencrypted header.
            const buffer = new ArrayBuffer(18 + unencryptedHeader.byteLength);

            // Encode nonce (IV)
            nonce = new Uint8Array(buffer, 0, 12);
            {
                const view = new DataView(buffer, 0, 4);
                view.setUint32(0, mfsn, true);
            }

            // Encode additional data
            additionalData = new Uint8Array(buffer, 12);
            {
                const view = new DataView(buffer, 12, 6);
                additionalData.set(state.epochAndRatchetCounter, 0);
                view.setUint32(2, mfsn, true);
                additionalData.set(unencryptedHeader, 6);
            }
            if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
                this._log.debug(
                    `Additional data (mfsn=${mfsn}, length=${additionalData.byteLength})`,
                );
            }
        }

        // IMPORTANT: Critical section over, async is now allowed but access to `this.#_state` is
        // forbidden!

        // Encrypt
        const encryptedPayload = await self.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                additionalData,
                iv: nonce,
                tagLength: 128, // 16 bytes, awkwardly defined as bits for reasons
            },
            pcmfk,
            unencryptedPayload,
        );

        // Copy unencrypted header, encrypted payload and additional data into struct.
        const buffer = new ArrayBuffer(
            unencryptedHeader.byteLength + encryptedPayload.byteLength + 6,
        );
        const encoded = new Uint8Array(buffer);
        let offset = 0;

        // Unencrypted header...
        encoded.set(unencryptedHeader, offset);
        offset += unencryptedHeader.byteLength;

        // Encrypted payload...
        encoded.set(new Uint8Array(encryptedPayload), offset);
        offset += encryptedPayload.byteLength;

        // Footer (epoch, ratchet counter, MFSN).
        encoded.set(additionalData.subarray(0, 6), offset);

        // Update frame data
        if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
            this._log.debug(
                `Encrypted frame (mfsn=${mfsn}, length=${frame.data.byteLength} -> ${encoded.byteLength}, codec=${this._codec})`,
            );
        }
        // eslint-disable-next-line require-atomic-updates
        frame.data = buffer;
        controller.enqueue(frame);
    }
}

/** Encryptor provider and context for all local media streams. */
class EncryptorProvider
    implements MediaCryptoEncryptorBackendHandle, MediaCryptoEncryptorMainThreadHandle
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    private readonly _lock = new AsyncLock();
    private readonly _streams = new Map<
        string, // MID
        TransformStream<AnyEncodedFrame, AnyEncodedFrame>
    >();
    #_state: EncryptorState;

    private constructor(
        private readonly _services: ServicesForMediaCryptoWorker,
        private readonly _log: Logger,
        state: EncryptorState,
    ) {
        this.#_state = state;
    }

    public static async create(
        services: ServicesForMediaCryptoWorker,
        gckh: RawGroupCallKeyHash,
        source: ParticipantCallMediaKeyState,
    ): Promise<EncryptorProvider> {
        const log = services.logging.logger('encryptor-provider');
        const key = new WorkerParticipantCallMediaKey(gckh, source);
        const state: EncryptorState = {
            key,
            pcmfk: await key.pcmfk('encrypt'),
            epochAndRatchetCounter: Uint8Array.from([source.epoch, source.ratchetCounter]),
            mfsn: new SequenceNumberU32(0),
        };
        if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
            log.debug(
                `Applied initial PCMK (epoch=${source.epoch}, ratchet-counter=${source.ratchetCounter})`,
            );
        }
        return new EncryptorProvider(services, log, state);
    }

    /** @inheritdoc */
    public setPcmk(raw: RawParticipantCallMediaKeyState): void {
        const successor: ParticipantCallMediaKeyState = {
            ...raw,
            pcmk: tag<RawParticipantCallMediaKey>(wrapRawKey(raw.pcmk, PCMK_LENGTH)),
        };
        this._lock
            .with(async () => {
                // Derive PCMFK and pre-encode epoch and ratchet counter.
                //
                // Note: We intentionally do **not** reset the MFSN since it could result in nonce reuse if
                // we have a bug somewhere in this code!
                this.#_state = {
                    key: this.#_state.key,
                    pcmfk: await this.#_state.key.update(successor).pcmfk('encrypt'),
                    epochAndRatchetCounter: Uint8Array.from([
                        successor.epoch,
                        successor.ratchetCounter,
                    ]),
                    mfsn: this.#_state.mfsn,
                };
                if (import.meta.env.VERBOSE_LOGGING.CALLS_MEDIA_CRYPTO) {
                    this._log.debug(
                        `Applied new PCMK (epoch=${successor.epoch}, ratchet-counter=${successor.ratchetCounter})`,
                    );
                }
            })
            .catch((error: unknown) => fail(this._log, error));
    }

    /** @inheritdoc */
    public addStream(stream: MediaCryptoWorkerStream): void {
        if (this._streams.has(stream.mid)) {
            this._log.error(`Stream for mid '${stream.mid}' already exists`);
            return;
        }
        this._log.debug(`Adding stream (mid='${stream.mid}', codec=${stream.codec})`);

        // Create the transform stream
        const transform = new TransformStream(
            new FrameEncryptor(this._services, () => this.#_state, stream.codec),
        );
        this._streams.set(stream.mid, transform);

        // Set up the transform pipeline
        stream.pair.readable
            .pipeThrough(transform)
            .pipeTo(stream.pair.writable)
            .catch((error: unknown) => fail(this._log, error));
    }
}

/**
 * This is the common entrypoint for the media crypto worker, invoked by the app.
 *
 * Note: All exceptions that are considered infallible will be caught by whoever created the Worker
 * instance. The creator is responsible for closing the Worker in such a case.
 */
async function main(): Promise<void> {
    // Note: Logs are not propagated into the log file
    const logging = TagLogger.styled(
        CONSOLE_LOGGER,
        'mcw',
        createLoggerStyle('#ffffff', '#0a87f0'),
    );
    {
        const assertFailLogger = logging.logger('assert');
        setAssertFailLogger((error) => assertFailLogger.error(extractErrorTraceback(error)));
    }

    // Bind catching initial state as early as possible as otherwise the event listener may be added
    // too late.
    const initialState = new Promise<Readonly<v.Infer<typeof MEDIA_CRYPTO_INIT_INTERNAL>>>(
        (resolve) => {
            self.addEventListener(
                'message',
                ({data}) => resolve(MEDIA_CRYPTO_INIT_INTERNAL.parse(data)),
                {once: true},
            );
        },
    );

    // Acquire lock and run
    let log = logging.logger('main');
    log.debug('Loaded, waiting for lock');
    await navigator.locks.request('mcw', async () => {
        // Signal that we're initialising now
        self.postMessage('init');

        // Create services
        const services: ServicesForMediaCryptoWorker = {
            endpoint: createEndpointService({logging}),
            logging,
        };

        // Wait for our endpoint/portal to the backend and the initial state
        log.debug('Waiting for initialisation');
        const {backendEndpoint, callId, gckh, initialLocalPcmk} = await initialState;

        // eslint-disable-next-line require-atomic-updates
        log = logging.logger(`main.${callId.shortened}`);
        log.info(`Initial state acquired (id=${callId.id}, gckh=${bytesToHex(gckh)})`);

        // Expose entrypoint to the backend and the main thread
        const backend: MediaCryptoHandleForBackend & MediaCryptoMainThreadHandle = {
            [TRANSFER_HANDLER]: PROXY_HANDLER,
            encryptor: await EncryptorProvider.create(services, gckh, initialLocalPcmk),
            decryptor: new DecryptorProvider(services, gckh),
        };
        services.endpoint.exposeProxy<MediaCryptoHandleForBackend>(
            backend,
            ensureEndpoint(backendEndpoint),
            logging.logger('com.bw.media-crypto-provider'),
        );
        services.endpoint.exposeProxy<MediaCryptoMainThreadHandle>(
            backend,
            ensureEndpoint(self),
            logging.logger('com.mt.media-crypto-provider'),
        );

        // Because creating the backend itself was async, we need to signal that we're ready now. This
        // is signalled by a 'ready' message.
        self.postMessage('ready');
        log.info('Ready');

        // Wait until closed
        await closed;
    });
}

// Temporarily set primitive assertion failed logger, then run main
setAssertFailLogger((error) => CONSOLE_LOGGER.error(extractErrorTraceback(error)));
main().catch((error: unknown) => {
    throw new Error('Critical error while initializing media crypto worker', {cause: error});
});
