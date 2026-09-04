import {waitForGc, waitUntilStable} from '@threema/test-utils';
import type {f64} from '@threema/ts-utils/float/f64';
import type {u53} from '@threema/ts-utils/integer/u53';
import {unwrap} from '@threema/ts-utils/meta/unwrap';
import {TIMER} from '@threema/ts-utils/timer/global-timer';
import {afterEach, describe, expect, it} from 'vitest';

import {type FakeAudioOutput, installFakeAudioOutput} from '../utils/test/fake-audio-output';
import {createLoopbackRtcPeerConnection} from '../utils/test/loopback-rtc-peer-connection';

import {EnumerableMediaDeviceRegistry} from './enumerable-media-device-registry';
import {LocalSpeaker} from './local-speaker';

/**
 * The platform's own implementation, kept before a fake is installed over it.
 */
const PLATFORM = navigator.mediaDevices;

let speaker: LocalSpeaker | undefined;
let registry: EnumerableMediaDeviceRegistry | undefined;
let fakeOutput: FakeAudioOutput | undefined;
const opened: MediaStream[] = [];

async function createSpeaker(init?: {readonly context?: AudioContext}): Promise<LocalSpeaker> {
    registry = new EnumerableMediaDeviceRegistry();
    await registry.refresh();
    speaker = new LocalSpeaker({
        registry,
        onchange: () => undefined,
        context: init?.context,
        playbackTimeoutMs: 200,
    });
    // The platform is asked once whether it can direct audio at a chosen device, which the speaker
    // does not report until it answered.
    await waitUntilStable(() => (speaker?.state.devices.length ?? 0) > 0);
    return speaker;
}

/**
 * A real track to feed into the sink.
 */
async function track(): Promise<MediaStreamTrack> {
    const stream = await PLATFORM.getUserMedia({audio: true});
    opened.push(stream);
    const [first] = stream.getAudioTracks();
    if (first === undefined) {
        throw new Error('The platform opened no microphone');
    }
    return first;
}

/**
 * The loudest sample the given node saw over the given duration.
 *
 * Note: Sampled repeatedly, because the platform's fake microphone beeps rather than plays
 * continuously, so a single window of a few milliseconds usually lands in a silent stretch.
 */
async function peakOver(analyser: AnalyserNode, durationMs: u53): Promise<f64> {
    const samples = new Float32Array(analyser.fftSize);
    let peak = 0;
    for (let elapsed = 0; elapsed < durationMs; elapsed += 50) {
        await TIMER.sleep(50);
        analyser.getFloatTimeDomainData(samples);
        for (const sample of samples) {
            peak = Math.max(peak, Math.abs(sample));
        }
    }
    return peak;
}

afterEach(() => {
    speaker?.close();
    speaker = undefined;
    registry?.close();
    registry = undefined;
    fakeOutput?.restore();
    fakeOutput = undefined;
    for (const stream of opened.splice(0)) {
        for (const each of stream.getTracks()) {
            each.stop();
        }
    }
});

