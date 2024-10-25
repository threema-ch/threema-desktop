import type {AppServices} from '~/app/types';
import {
    transformOngoingGroupCallProps,
    type AugmentedOngoingGroupCallViewModelBundle,
} from '~/app/ui/components/partials/call-activity/transformer';
import {
    DEFAULT_CAMERA_TRACK_CONSTRAINTS,
    DEFAULT_MICROPHONE_TRACK_CONSTRAINTS,
} from '~/common/dom/webrtc';
import type {Logger} from '~/common/logging';
import type {ParticipantId} from '~/common/network/protocol/call/group-call';
import type {Dimensions} from '~/common/types';
import {unwrap, unreachable, assert} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import {AsyncLock} from '~/common/utils/lock';
import type {AbortRaiser} from '~/common/utils/signal';
import {WritableStore, type ReadableStore} from '~/common/utils/store';
import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
import type {AnyGroupCallContextAbort, CaptureState} from '~/common/webrtc/group-call';

export type AnyExtendedGroupCallContextAbort =
    | AnyGroupCallContextAbort
    | {
          readonly origin: 'ui-component';
          readonly cause: 'destroy' | 'switching-call' | 'user-hangup' | 'unexpected-error';
      };

/** A capture device or `undefined` if there is none (or we didn't get the permission). */
export type CaptureDevice =
    | {
          readonly track: MediaStreamTrack;
          readonly state: 'on' | 'off';
      }
    | undefined;

export interface CaptureDevices {
    readonly microphone: CaptureDevice;
    readonly camera: CaptureDevice;
}

export type ActivityLayout = 'pocket' | 'regular';

export type CaptureDevicesGuard = AsyncLock<
    'initial-setup' | 'select-microphone' | 'select-camera' | 'attach' | 'stop',
    WritableStore<CaptureDevices>
>;

type MediaDeviceSelector =
    | {readonly type: 'default'}
    | {readonly type: 'by-device-id'; readonly kind: MediaDeviceKind; readonly deviceId: string}
    | {
          readonly type: 'by-device-label';
          readonly kind: MediaDeviceKind;
          readonly deviceLabel: string;
      };

export function createCaptureDevices(): {
    readonly guard: CaptureDevicesGuard;
    readonly store: ReadableStore<CaptureDevices>;
} {
    const guard: CaptureDevicesGuard = new AsyncLock(
        new WritableStore<CaptureDevices>({microphone: undefined, camera: undefined}),
    );
    return {
        guard,
        store: guard.unwrap(),
    };
}

export async function findMediaDevice(
    kind: MediaDeviceKind,
    label: string,
): Promise<MediaDeviceInfo | undefined> {
    const devices = await navigator.mediaDevices.enumerateDevices();

    return devices.find((device) => device.kind === kind && device.label === label);
}

async function getMediaTrackConstraintsForSelector(
    mediaDeviceSelector: MediaDeviceSelector,
): Promise<MediaTrackConstraints> {
    switch (mediaDeviceSelector.type) {
        case 'default':
            return {};

        case 'by-device-id':
            return {deviceId: {exact: mediaDeviceSelector.deviceId}};

        case 'by-device-label': {
            const device = await findMediaDevice(
                mediaDeviceSelector.kind,
                mediaDeviceSelector.deviceLabel,
            );
            if (device === undefined) {
                return {};
            }
            return {deviceId: {exact: device.deviceId}};
        }

        default:
            return unreachable(mediaDeviceSelector);
    }
}

/**
 * Select the default or a specific microphone device.
 */
async function selectMicrophoneDeviceInternal(
    current: MediaStreamTrack | undefined,
    target: {
        readonly device: MediaDeviceSelector;
        readonly state: 'on' | 'off';
    },
): Promise<CaptureDevices['microphone']> {
    // Release current track (if any).
    current?.stop();

    // Get new track.
    const streams = await navigator.mediaDevices.getUserMedia({
        audio: {
            ...DEFAULT_MICROPHONE_TRACK_CONSTRAINTS,
            ...(await getMediaTrackConstraintsForSelector(target.device)),
        },
    });
    const [track] = streams.getAudioTracks();
    if (track === undefined) {
        return undefined;
    }
    track.enabled = target.state === 'on';
    return {track, state: target.state};
}

