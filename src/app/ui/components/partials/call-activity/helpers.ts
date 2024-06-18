import type {AppServices} from '~/app/types';
import {
    transformOngoingGroupCallProps,
    type AugmentedOngoingGroupCallStateViewModel,
    type AugmentedOngoingGroupCallViewModelBundle,
} from '~/app/ui/components/partials/call-activity/transformer';
import type {ParticipantFeedProps} from '~/app/ui/components/partials/call-participant-feed/props';
import {CAMERA_STREAM_CONSTRAINTS, MICROPHONE_STREAM_CONSTRAINTS} from '~/common/dom/webrtc';
import type {Logger} from '~/common/logging';
import {unwrap, unreachable, assert, assertUnreachable} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
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

/**
 * Map (all existing and newly added) participants to their respective feed properties.
 */
export function updateRemoteParticipantFeeds(
    log: Logger,
    controller: AugmentedOngoingGroupCallViewModelBundle['controller'],
    stop: AbortRaiser<AnyExtendedGroupCallContextAbort>,
    state: AugmentedOngoingGroupCallStateViewModel,
): readonly Omit<ParticipantFeedProps<'remote'>, 'activity' | 'services'>[] {
    // TODO(DESK-1405): Only subscribe remote participants when they are in view with the current
    // canvas dimensions. Call `remoteCamera` again whenever the canvas dimensions change (debounced
    // to ~3s) or when the participant moves out of the viewport (also debounced but maybe just
    // ~1s).
    for (const participant of state.remote) {
        controller
            .remoteCamera(participant.id, {
                type: 'subscribe',
                // TODO(DESK-1405): Apply the correct canvas dimensions here
                resolution: {width: 640, height: 480},
            })
            // eslint-disable-next-line @typescript-eslint/no-loop-func
            .catch((error: unknown) => {
                log.error('Subscribing to camera failed', error);
                stop.raise({origin: 'ui-component', cause: 'unexpected-error'});
            });
    }

    return state.remote.map(
        (participant): Omit<ParticipantFeedProps<'remote'>, 'activity' | 'services'> => ({
            type: 'remote',
            receiver: participant.receiver,
            participantId: participant.id,
            tracks: {
                type: 'remote',
                microphone: participant.transceivers.microphone.receiver.track,
                camera: participant.transceivers.camera.receiver.track,
            },
            capture: participant.capture,
        }),
    );
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
