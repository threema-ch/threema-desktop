import type {AppServices} from '~/app/types';
import {
    transformOngoingGroupCallProps,
    type AugmentedOngoingGroupCallViewModelBundle,
} from '~/app/ui/components/partials/call-activity/transformer';
import {CAMERA_STREAM_CONSTRAINTS, MICROPHONE_STREAM_CONSTRAINTS} from '~/common/dom/webrtc';
import type {Logger} from '~/common/logging';
import type {ParticipantId} from '~/common/network/protocol/call/group-call';
import type {Dimensions} from '~/common/types';
import {unwrap, unreachable, assert, assertUnreachable} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import {AsyncLock} from '~/common/utils/lock';
import type {AbortRaiser} from '~/common/utils/signal';
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

/**
 * Select the default or a specific microphone device.
 */
export async function selectMicrophoneDevice(
    current: MediaStreamTrack | undefined,
    target: {
        readonly device: 'default' | {readonly deviceId: string};
        readonly state: 'on' | 'off';
    },
): Promise<CaptureDevices['microphone']> {
    // Release current track (if any)
    current?.stop();

    // Get new track
    const streams = await navigator.mediaDevices.getUserMedia({
        audio: {
            ...MICROPHONE_STREAM_CONSTRAINTS,
            ...(target.device !== 'default' ? {deviceId: {exact: target.device.deviceId}} : {}),
        },
    });
    const [track] = streams.getAudioTracks();
    if (track === undefined) {
        return undefined;
    }
    track.enabled = target.state === 'on';
    return {track, state: target.state};
}

/**
 * Select the default or a specific camera device.
 */
export async function selectCameraDevice(
    current: MediaStreamTrack | undefined,
    target: {
        readonly device: 'default' | {readonly deviceId: string};
        readonly facing: 'user' | 'environment';
        readonly state: 'on' | 'off';
    },
): Promise<CaptureDevices['camera']> {
    // Release current track (if any)
    current?.stop();

    // Get new track
    const streams = await navigator.mediaDevices.getUserMedia({
        video: {
            ...CAMERA_STREAM_CONSTRAINTS,
            ...(target.device !== 'default' ? {deviceId: {exact: target.device.deviceId}} : {}),
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

/**
 * Select the default microphone and camera device.
 */
export async function selectInitialCaptureDevices(
    log: Logger,
    state: CaptureState,
): Promise<CaptureDevices> {
    // Request microphone and camera access
    log.debug('Setting up microphone/camera');
    let microphone;
    try {
        microphone = await selectMicrophoneDevice(undefined, {
            device: 'default',
            state: state.microphone,
        });
    } catch (error) {
        log.debug('No microphone device to capture from');
    }
    let camera;
    try {
        camera = await selectCameraDevice(undefined, {
            device: 'default',
            facing: 'user',
            state: state.camera,
        });
    } catch (error) {
        log.debug('No camera device to capture from');
    }
    return {microphone, camera};
}

/**
 * Does the following things at once:
 *
 * - Attaches a device track change to the local transceiver.
 * - Applies a device state change to the device track.
 * - Announces a device state change to the call.
 */
export function attachLocalDeviceAndAnnounceCaptureState(
    log: Logger,
    call: AugmentedOngoingGroupCallViewModelBundle | undefined,
    stop: AbortRaiser<AnyExtendedGroupCallContextAbort> | undefined,
    kind: 'microphone' | 'camera',
    current: CaptureDevice,
    updated:
        | {
              readonly track: MediaStreamTrack;
              readonly state: 'on' | 'off' | 'toggle';
          }
        | undefined,
): CaptureDevice {
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
            transceivers[kind].sender.replaceTrack(track).catch(assertUnreachable);
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
            call.controller.localCaptureState(kind, state).catch((error: unknown) => {
                log.error(`Setting ${kind} capture state failed`, error);
                stop?.raise({origin: 'ui-component', cause: 'unexpected-error'});
            });
        }
    }

    // Done
    return target;
}

const remoteParticipantRemoteCamerasAsyncLock = new AsyncLock();
/**
 * Update the `remoteCamera` subscription for a specific participant.
 */
export function updateRemoteParticipantRemoteCameras({
    controller,
    log,
    participantId,
    stop,
    dimensions,
}: {
    readonly controller: AugmentedOngoingGroupCallViewModelBundle['controller'];
    readonly log: Logger;
    readonly participantId: ParticipantId;
    readonly stop: AbortRaiser<AnyExtendedGroupCallContextAbort>;

    /**
     * The dimensions the camera feed will be displayed at in pixels. This is the dimensions of the
     * `<video>` element's container. Should be set to `undefined` when the participant is not in
     * view.
     *
     * Note: Dimension change detection should be debounced, to avoid updating the camera
     * subscription too often while resizing.
     */
    readonly dimensions: Dimensions | undefined;
}): void {
    remoteParticipantRemoteCamerasAsyncLock
        .with(() => {
            controller
                .remoteCamera(
                    participantId,
                    dimensions !== undefined
                        ? {
                              type: 'subscribe',
                              resolution: dimensions,
                          }
                        : {type: 'unsubscribe'},
                )
                .catch((error: unknown) => {
                    log.error('Updating camera subscription failed', error);
                    stop.raise({origin: 'ui-component', cause: 'unexpected-error'});
                });
        })
        .catch(assertUnreachable);
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
