import type {u53} from '@threema/ts-utils/integer/u53';
import {TIMER} from '@threema/ts-utils/timer/global-timer';

import type {EnumerableMediaDeviceRegistry} from './enumerable-media-device-registry';
import type {LocalSelectableSinkState, MediaSink} from './local-devices-state';
import type {EnumerableMediaDevice, EnumerableMediaDeviceSelection} from './media-device';
import {isMediaDeviceId, type MediaDeviceId} from './media-device-id';
import {resolveMediaDevice} from './resolve-media-device';

/**
 * How long the platform is given to let playback start.
 *
 * Note: Needed because on a page the user has not interacted with, `AudioContext.resume()` never
 * settles at all. Without a limit the speaker would report itself as starting up forever.
 */
export const DEFAULT_PLAYBACK_TIMEOUT_MS = 2_000;

/**
 * Identifier which the platform understands as "whichever device the system prefers".
 */
const SYSTEM_DEFAULT_SINK_ID = '';

/**
 * A track which was connected to the sink.
 */
interface ConnectedTrack {
    readonly stream: MediaStream;
    readonly source: MediaStreamAudioSourceNode;
    /**
     * Note: Only exists to work around https://issues.chromium.org/issues/40094084, where an audio
     * graph does not pull anything from a track which came in over a peer connection unless the
     * same stream is attached to a media element as well. The element is held on to for as long as
     * the track is connected, because it stops working once it is collected.
     */
    readonly keepAlive: HTMLAudioElement;
}

export interface LocalSpeakerInit {
    /**
     * Intended for tests. By default, a new {@link AudioContext} is created upon initialization.
     */
    readonly context?: AudioContext;
    /**
     * Called whenever the state this destination reports changed.
     */
    readonly onchange: () => void;
    /**
     * Overrides {@link DEFAULT_PLAYBACK_TIMEOUT_MS}.
     */
    readonly playbackTimeoutMs?: u53;
    readonly registry: EnumerableMediaDeviceRegistry;
}

/**
 * Holds one sink device, and keeps it in line with what the consumer asked for.
 *
 * Every connected track is mixed into one, and that mix is what the chosen speaker plays, so
 * choosing another one applies to all of them at once rather than to each separately.
 *
 * Note: The platform withholds playback until the user interacted with the page, and leaves the
 * audio graph suspended. Tracks can be connected while that is the case, but they are not heard
 * until {@link resume} is called from within a handler initiated by a user action (e.g. a click
 * handler).
 */
export class LocalSpeaker {
    readonly #_connected = new Map<MediaStreamTrack, ConnectedTrack>();
    readonly #_context: AudioContext;
    readonly #_destination: MediaStreamAudioDestinationNode;
    readonly #_element: HTMLAudioElement;
    readonly #_init: LocalSpeakerInit;
    readonly #_playbackTimeoutMs: u53;
    readonly #_sink: MediaSink;
    readonly #_unsubscribe: () => void;

    #_active: MediaDeviceId | undefined = undefined;
    /**
     * Whether the platform can direct audio at a chosen device.
     */
    #_canSelect = false;
    #_isClosed = false;
    #_playback: LocalSelectableSinkState['playback'] = 'blocked';
    #_selected: EnumerableMediaDeviceSelection = {type: 'system-default'};

    public constructor(init: LocalSpeakerInit) {
        this.#_init = init;
        this.#_playbackTimeoutMs = init.playbackTimeoutMs ?? DEFAULT_PLAYBACK_TIMEOUT_MS;
        this.#_context = init.context ?? new AudioContext();
        this.#_destination = this.#_context.createMediaStreamDestination();

        // Note: Does not need to be attached to a document.
        this.#_element = new Audio();
        this.#_element.srcObject = this.#_destination.stream;

        this.#_sink = {
            connect: (track) => {
                this.#_connect(track);
            },
            disconnect: (track) => {
                this.#_disconnect(track);
            },
        };

        this.#_context.addEventListener('statechange', this.#_handlePlaybackChange);
        this.#_element.addEventListener('play', this.#_handlePlaybackChange);
        this.#_element.addEventListener('pause', this.#_handlePlaybackChange);