export async function selectMicrophoneDevice(
    guard: CaptureDevicesGuard,
    call: AugmentedOngoingGroupCallViewModelBundle | undefined,
    target: {
        readonly device: 'default' | {readonly deviceId: string};
        readonly state: 'on' | 'off';
    },
): Promise<void> {
    return await guard.with(async (store) => {
        const microphone = await selectMicrophoneDeviceInternal(store.get().microphone?.track, {
            device:
                target.device === 'default'
                    ? {type: 'default'}
                    : {
                          type: 'by-device-id',
                          deviceId: target.device.deviceId,
                          kind: 'audioinput',
                      },
            state: target.state,
        });
        await attachLocalDeviceAndAnnounceCaptureState(
            guard,
            call,
            store,
            'microphone',
            microphone,
        );
    }, 'select-microphone');
}

/**
 * Select the default or a specific camera device.
 */
async function selectCameraDeviceInternal(
    current: MediaStreamTrack | undefined,
    target: {
        readonly device: MediaDeviceSelector;
        readonly facing: 'user' | 'environment';
        readonly state: 'on' | 'off';
    },
): Promise<CaptureDevices['camera']> {
    // Release current track (if any)
    current?.stop();

    // Get new track
    const streams = await navigator.mediaDevices.getUserMedia({
        video: {
            ...DEFAULT_CAMERA_TRACK_CONSTRAINTS,
            ...(await getMediaTrackConstraintsForSelector(target.device)),
            facingMode: target.facing,
        },
    });
    const [track] = streams.getVideoTracks();
    if (track === undefined) {
        return undefined;
    }
    track.enabled = target.state === 'on';
    return {track, state: target.state};
}

export async function selectCameraDevice(
    guard: CaptureDevicesGuard,
    call: AugmentedOngoingGroupCallViewModelBundle | undefined,
    target: {
        readonly device: 'default' | {readonly deviceId: string};
        readonly facing: 'user' | 'environment';
        readonly state: 'on' | 'off';
    },
): Promise<void> {
    return await guard.with(async (store) => {
        const camera = await selectCameraDeviceInternal(store.get().camera?.track, {
            device:
                target.device === 'default'
                    ? {type: 'default'}
                    : {
                          type: 'by-device-id',
                          deviceId: target.device.deviceId,
                          kind: 'videoinput',
                      },
            facing: target.facing,
            state: target.state,
        });
        await attachLocalDeviceAndAnnounceCaptureState(guard, call, store, 'camera', camera);
    }, 'select-camera');
}

/**
 * Select the default microphone and camera device.
 */
export async function selectInitialCaptureDevices(
    log: Logger,
    guard: CaptureDevicesGuard,
    state: CaptureState,
    options?: {
        readonly preferredDevices?: {
            readonly camera?: MediaDeviceSelector;
            readonly microphone?: MediaDeviceSelector;
        };
    },
): Promise<void> {
    return await guard.with(async (store) => {
        // Sanity-check
        assert(
            store.run(
                (devices) => devices.camera === undefined && devices.microphone === undefined,
            ),
        );

        // Request microphone and camera access
        log.debug('Setting up microphone/camera');
        let microphone: CaptureDevices['microphone'];
        try {
            microphone = await selectMicrophoneDeviceInternal(undefined, {
                device: options?.preferredDevices?.microphone ?? {type: 'default'},
                state: state.microphone,
            });
        } catch (error) {
            log.debug('No microphone device to capture from');
        }
        let camera: CaptureDevices['camera'];
        try {
            camera = await selectCameraDeviceInternal(undefined, {
                device: options?.preferredDevices?.camera ?? {type: 'default'},
                facing: 'user',
                state: state.camera,
            });
        } catch (error) {
            log.debug('No camera device to capture from');
        }

        // Update capture devices store
        store.update(() => ({microphone, camera}));
    }, 'initial-setup');
}

