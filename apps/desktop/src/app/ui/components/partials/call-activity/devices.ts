import {
    LocalDevices,
    MediaDevicePermissionDeniedByUserError,
    MediaDeviceTimeoutError,
    type EnumerableMediaDeviceSelection,
    type LocalCapture,
    type LocalDevicesState,
    type MediaDeviceError,
} from '@threema/dom';
import {AsyncLock} from '@threema/ts-utils/lock/async-lock';

import type {AppServicesForSvelte} from '~/app/types';
import type {AnyAugmentedOngoingCallViewModelBundle} from '~/app/ui/components/partials/call-activity/helpers';
import type {i18n as i18nStore} from '~/app/ui/i18n';
import {toast} from '~/app/ui/snackbar';
import type {ElectronIpcService} from '~/common/dom/electron-service';
import type {Logger} from '~/common/logging';
import {unreachable} from '~/common/utils/assert';

/**
 * The local media sources, named as the group call protocol names them.
 */
type ProtocolMediaDeviceSource = 'camera' | 'microphone' | 'screen';

/**
 * Icon of a toast which reports that a device could not be used.
 */
const FAILURE_ICON = {
    type: 'md-icon',
    name: 'error',
    theme: 'Outlined',
    color: 'red',
} as const;

export interface CallDevices {
    /**
     * The manager itself, so that a control can turn a source on or off directly.
     */
    readonly devices: LocalDevices;
    /**
     * Hands the local tracks to the transceivers of a call which has just been established, and
     * announces their capture state.
     *
     * Note: Needed in addition to being run on every device change, because establishing a call is
     * asynchronous and the user may have toggled something while it was in flight.
     *
     * @param options.isNewCall Whether the call was just established, in which case its own
     *   decision on the initial capture state is adopted before anything is announced.
     */
    readonly attach: (options?: {readonly isNewCall?: boolean}) => void;
    readonly close: () => void;
    /**
     * Picks what a source captures from, and remembers it for the next call.
     */
    readonly selectCamera: (selection: EnumerableMediaDeviceSelection) => Promise<void>;
    readonly selectMicrophone: (selection: EnumerableMediaDeviceSelection) => Promise<void>;
    readonly selectSpeaker: (selection: EnumerableMediaDeviceSelection) => Promise<void>;
    /**
     * Starts sharing a screen if none is shared, and stops sharing if one is.
     */
    readonly toggleScreenSharing: () => void;
}

export interface CallDevicesArgs {
    readonly electron: ElectronIpcService;
    /**
     * Must return the call which is currently running, or `undefined` if there is none.
     */
    readonly getCall: () => AnyAugmentedOngoingCallViewModelBundle | undefined;
    readonly i18n: typeof i18nStore;
    readonly log: Logger;
    /**
     * Called whenever the state of the local devices changed.
     */
    readonly onchange: (state: LocalDevicesState) => void;
    readonly services: Pick<AppServicesForSvelte, 'settings'>;
}

/**
 * The label to remember when the user asked for the system default rather than a specific device.
 */
const SYSTEM_DEFAULT_LABEL = 'system-default';

/**
 * Returns the {@link EnumerableMediaDeviceSelection} for a given label peristed from an earlier
 * call.
 */
function selectionFromPersistedLabel(label: string | undefined): EnumerableMediaDeviceSelection {
    return label === undefined || label === SYSTEM_DEFAULT_LABEL
        ? {type: 'system-default'}
        : {type: 'label', label};
}

/**
 * Wire the local media devices of this machine to a group call: Restore the devices the user
 * previously chose, hand the captured tracks to the call's transceivers, announce their capture
 * state, and report if a failure occurs.
 */
