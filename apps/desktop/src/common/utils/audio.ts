import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {ensureArrayBufferBackedView} from '@threema/ts-utils/byte/array-buffer-backed-view';
import type {f64} from '@threema/ts-utils/float/f64';
import type {u53} from '@threema/ts-utils/integer/u53';
import {
    Input,
    ALL_FORMATS,
    BlobSource,
    Output,
    Mp4OutputFormat,
    BufferTarget,
    Conversion,
    type AudioCodec,
} from 'mediabunny';

import type {Logger} from '~/common/logging';

/** Whether or not a file is audio. */
export function isAudioFileType(type: string): boolean {
    return type.startsWith('audio/');
}

/**
 * Calculate the root mean square of the signal strength of `numSamples` evenly spread samples in
 * the main audio track of the provided audio blob.
 *
 * Returns undefined if `AudioBlob` is not of supported format or if sampling fails.
 */
export async function calculateRootMeanSquare(
    audioBlob: Blob,
    numSamples: u53,
    log?: Logger,
): Promise<readonly f64[] | undefined> {
    try {
        if (numSamples === 0) {
            log?.warn('Cannot extract 0 samples from audio');
            return undefined;
        }

        const audioBuffer = await decodeAudio(audioBlob);

        // For simplicity, we just take the main channel.
        const channelData = audioBuffer.getChannelData(0);
        const totalLength = channelData.byteLength / 4;
        const chunkSize = Math.floor(totalLength / numSamples);

        const rms: f64[] = [];

        for (let i = 0; i < totalLength; i += chunkSize) {
            const slice = channelData.subarray(i, i + chunkSize);
            const sumSq = slice.reduce((sum, val) => sum + val * val, 0);
            rms.push(Math.sqrt(sumSq / slice.byteLength));
        }
        return rms;
    } catch (error) {
        log?.debug('Could not calculate the RMS of given audio file: ', error);
        return undefined;
    }
}

/**
 * Compute the audio duration of a given blob.
 *
 * Returns undefined if the duration could not be computed or if the blob is not of supported audio format.
 */
export async function computeAudioDuration(
    audioBlob: Blob,
    log?: Logger,
): Promise<f64 | undefined> {
    try {
        const audioBuffer = await decodeAudio(audioBlob);
        return audioBuffer.duration;
    } catch (error) {
        log?.debug('Could not compute audio duration: ', error);
        return undefined;
    }
}

/**
 * Decode the provided audio blob into an {@link AudioBuffer}.
 *
 * Note: This intentionally uses an `OfflineAudioContext`, which never opens an audio output device.
 * A realtime `AudioContext` keeps an audio output stream running (and consuming CPU) until it is
 * closed, and is not garbage collected before that.
 */
async function decodeAudio(audioBlob: Blob): Promise<AudioBuffer> {
    const audioContext = new OfflineAudioContext({length: 1, sampleRate: 48_000});
    const arrayBuffer = await audioBlob.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
}

/**
 * Convert audio into a MP4 container using AAC encoding.
 *
 * Returns undefined if the transcoding failed.
 */
export async function transcodeAudioToMp4Aac(
    bytes: ReadonlyUint8Array,
    mediaType: string,
    log?: Logger,
): Promise<{readonly buffer: ReadonlyUint8Array; readonly duration: number} | undefined> {
    return await transcodeAudioToMp4OutputFormat(bytes, mediaType, 'aac', log);
}

/**
 * Convert audio into a MP4 container using Opus encoding.
 *
 * Returns undefined if the transcoding failed.
 */
export async function transcodeAudioToMp4Opus(
    bytes: ReadonlyUint8Array,
    mediaType: string,
    log?: Logger,
): Promise<{readonly buffer: ReadonlyUint8Array; readonly duration: number} | undefined> {
    return await transcodeAudioToMp4OutputFormat(bytes, mediaType, 'opus', log);
}

async function transcodeAudioToMp4OutputFormat(
    bytes: ReadonlyUint8Array,
    mediaType: string,
    codec: AudioCodec,
    log?: Logger,
): Promise<{readonly buffer: ReadonlyUint8Array; readonly duration: number} | undefined> {
    try {
        const input = new Input({
            formats: ALL_FORMATS,
            source: new BlobSource(
                new Blob([ensureArrayBufferBackedView(bytes)], {type: mediaType}),
            ),
        });

        const output = new Output({format: new Mp4OutputFormat(), target: new BufferTarget()});

        const conversionResult = await Conversion.init({
            input,
            output,
            audio: {
                codec,
            },
        });
        await conversionResult.execute();
        const duration = await input.computeDuration();
        const blob = output.target.buffer;
        if (blob === null) {
            log?.debug('Audio transcoding output buffer does not contain a result');
            return undefined;
        }

        return {buffer: new Uint8Array(blob), duration};
    } catch (error) {
        log?.debug(`Audio transcoding with ${codec} encoder failed with error: `, error);
        return undefined;
    }
}