describe('LocalSpeaker', () => {
    it('reports the speakers of the machine and plays through the system default', async () => {
        // Arrange & act
        const subject = await createSpeaker();

        // Assert
        expect(subject.state.devices.length).toBeGreaterThan(0);
        expect(subject.state.selection).toEqual({type: 'system-default'});
        expect(subject.state.playback).toBe('playing');
    });

    it('directs the audio at a chosen speaker', async () => {
        // Arrange
        const subject = await createSpeaker();
        const wanted = unwrap(subject.state.devices[0], 'This test needs a speaker');

        // Act
        await subject.select({type: 'id', id: wanted.id});
        await waitUntilStable(() => subject.state.effective !== undefined);

        // Assert
        expect(subject.state.selection).toEqual({type: 'id', id: wanted.id});
        expect(subject.state.effective).toBe(wanted.id);
    });

    it('keeps playing where it played when a speaker refuses to take the audio', async () => {
        // Arrange
        const subject = await createSpeaker();
        const wanted = unwrap(subject.state.devices[0], 'This test needs a speaker');
        fakeOutput = installFakeAudioOutput(() => {
            throw new DOMException('Cannot use this device', 'NotFoundError');
        });

        // Act
        await subject.select({type: 'id', id: wanted.id});
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });

        // Assert: The choice is remembered, but the audio was not moved to it.
        expect(subject.state.selection).toEqual({type: 'id', id: wanted.id});
        expect(subject.state.effective).toBe(undefined);
    });

    it('offers no speakers when the platform cannot direct audio at a chosen one', async () => {
        // Arrange: A platform which offers the method and refuses every call, which is also how one
        // that does not offer it at all is answered.
        fakeOutput = installFakeAudioOutput(() => {
            throw new DOMException('Not supported', 'NotSupportedError');
        });

        // Act
        registry = new EnumerableMediaDeviceRegistry();
        await registry.refresh();
        speaker = new LocalSpeaker({registry, onchange: () => undefined, playbackTimeoutMs: 200});
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });

        // Assert: There is no point offering a choice which cannot be honoured.
        expect(speaker.state.devices).toEqual([]);
        expect(registry.devices.speakers.length).toBeGreaterThan(0);

        // Act: A consumer which asks for one anyway is not refused, it just changes nothing.
        await speaker.select({
            type: 'id',
            id: unwrap(registry.devices.speakers[0], 'a speaker').id,
        });
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });

        // Assert
        expect(speaker.state.effective).toBe(undefined);
    });

    it('mixes every connected track into one', async () => {
        // Arrange
        const subject = await createSpeaker();
        const [first, second] = [await track(), await track()];

        // Act
        subject.state.sink.connect(first);
        subject.state.sink.connect(second);
        // Connecting a track which is already connected does nothing.
        subject.state.sink.connect(first);

        // Assert: Both are being pulled from, and neither was stopped by connecting it.
        expect(first.readyState).toBe('live');
        expect(second.readyState).toBe('live');

        // Act
        subject.state.sink.disconnect(first);
        // Disconnecting a track which is not connected does nothing.
        subject.state.sink.disconnect(first);

        // Assert: The track belongs to whoever connected it, so it is not stopped either.
        expect(first.readyState).toBe('live');
    });

    it('keeps a track which came in over a peer connection audible', async () => {
        // Arrange
        const context = new AudioContext();
        const create = context.createMediaStreamDestination.bind(context);
        let mix: MediaStreamAudioDestinationNode | undefined;
        Object.defineProperty(context, 'createMediaStreamDestination', {
            configurable: true,
            value: () => {
                mix = create();
                return mix;
            },
        });
        const subject = await createSpeaker({context});
        const loopback = await createLoopbackRtcPeerConnection(await track());
        const analyser = context.createAnalyser();

        // Act
        subject.state.sink.connect(loopback.remoteTrack);
        context.createMediaStreamSource(unwrap(mix).stream).connect(analyser);

        // Note: A remote track is only pulled if it's attached to an element. The `LocalSpeaker`
        // manages this element internally, but it has to survive garbage collection, which is what
        // we test here.
        let isCollected = false;
        const finalization = new FinalizationRegistry(() => {
            isCollected = true;
        });
        finalization.register({}, undefined);
        await waitForGc(() => isCollected);

        // Assert
        expect(await peakOver(analyser, 3_000)).toBeGreaterThan(0);
        loopback.close();
    });

    it('keeps the sink available whatever the platform does with playback', async () => {
        // Arrange
        const subject = await createSpeaker();

        // Assert: The same sink throughout, so a consumer can hold on to it.
        const {sink} = subject.state;
        expect(subject.state.sink).toBe(sink);
        await subject.select({type: 'system-default'});
        expect(subject.state.sink).toBe(sink);
    });

    it('reports that the platform withholds playback, and asks again when told to', async () => {
        // Arrange: A graph which cannot be started stands in for a platform which will not play.
        const context = new AudioContext();
        await context.close();
        const subject = await createSpeaker({context});

        // Assert
        expect(subject.state.playback).toBe('blocked');

        // Act
        await subject.resume();
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });

        // Assert: Still refused, and nothing raised on the way.
        expect(subject.state.playback).toBe('blocked');
    });

    it('takes no notice of an answer which arrives after it was closed', async () => {
        // Arrange: The platform takes its time saying whether it can direct audio at a device.
        fakeOutput = installFakeAudioOutput(async () => {
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });
        });
        registry = new EnumerableMediaDeviceRegistry();
        await registry.refresh();
        speaker = new LocalSpeaker({registry, onchange: () => undefined, playbackTimeoutMs: 200});

        // Act
        speaker.close();
        await new Promise((resolve) => {
            setTimeout(resolve, 200);
        });

        // Assert: The answer came too late to change anything.
        expect(speaker.state.devices).toEqual([]);
    });

    it('lets go of the graph when it is closed, without stopping what was connected', async () => {
        // Arrange
        const subject = await createSpeaker();
        const connected = await track();
        subject.state.sink.connect(connected);

        // Act
        subject.close();

        // Assert
        expect(connected.readyState).toBe('live');

        // Act: Connecting after it was closed does nothing.
        subject.state.sink.connect(connected);

        // Assert
        expect(connected.readyState).toBe('live');
    });
});