/**
 * Does the following things at once:
 *
 * - Attaches a device track change to the local transceiver.
 * - Applies a device state change to the device track.
 * - Announces a device state change to the call.
 *
 * IMPORTANT: MUST be called with the {@link CaptureDevicesGuard} lock held!
 */
export async function attachLocalDeviceAndAnnounceCaptureState(
    guard: CaptureDevicesGuard,
    call: AugmentedOngoingGroupCallViewModelBundle | undefined,
    store: WritableStore<CaptureDevices>,
    kind: 'microphone' | 'camera',
    updated:
        | {
              readonly track: MediaStreamTrack;
              readonly state: 'on' | 'off' | 'toggle';
          }
        | undefined,
): Promise<void> {
    assert(guard.context !== undefined);
    const current = store.get()[kind];

    // Toggle capture state, if necessary
    //
    // Note: If no current device exists, toggling is kinda stupid and therefore we'll set the state
    // to 'off'.
    let target: CaptureDevice;
    if (updated !== undefined) {
        if (updated.state === 'toggle') {
            target = {track: updated.track, state: current?.state === 'off' ? 'on' : 'off'};
        } else {
            target = {track: updated.track, state: updated.state};
        }
    }

    // Attach track to transceiver, if needed
    {
        const track = target?.track ?? null;
        const transceivers = call?.state.get().local.transceivers;
        if (transceivers !== undefined && transceivers[kind].sender.track !== track) {
            await transceivers[kind].sender.replaceTrack(track);
        }
    }

    // Apply new state to the track, if possible
    if (target?.track !== undefined) {
        target.track.enabled = target.state === 'on';
    }

    // Announce capture state, if needed
    {
        const state = target?.state ?? 'off';
        if (call !== undefined && state !== call.state.get().local.capture[kind]) {
            await call.controller.localCaptureState(kind, state);
        }
    }

    // Update capture devices store
    store.update((devices) => ({...devices, [kind]: target}));
}

const remoteDevicesLock = new AsyncLock();

/**
 * Update the `remoteCamera` subscription for a specific participant.
 */
export async function updateRemoteParticipantRemoteCameras({
    controller,
    participantId,
    dimensions,
}: {
    readonly controller: AugmentedOngoingGroupCallViewModelBundle['controller'];
    readonly participantId: ParticipantId;

    /**
     * The dimensions the camera feed will be displayed at in pixels. This is the dimensions of the
     * `<video>` element's container. Should be set to `undefined` when the participant is not in
     * view.
     *
     * Note: Dimension change detection should be debounced, to avoid updating the camera
     * subscription too often while resizing.
     */
    readonly dimensions: Dimensions | undefined;
}): Promise<void> {
    return await remoteDevicesLock.with(async () => {
        await controller.remoteCamera(
            participantId,
            dimensions !== undefined
                ? {
                      type: 'subscribe',
                      resolution: dimensions,
                  }
                : {type: 'unsubscribe'},
        );
    });
}

export async function startCall(
    services: Pick<AppServices, 'webRtc'>,
    log: Logger,
    conversation: Remote<ConversationViewModelBundle>,
    intent: 'join' | 'join-or-create',
    stop: AbortRaiser<AnyExtendedGroupCallContextAbort>,
): Promise<AugmentedOngoingGroupCallViewModelBundle | undefined> {
    // Start group call
    log.debug(`Starting group call (intent=${intent}}`);
    let ongoing;
    switch (intent) {
        case 'join':
            ongoing = await unwrap(conversation.viewModelController).group.joinCall(stop.listener);
            break;
        case 'join-or-create':
            ongoing = await unwrap(conversation.viewModelController).group.joinOrCreateCall(
                stop.listener,
            );
            break;
        default:
            unreachable(intent);
    }
    if (ongoing === undefined) {
        assert(intent === 'join');
        return undefined;
    }
    const call = await transformOngoingGroupCallProps(services.webRtc, ongoing);
    log.debug('Group call started');

    // Forward aborts coming from outside of the component
    call.abort.forward(stop, (event) => event);

    return call;
}