export function createCallDevices(args: CallDevicesArgs): CallDevices {
    const {electron, getCall, i18n, log, onchange, services} = args;

    const devices = new LocalDevices();
    // Serialises the protocol side, so that two device changes in quick succession cannot attach
    // their tracks or announce their states out of order.
    const protocolLock = new AsyncLock();
    // The failure currently reported per source, so that a failure is shown to the user once rather
    // than on every state change which follows it.
    const failures = new Map<ProtocolMediaDeviceSource, MediaDeviceError | undefined>();

    // Whether the user is currently being reminded that they are sharing their screen.
    let isScreenSharingReminderVisible = false;
    // Whether a call which was just established still has its decision on the initial capture
    // state to be adopted, see `attach`.
    let isInitialCaptureStatePending = false;

    /**
     * Hand a source's track to its transceiver, and announce whether it is delivering media.
     */
    function attach(options?: {readonly isNewCall?: boolean}): void {
        isInitialCaptureStatePending ||= options?.isNewCall ?? false;
        protocolLock
            .with(async () => {
                const call = getCall();
                if (call === undefined) {
                    return;
                }
                const {transceivers} = call.state.get().local;

                // A call decides on its own whether it joins muted (it does when it already had
                // several participants). Adopt that decision into the local devices once, so that
                // both the announcement below and the microphone control follow it, while the user
                // can still unmute right afterwards.
                //
                // Note: Waits for the default capture state first, so that the call's decision wins
                // regardless of which of the two settled first.
                if (isInitialCaptureStatePending) {
                    isInitialCaptureStatePending = false;
                    await defaultCaptureState;
                    if (call.state.get().local.capture.microphone.state === 'off') {
                        await devices.microphone.disable();
                    }
                }

                // Note: Read after the initial capture state was adopted, because adopting it may
                // have turned the microphone off.
                const state = devices.state;

                for (const [source, capture] of [
                    ['microphone', state.microphone],
                    ['camera', state.camera],
                    ['screen', state.display],
                ] as const) {
                    // Note: An 'ended' track can no longer be attached to a transceiver (e.g.
                    // because the device was unplugged, or because the track was stopped while the
                    // call was being set up). Treat it like a missing device, so that it is
                    // detached and the capture state is announced as 'off', instead of claiming a
                    // device that cannot deliver any media.
                    const acquired =
                        capture.capture.status === 'acquired' &&
                        capture.capture.track.readyState !== 'ended'
                            ? capture.capture.track
                            : undefined;
                    const track = acquired ?? null;
                    const announce = capture.isEnabled && acquired !== undefined ? 'on' : 'off';

                    try {
                        const {sender} = transceivers[source];
                        if (sender.track !== track) {
                            await sender.replaceTrack(track);
                        }
                        // Note: Re-read, because the state may have moved on while the track was
                        // being replaced, and because announcing an unchanged state would send a
                        // needless message to every other participant.
                        if (call.state.get().local.capture[source].state !== announce) {
                            await call.controller.localCaptureState(source, announce);
                        }
                    } catch (error) {
                        // The peer connection may have been closed in the meantime (e.g. because
                        // the call ended while we were acquiring the device). This must not keep
                        // the remaining sources from being attached and announced.
                        log.warn(`Attaching the ${source} to the call failed`, error);
                    }
                }
            })
            .catch((error: unknown) => {
                log.error('Attaching the local capture devices to the call failed', error);
            });
    }

    function reportFailure(source: ProtocolMediaDeviceSource, capture: LocalCapture): void {
        const error = capture.status === 'failed' ? capture.error : undefined;
        if (error === failures.get(source)) {
            return;
        }
        failures.set(source, error);
        if (error === undefined) {
            return;
        }
        log.warn(`Capturing the ${source} failed`, error);

        switch (source) {
            case 'camera':
                toast.addDismissable(
                    i18n
                        .get()
                        .t(
                            'messaging.error--call-camera-unavailable',
                            'Camera could not be turned on',
                        ),
                    FAILURE_ICON,
                );
                break;

            case 'microphone':
                toast.addDismissable(
                    i18n
                        .get()
                        .t(
                            'messaging.error--call-microphone-unavailable',
                            'Microphone could not be turned on',
                        ),
                    FAILURE_ICON,
                );
                break;

            case 'screen':
                // Dismissing the platform's own picker is how one says "never mind", so it is not a
                // failure to report.
                if (error instanceof MediaDevicePermissionDeniedByUserError) {
                    break;
                }
                toast.addDismissable(
                    error instanceof MediaDeviceTimeoutError
                        ? i18n
                              .get()
                              .t(
                                  'messaging.error--picker-time-out',
                                  'Screen sharing timed out. Please try again.',
                              )
                        : i18n
                              .get()
                              .t(
                                  'messaging.error--call-screen-sharing-unavailable',
                                  'Screen could not be shared',
                              ),
                    FAILURE_ICON,
                );
                break;

            default:
                break;
        }
    }

    /**
     * Show or hide the platform's reminder that a screen is being shared.
     *
     * Note: Driven by the state rather than by the toggle, so that it also disappears when the user
     * ends the sharing through the platform's own control instead of ours.
     */
    function updateReminder(state: LocalDevicesState): void {
        const isSharing = state.display.isEnabled && state.display.capture.status === 'acquired';
        if (isSharing === isScreenSharingReminderVisible) {
            return;
        }
        isScreenSharingReminderVisible = isSharing;

        if (!isSharing) {
            electron.closeScreenSharingReminder();
            return;
        }
        electron.showScreenSharingReminder(
            i18n
                .get()
                .t('messaging.hint--call-screen-sharing-enabled', 'You are sharing your screen'),
            i18n.get().t('messaging.label--call-screen-sharing-stop', 'Stop sharing'),
        );
    }

    function stopScreenSharing(): void {
        devices.display.disable().catch((error: unknown) => {
            log.error('Stopping screen sharing failed', error);
        });
    }

    /**
     * Remember which device the user chose, so the next call opens the same one.
     *
     * Note: What is remembered is the device's label, because its identifier is scoped to the
     * origin and the browsing session. `LocalDevices` accepts a label as a selection and resolves
     * it whenever the device list changes, so a device which is currently unplugged needs no
     * special handling. There is nothing to remember while the platform withholds the label.
     */
    async function persistSelection(source: 'camera' | 'microphone' | 'speaker'): Promise<void> {
        const state = devices.state[source];
        const label =
            state.selection.type === 'system-default'
                ? SYSTEM_DEFAULT_LABEL
                : state.selected?.label;
        if (label === undefined) {
            return;
        }
        switch (source) {
            case 'camera':
                await services.settings.update({
                    type: 'calls',
                    update: {lastSelectedCamera: label},
                });
                break;
            case 'microphone':
                await services.settings.update({
                    type: 'calls',
                    update: {lastSelectedMicrophone: label},
                });
                break;
            case 'speaker':
                await services.settings.update({
                    type: 'calls',
                    update: {lastSelectedSpeakers: label},
                });
                break;
            default:
                unreachable(source);
        }
    }

    const unsubscribe = devices.subscribe((state) => {
        reportFailure('microphone', state.microphone.capture);
        reportFailure('camera', state.camera.capture);
        reportFailure('screen', state.display.capture);
        updateReminder(state);
        attach();
        onchange(state);
    });

    // The reminder's own button, which is part of the platform's window rather than of ours.
    electron.registerOnScreenSharingStopCallback(stopScreenSharing);

    // Restore the devices the user selected last time, then start with the microphone on and the
    // camera off, as before. Note: The call may mute the microphone again right after joining, in
    // which case `attach` adopts that decision.
    //
    // Note: Awaited by `attach`, so it must settle rather than reject.
    const defaultCaptureState = (async (): Promise<void> => {
        const {lastSelectedCamera, lastSelectedMicrophone, lastSelectedSpeakers} =
            services.settings.views.calls.get();
        await Promise.all([
            devices.microphone.select(selectionFromPersistedLabel(lastSelectedMicrophone)),
            devices.camera.select(selectionFromPersistedLabel(lastSelectedCamera)),
            devices.speaker.select(selectionFromPersistedLabel(lastSelectedSpeakers)),
        ]);
        await devices.microphone.enable();

        // The platform leaves the audio graph suspended until the page has been interacted with. By
        // the time a call is on screen the user has clicked something, so this normally takes
        // effect immediately.
        await devices.speaker.resume();
    })().catch((error: unknown) => {
        log.error('Setting up the local capture devices failed', error);
    });

    return {
        devices,
        attach,
        close: () => {
            unsubscribe();
            if (isScreenSharingReminderVisible) {
                electron.closeScreenSharingReminder();
                isScreenSharingReminderVisible = false;
            }
            devices.close();
        },
        selectCamera: async (selection) => {
            await devices.camera.select(selection);
            await persistSelection('camera');
        },
        selectMicrophone: async (selection) => {
            await devices.microphone.select(selection);
            await persistSelection('microphone');
        },
        selectSpeaker: async (selection) => {
            await devices.speaker.select(selection);
            await persistSelection('speaker');
        },
        toggleScreenSharing: () => {
            devices.display.toggle();
        },
    };
}