        // A device appearing or disappearing can mean the selection now points elsewhere.
        this.#_unsubscribe = init.registry.subscribe(() => {
            this.#_apply();
        });

        this.#_probe().catch(
            /* istanbul ignore next -- @preserve: Unreachable, see the method. */
            () => undefined,
        );
        this.#_start().catch(
            /* istanbul ignore next -- @preserve: Unreachable, see the method. */
            () => undefined,
        );
    }

    public get state(): LocalSelectableSinkState {
        return {
            // Nothing is offered while the platform cannot direct audio at a chosen device: There
            // would be no way to honour the choice.
            devices: this.#_canSelect ? this.#_devices : [],
            selected: this.#_selected,
            active: this.#_active,
            playback: this.#_playback,
            sink: this.#_sink,
        };
    }

    get #_devices(): readonly EnumerableMediaDevice[] {
        return this.#_init.registry.devices.speakers;
    }

    /**
     * Chooses which speaker to play through.
     */
    public select(device: EnumerableMediaDeviceSelection): void {
        this.#_selected = device;
        this.#_apply();
        this.#_notify();
    }

    /**
     * Asks the platform to resume audio playback.
     *
     * Note: Must be called from something the user did, e.g. a click handler, because that is the
     * only thing the platform accepts as a reason to stop withholding playback.
     */
    public resume(): void {
        this.#_start().catch(
            /* istanbul ignore next -- @preserve: Unreachable, see the method. */
            () => undefined,
        );
    }

    /**
     * Disposes the audio graph. Connected tracks are not stopped, because they belong to whoever
     * connected them.
     */
    public close(): void {
        this.#_isClosed = true;
        this.#_unsubscribe();
        this.#_context.removeEventListener('statechange', this.#_handlePlaybackChange);
        this.#_element.removeEventListener('play', this.#_handlePlaybackChange);
        this.#_element.removeEventListener('pause', this.#_handlePlaybackChange);
        for (const track of [...this.#_connected.keys()]) {
            this.#_disconnect(track);
        }
        this.#_element.srcObject = null;
        void this.#_context.close().catch(() => undefined);
    }

    #_notify(): void {
        try {
            this.#_init.onchange();
        } catch {
            // The consumer is not supposed to raise in the callback, and it's not our problem.
        }
    }

    #_connect(track: MediaStreamTrack): void {
        if (this.#_connected.has(track) || this.#_isClosed) {
            return;
        }
        const stream = new MediaStream([track]);
        const source = this.#_context.createMediaStreamSource(stream);
        source.connect(this.#_destination);
        const keepAlive = new Audio();
        keepAlive.srcObject = stream;
        this.#_connected.set(track, {stream, source, keepAlive});
    }

    #_disconnect(track: MediaStreamTrack): void {
        const connected = this.#_connected.get(track);
        if (connected === undefined) {
            return;
        }
        connected.source.disconnect();
        connected.keepAlive.srcObject = null;
        this.#_connected.delete(track);
    }

    /**
     * Finds out whether the platform can direct audio at a chosen device.
     */
    async #_probe(): Promise<void> {
        try {
            await new Audio().setSinkId(SYSTEM_DEFAULT_SINK_ID);
        } catch {
            return;
        }
        if (this.#_isClosed) {
            return;
        }
        this.#_canSelect = true;
        this.#_apply();
        this.#_notify();
    }

    /**
     * Directs the audio at whichever device is currently selected.
     */
    #_apply(): void {
        if (!this.#_canSelect || this.#_isClosed) {
            return;
        }
        // Note: An element told to use no device in particular follows the system on its own.
        const id = resolveMediaDevice(this.#_devices, this.#_selected);
        this.#_element.setSinkId(id ?? SYSTEM_DEFAULT_SINK_ID).then(
            () => {
                const applied = this.#_element.sinkId;
                this.#_active = isMediaDeviceId(applied) ? applied : undefined;
                this.#_notify();
            },
            () => {
                // The device refused to take the audio, so it keeps playing wherever it played
                // before.
            },
        );
    }

    /**
     * Asks the platform to play, and updates the state.
     */
    async #_start(): Promise<void> {
        try {
            // Raced against a limit, because the platform can leave this pending forever instead of
            // refusing it.
            await TIMER.waitFor(this.#_context.resume(), this.#_playbackTimeoutMs);
            await this.#_element.play();
        } catch {
            // The platform is withholding playback. Nothing is lost, the mix keeps being fed, and
            // the consumer can ask again once the user did something.
        }
        this.#_handlePlaybackChange();
    }

    readonly #_handlePlaybackChange = (): void => {
        const playback: LocalSelectableSinkState['playback'] =
            this.#_context.state === 'running' && !this.#_element.paused ? 'playing' : 'blocked';
        if (playback === this.#_playback) {
            return;
        }
        this.#_playback = playback;
        this.#_notify();
    };
}
