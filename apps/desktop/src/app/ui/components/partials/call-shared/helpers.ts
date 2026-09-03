import {AsyncLock} from '@threema/ts-utils/lock/async-lock';

import type {AppServicesForSvelte} from '~/app/types';
import {
    transformOngoingGroupCallProps,
    type AugmentedOngoingGroupCallViewModelBundle,
} from '~/app/ui/components/partials/call-shared/transformer';
import type {ElectronIpcService} from '~/common/dom/electron-service';
import {
    DEFAULT_CAMERA_TRACK_CONSTRAINTS,
    DEFAULT_MICROPHONE_TRACK_CONSTRAINTS,
} from '~/common/dom/webrtc';
import type {Logger} from '~/common/logging';
import type {ParticipantId} from '~/common/network/protocol/call/group-call';
import type {Dimensions} from '~/common/types';
import {unwrap, unreachable, assert} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import type {AbortRaiser} from '~/common/utils/signal';
import {WritableStore, type ReadableStore} from '~/common/utils/store';
import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
import type {AnyGroupCallContextAbort, CaptureState} from '~/common/webrtc/group-call';

export type AnyAugmentedOngoingCallViewModelBundle = AugmentedOngoingGroupCallViewModelBundle;

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
    readonly screen: CaptureDevice;
}

export type ActivityLayout = 'pocket' | 'regular';

export type CaptureDevicesGuard = AsyncLock<
    'initial-setup' | 'select-microphone' | 'select-camera' | 'select-screen' | 'attach' | 'stop',
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
        new WritableStore<CaptureDevices>({
            microphone: undefined,
            camera: undefined,
            screen: undefined,
        }),
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
    call: AnyAugmentedOngoingCallViewModelBundle | undefined,
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
    call: AnyAugmentedOngoingCallViewModelBundle | undefined,
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

export async function startScreenSharing(
    electron: ElectronIpcService,
    guard: CaptureDevicesGuard,
    store: WritableStore<CaptureDevices>,
    call: AnyAugmentedOngoingCallViewModelBundle | undefined,
    message: string,
    buttonLabel: string,
): Promise<void> {
    const streams = await navigator.mediaDevices.getDisplayMedia({
        video: {
            width: {max: 1920},
            height: {max: 1080},
            frameRate: {ideal: 10, max: 10},
        },
    });

    const [track] = streams.getVideoTracks();
    if (track === undefined) {
        return undefined;
    }
    track.enabled = true;
    track.onended = async () => {
        await stopScreenSharing(electron, guard, call);
    };

    return await attachLocalDeviceAndAnnounceCaptureState(guard, call, store, 'screen', {
        track,
        state: 'on',
    }).then(() => electron.showScreenSharingReminder(message, buttonLabel));
}

async function stopScreenSharing(
    electron: ElectronIpcService,
    guard: CaptureDevicesGuard,
    call: AnyAugmentedOngoingCallViewModelBundle | undefined,
): Promise<void> {
    await guard.with(async (store) => {
        const screen = store.get().screen;

        if (screen !== undefined) {
            screen.track.stop();
            screen.track.enabled = false;
            return await attachLocalDeviceAndAnnounceCaptureState(guard, call, store, 'screen', {
                track: screen.track,
                state: 'off',
            }).then(() => electron.closeScreenSharingReminder());
        }

        return undefined;
    }, 'select-screen');
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
                (devices) =>
                    devices.camera === undefined &&
                    devices.microphone === undefined &&
                    devices.screen === undefined,
            ),
        );

        // Request microphone and camera access
        log.debug('Setting up microphone/camera/screen');
        let microphone: CaptureDevices['microphone'];
        try {
            microphone = await selectMicrophoneDeviceInternal(undefined, {
                device: options?.preferredDevices?.microphone ?? {type: 'default'},
                state: state.microphone.state,
            });
        } catch {
            log.debug('No microphone device to capture from');
        }
        // Only acquire the camera if it should be turned on initially. Otherwise, leave the camera
        // hardware released and acquire it lazily once the user turns it on.
        let camera: CaptureDevices['camera'];
        if (state.camera.state === 'on') {
            try {
                camera = await selectCameraDeviceInternal(undefined, {
                    device: options?.preferredDevices?.camera ?? {type: 'default'},
                    facing: 'user',
                    state: state.camera.state,
                });
            } catch {
                log.debug('No camera device to capture from');
            }
        }

        // Do not request screen sharing before the user does so.
        const screen = undefined;

        // Update capture devices store
        store.update(() => ({microphone, camera, screen}));
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
    call: AnyAugmentedOngoingCallViewModelBundle | undefined,
    store: WritableStore<CaptureDevices>,
    kind: 'microphone' | 'camera' | 'screen',
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
    //
    // Note: An 'ended' track can no longer be attached to a transceiver (e.g. because the device
    // was unplugged, or because the track was stopped while the call was being set up). Treat it
    // like a missing device, so that it is detached below and the capture state is announced as
    // 'off', instead of claiming a device that cannot deliver any media.
    let target: CaptureDevice;
    if (updated !== undefined && updated.track.readyState !== 'ended') {
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
            try {
                await transceivers[kind].sender.replaceTrack(track);
            } catch {
                // The peer connection may have been closed in the meantime (e.g. because the call
                // ended while we were acquiring the device), which rejects `replaceTrack`. This
                // must not tear down the call, so continue with announcing the capture state.
                //
                // TODO(DESK-2092): Log warning.
            }
        }
    }

    // Apply new state to the track, if possible
    if (target?.track !== undefined) {
        target.track.enabled = target.state === 'on';
    }

    // Announce capture state, if needed
    {
        const state = target?.state ?? 'off';
        if (call !== undefined && state !== call.state.get().local.capture[kind].state) {
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
    readonly controller: AnyAugmentedOngoingCallViewModelBundle['controller'];
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

/**
 * Update the `remoteScreen` subscription for a specific participant.
 *
 */
export async function updateRemoteParticipantScreens({
    controller,
    participantId,
    dimensions,
}: {
    readonly controller: AnyAugmentedOngoingCallViewModelBundle['controller'];
    readonly participantId: ParticipantId;
    readonly dimensions: Dimensions | undefined;
}): Promise<void> {
    return await remoteDevicesLock.with(async () => {
        await controller.remoteScreen(
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
    services: Pick<AppServicesForSvelte, 'webRtc'>,
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
