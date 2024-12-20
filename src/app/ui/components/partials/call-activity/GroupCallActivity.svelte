<!--
  @component Renders the group call activity sidebar.
-->
<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import {size} from '~/app/ui/actions/size';
  import {
    startCall,
    type AnyExtendedGroupCallContextAbort,
    selectInitialCaptureDevices,
    attachLocalDeviceAndAnnounceCaptureState,
    type ActivityLayout,
    updateRemoteParticipantRemoteCameras,
    createCaptureDevices,
    selectMicrophoneDevice,
    selectCameraDevice,
    findMediaDevice,
  } from '~/app/ui/components/partials/call-activity/helpers';
  import ControlBar from '~/app/ui/components/partials/call-activity/internal/control-bar/ControlBar.svelte';
  import type {
    AudioInputDeviceInfo,
    AudioOutputDeviceInfo,
    VideoDeviceInfo,
  } from '~/app/ui/components/partials/call-activity/internal/control-bar/types';
  import TopBar from '~/app/ui/components/partials/call-activity/internal/top-bar/TopBar.svelte';
  import type {GroupCallActivityProps} from '~/app/ui/components/partials/call-activity/props';
  import type {AugmentedOngoingGroupCallViewModelBundle} from '~/app/ui/components/partials/call-activity/transformer';
  import ParticipantFeed from '~/app/ui/components/partials/call-participant-feed/ParticipantFeed.svelte';
  import type {ParticipantFeedProps} from '~/app/ui/components/partials/call-participant-feed/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbGroupReceiverLookup} from '~/common/db';
  import type {ParticipantId} from '~/common/network/protocol/call/group-call';
  import type {Dimensions, u53} from '~/common/types';
  import {assert, assertUnreachable, unreachable, unwrap} from '~/common/utils/assert';
  import {byteEquals} from '~/common/utils/byte';
  import type {Remote} from '~/common/utils/endpoint';
  import {AsyncLock} from '~/common/utils/lock';
  import {difference} from '~/common/utils/set';
  import {AbortRaiser} from '~/common/utils/signal';
  import type {RemoteStore} from '~/common/utils/store';
  import {TIMER} from '~/common/utils/timer';
  import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
  import type {SelfReceiverData} from '~/common/viewmodel/utils/receiver';

  type $$Props = GroupCallActivityProps;

  const audioContext = new AudioContext();
  const incomingAudioSink = audioContext.createMediaStreamDestination();

  export let isExpanded: $$Props['isExpanded'];
  export let services: $$Props['services'];

  const FEED_MIN_WIDTH_PX = 256;
  const FEED_PADDING_PX = 16;

  const {router} = services;
  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.call-activity');

  const audioElementAsyncLock = new AsyncLock();

  let containerLayout: ActivityLayout = 'regular';
  let feedContainerElement: SvelteNullableBinding<HTMLDivElement> = null;

  let audioElement: SvelteNullableBinding<HTMLAudioElement> = null;

  // Maps from track to the associated media stream and the node that receives said stream.
  let audioTracksMap:
    | Map<
        MediaStreamTrack,
        {readonly stream: MediaStream; readonly node: MediaStreamAudioSourceNode}
      >
    | undefined = undefined;
  let audioSinkDeviceId: string | undefined = undefined;

  const {guard: localDevicesGuard, store: localDevices} = createCaptureDevices();
  let localFeed: Omit<ParticipantFeedProps<'local'>, 'activity' | 'services'> | undefined;

  let stop: AbortRaiser<AnyExtendedGroupCallContextAbort> | undefined;
  let call: AugmentedOngoingGroupCallViewModelBundle | undefined;
  let remoteFeeds: readonly Omit<ParticipantFeedProps<'remote'>, 'activity' | 'services'>[] = [];

  let feeds: readonly Omit<ParticipantFeedProps<'local' | 'remote'>, 'activity' | 'services'>[] =
    [];
  $: feeds = [...(localFeed !== undefined ? [localFeed] : []), ...remoteFeeds];

  const dispatch = createEventDispatcher<{
    clicktoggleexpand: undefined;
  }>();

  function handleChangeSizeContainerElement(
    event: CustomEvent<{entries: ResizeObserverEntry[]}>,
  ): void {
    const width = event.detail.entries[0]?.contentRect.width;

    requestAnimationFrame(() => {
      containerLayout = (width ?? 0) < FEED_MIN_WIDTH_PX ? 'pocket' : 'regular';
    });
  }

  /**
   * Handle updating audible audio streams if any of the feeds change (i.e., a feed is muted).
   */
  async function handleUpdateAudioFeeds(
    currentAudioElement: SvelteNullableBinding<HTMLAudioElement>,
    currentFeeds: typeof feeds,
  ): Promise<void> {
    return await audioElementAsyncLock.with(() => {
      if (currentAudioElement === null) {
        return;
      }
      // We attach the stream to the audio element's source object only once.
      if (audioTracksMap === undefined) {
        audioTracksMap = new Map();
        currentAudioElement.srcObject = incomingAudioSink.stream;
      }

      const activeAudioTracks = new Set([...audioTracksMap.keys()]);
      const currentAudioTracks = new Set(
        currentFeeds
          .filter((feed): feed is (typeof remoteFeeds)[u53] => feed.type === 'remote')
          .map((feed) => feed.tracks.microphone),
      );

      // `svelte-eslint` doesn't seem to support `Set.difference` yet.
      const newAudioTracks = difference(currentAudioTracks, activeAudioTracks);
      const lostAudioTracks = difference(activeAudioTracks, currentAudioTracks);

      for (const track of newAudioTracks) {
        if (audioTracksMap.has(track)) {
          log.warn('Tried to add a media stream track that already exists.');
          continue;
        }
        const stream = new MediaStream([track]);
        const node = audioContext.createMediaStreamSource(stream);
        node.connect(incomingAudioSink);
        // Workaround because of https://issues.chromium.org/issues/40094084
        new Audio().srcObject = stream;
        audioTracksMap.set(track, {stream, node});
      }
      for (const trackId of lostAudioTracks) {
        const mapEntry = audioTracksMap.get(trackId);
        if (mapEntry === undefined) {
          log.warn('Tried to a remove an audio stream that did not exist');
          continue;
        }
        mapEntry.node.disconnect(incomingAudioSink);
        audioTracksMap.delete(trackId);
      }
    });
  }

  /**
   * Handle updating the active audio sink (speaker).
   */
  async function handleUpdateAudioSink(
    currentAudioElement: SvelteNullableBinding<HTMLAudioElement>,
    currentAudioSinkDeviceId: typeof audioSinkDeviceId,
    // Needed to update audio sink when feeds change.
    currentFeeds: typeof feeds,
  ): Promise<void> {
    return await audioElementAsyncLock.with(async () => {
      if (currentAudioElement === null) {
        return undefined;
      }
      if (currentAudioSinkDeviceId === undefined) {
        return undefined;
      }

      // Return early, because if the `<audio>` element doesn't have any media tracks, setting the
      // audio sink would fail.
      if (!(currentAudioElement.srcObject instanceof MediaStream)) {
        return undefined;
      }
      if (currentAudioElement.srcObject.getTracks().length === 0) {
        return undefined;
      }

      return await currentAudioElement.setSinkId(currentAudioSinkDeviceId);
    });
  }

  const handleUpdateCameraSubscription = TIMER.debounceWithDistinctArgs(
    (dimensions: Dimensions | undefined, participantId: 'local' | ParticipantId) => {
      if (call === undefined || stop === undefined || participantId === 'local') {
        // If call is `undefined` (i.e., not running) or not started, there's no need to un- or
        // resubscribe the camera feed. Additionally, if it's the user's own camera feed, there's no
        // need to manage it.
        return;
      }

      updateRemoteParticipantRemoteCameras({
        controller: call.controller,
        participantId,
        dimensions,
      }).catch((error) => {
        log.error('Updating remote camera subscription failed', error);
        stop?.raise({origin: 'ui-component', cause: 'unexpected-error'});
      });
    },
    500,
    // Debounce using `distinctArgs` and use the participant id as the key, so the debounced
    // function is called once for each participant.
    (_, id) => `${id}`,
    true,
  );

  function handleSelectAudioInputDevice(device: AudioInputDeviceInfo): void {
    selectMicrophoneDevice(localDevicesGuard, call, {
      device: {
        deviceId: device.deviceId,
      },
      state: ($localDevices.microphone?.track.enabled ?? false) ? 'on' : 'off',
    })
      .then(async () => {
        await services.settings.update({
          type: 'calls',
          update: {lastSelectedMicrophone: device.label},
        });
        log.debug(`Selected microphone device "${device.label}" was saved to settings`);
      })
      .catch((error) => {
        log.error(`Error selecting or saving selected microphone device ${device.label}: ${error}`);
      });
  }

  function handleSelectAudioOutputDevice(device: AudioOutputDeviceInfo): void {
    audioSinkDeviceId = device.deviceId;
    services.settings
      .update({
        type: 'calls',
        update: {
          lastSelectedSpeakers: device.label,
        },
      })
      .then(() => {
        log.debug(`Selected speaker device "${device.label}" was saved to settings`);
      })
      .catch((error) => {
        log.error(`Error saving selected speaker device "${device.label}" to settings: ${error}`);
      });
  }

  function handleSelectVideoDevice(device: VideoDeviceInfo): void {
    selectCameraDevice(localDevicesGuard, call, {
      device: {
        deviceId: device.deviceId,
      },
      facing: 'user',
      state: ($localDevices.camera?.track.enabled ?? false) ? 'on' : 'off',
    })
      .then(async () => {
        await services.settings.update({type: 'calls', update: {lastSelectedCamera: device.label}});
        log.debug(`Selected camera device "${device.label}" was saved to settings`);
      })
      .catch((error) => {
        log.warn(`Error selecting or saving selected camera device ${device.label}: ${error}`);
      });
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }

    if (isExpanded && event.key === 'Escape') {
      dispatch('clicktoggleexpand');
    }
  }

  function handleClickLeaveCall(): void {
    // Stop any ongoing call
    stop?.raise({origin: 'ui-component', cause: 'user-hangup'});

    // Navigate away
    //
    // Note: This automatically stops capturing.
    router.go({activity: 'close'});
  }

  function setMicrophoneCaptureState(state: 'on' | 'off' | 'toggle'): void {
    localDevicesGuard
      .with(async (store) => {
        const microphone = store.get().microphone;
        return await attachLocalDeviceAndAnnounceCaptureState(
          localDevicesGuard,
          call,
          store,
          'microphone',
          microphone === undefined
            ? undefined
            : {
                track: microphone.track,
                state,
              },
        );
      }, 'attach')
      .catch((error) => {
        log.error(`Setting local microphone capture state failed`, error);
        stop?.raise({origin: 'ui-component', cause: 'unexpected-error'});
      });
  }

  function setCameraCaptureState(state: 'on' | 'off' | 'toggle'): void {
    localDevicesGuard
      .with(async (store) => {
        const camera = store.get().camera;
        return await attachLocalDeviceAndAnnounceCaptureState(
          localDevicesGuard,
          call,
          store,
          'camera',
          camera === undefined
            ? undefined
            : {
                track: camera.track,
                state,
              },
        );
      }, 'attach')
      .catch((error) => {
        log.error(`Setting local camera capture state failed`, error);
        stop?.raise({origin: 'ui-component', cause: 'unexpected-error'});
      });
  }

  // Setup media devices at startup.
  //
  // Note: Microphone capture will be 'on' by default whereas camera capture will be 'off' by
  // default. However, the call may auto-mute the microphone after joining.
  const {lastSelectedCamera, lastSelectedMicrophone, lastSelectedSpeakers} =
    services.settings.views.calls.get();
  // Camera & Microphone
  selectInitialCaptureDevices(
    log,
    localDevicesGuard,
    {microphone: 'on', camera: 'off'},
    {
      preferredDevices: {
        camera:
          lastSelectedCamera === undefined
            ? {type: 'default'}
            : {type: 'by-device-label', deviceLabel: lastSelectedCamera, kind: 'videoinput'},
        microphone:
          lastSelectedMicrophone === undefined
            ? {type: 'default'}
            : {type: 'by-device-label', deviceLabel: lastSelectedMicrophone, kind: 'audioinput'},
      },
    },
  ).catch((error) => {
    log.error(`Setting initial local capture devices failed`, error);
    stop?.raise({origin: 'ui-component', cause: 'unexpected-error'});
  });
  // Speakers
  audioElementAsyncLock
    .with(async () => {
      if (lastSelectedSpeakers === undefined) {
        return;
      }
      const initialAudioSinkDevice = await findMediaDevice('audiooutput', lastSelectedSpeakers);
      if (initialAudioSinkDevice === undefined) {
        return;
      }

      audioSinkDeviceId = initialAudioSinkDevice.deviceId;
    })
    .catch((error) => {
      log.error(`Error setting initial speaker device: ${error}`);
    });

  // Update local feed
  let user: RemoteStore<SelfReceiverData> | undefined;
  services.backend.viewModel
    .user()
    .then((user_) => (user = user_))
    .catch(assertUnreachable);
  $: {
    if (user !== undefined && $user !== undefined) {
      localFeed = {
        type: 'local',
        capture: {
          camera: $localDevices.camera?.state ?? 'off',
          microphone: $localDevices.microphone?.state ?? 'off',
        },
        container: feedContainerElement,
        updateCameraSubscription: (dimensions) =>
          handleUpdateCameraSubscription(dimensions, 'local'),
        participantId: 'local',
        receiver: $user,
        tracks: {
          type: 'local',
          camera: $localDevices.camera?.track,
        },
      };
    }
  }

  async function start(
    conversation: Remote<ConversationViewModelBundle>,
    intent: 'join' | 'join-or-create',
  ): Promise<void> {
    // Stop any previous call
    stop?.raise({origin: 'ui-component', cause: 'switching-call'});

    // Reset call state when stopped
    const stop_ = new AbortRaiser<AnyExtendedGroupCallContextAbort>();
    stop = stop_;
    stop_.subscribe((event) => {
      log.info('Group call stopped', event);

      switch (event.cause) {
        case 'disconnected':
          toast.addSimpleFailure(
            $i18n.t(
              'messaging.error--call-disconnected',
              'Call ended because the connection was interrupted',
            ),
          );
          break;

        case 'group-left-kicked-or-removed':
          toast.addSimpleFailure(
            $i18n.t(
              'messaging.error--call-group-left-kicked-or-removed',
              'Group call ended because you left the group',
            ),
          );
          break;

        case 'group-calls-disabled':
          toast.addSimpleFailure(
            $i18n.t('messaging.error--call-group-calls-disabled', 'Group calls are disabled'),
          );
          break;

        case 'call-not-running':
          toast.addSimpleFailure(
            $i18n.t('messaging.error--call-not-running', 'Call has already ended'),
          );
          break;

        case 'call-full':
          toast.addSimpleFailure(
            $i18n.t(
              'messaging.error--call-group-full',
              'Maximum reached: No more participants can join this group call',
            ),
          );
          break;

        case 'disconnected-due-to-inactivity':
          toast.addSimple(
            $i18n.t(
              'messaging.error--call-disconnected-due-to-inactivity',
              'Call ended due to inactivity',
            ),
          );
          break;

        case 'destroy':
          // UI component which hosted the group call was destroyed. Just show the user an info that
          // the group call has ended.
          toast.addSimple($i18n.t('messaging.hint--call-ended', 'Call ended'));
          break;

        case 'user-hangup':
        case 'switching-call':
          // No toast, as these are fairly regular (mostly expected) events which should be silent.
          break;

        case 'unexpected-error':
          // Generic, unknown errors.
          toast.addSimpleFailure(
            $i18n.t(
              'messaging.error--call-unexpected-error',
              'Call ended due to an unexpected error',
            ),
          );
          break;

        default:
          unreachable(event);
      }

      // Reset call state
      stop = undefined;
      call = undefined;
      remoteFeeds = [];

      // Navigate away, if needed
      if (
        event.origin !== 'ui-component' ||
        (event.cause !== 'switching-call' && event.cause !== 'destroy')
      ) {
        router.go({activity: 'close'});
      }
    });

    // Start call
    try {
      call = await startCall(services, log, conversation, intent, stop_);
    } catch (error) {
      if (!stop_.aborted) {
        log.error('Unable to start group call', error);
        stop_.raise({origin: 'ui-component', cause: 'unexpected-error'});
      }
      return;
    }
    if (call === undefined) {
      assert(intent === 'join');
      log.debug('Intent to join but group call already stopped');
      router.go({activity: 'close'});
      return;
    }

    // Update remote feeds whenever there is a change to the remote participant state
    //
    // Note: This automatically unsubscribes updates to the view once the call stops.
    stop_.subscribe(
      call.state.subscribe((state) => {
        if (call === undefined || stop === undefined) {
          return;
        }

        // Update feeds state
        remoteFeeds = state.remote.map(
          (participant): Omit<ParticipantFeedProps<'remote'>, 'activity' | 'services'> => ({
            type: 'remote',
            capture: participant.capture,
            container: feedContainerElement,
            updateCameraSubscription: (dimensions) =>
              handleUpdateCameraSubscription(dimensions, participant.id),
            participantId: participant.id,
            receiver: participant.receiver,
            tracks: {
              type: 'remote',
              microphone: participant.transceivers.microphone.receiver.track,
              camera: participant.transceivers.camera.receiver.track,
            },
          }),
        );
      }),
    );

    // Attach local tracks to local transceivers, mute microphone if desired by the group call and
    // otherwise announce devices as defined by the user.
    //
    // Note: Because starting the call is async and the user may change the capture state in
    // between, we'll need to do this explicitly here.
    localDevicesGuard
      .with(async (store) => {
        if (call === undefined) {
          return;
        }
        const {microphone, camera} = store.get();
        await attachLocalDeviceAndAnnounceCaptureState(
          localDevicesGuard,
          call,
          store,
          'microphone',
          microphone === undefined
            ? undefined
            : {
                state:
                  call.state.get().local.capture.microphone === 'off' ? 'off' : microphone.state,
                track: microphone.track,
              },
        );
        await attachLocalDeviceAndAnnounceCaptureState(
          localDevicesGuard,
          call,
          store,
          'camera',
          camera,
        );
      }, 'attach')
      .catch((error) => {
        log.error(`Attaching local capture devices to new call failed`, error);
        stop?.raise({origin: 'ui-component', cause: 'unexpected-error'});
      });
  }

  // Start call and switch whenever the receiver changes.
  //
  // Note: The current device states intentionally transition into the next call.
  let group: DbGroupReceiverLookup | undefined;
  let conversation: Remote<ConversationViewModelBundle> | undefined;
  let store: Remote<ConversationViewModelBundle>['viewModelStore'] | undefined;
  $: if ($router.activity?.id === 'call') {
    const {receiverLookup: receiver, intent} = $router.activity.params;
    if (group?.uid !== receiver.uid) {
      group = receiver;
      services.backend.viewModel
        .conversation(receiver)
        .then(async (conversation_) => {
          conversation = unwrap(conversation_);
          store = conversation.viewModelStore;
          return await start(conversation, intent);
        })
        .catch(assertUnreachable);
    }
  } else {
    group = undefined;
    conversation = undefined;
    store = undefined;
  }

  // Switch to chosen call when it changes while we're in a call.
  //
  // Note: `conversation` and `store` change whenever we switch to a different group.
  // `$store.call.id` will then give us a different Group Call ID if the chosen call is different to
  // the one we are currently in which is our indicator to switch.
  $: if (
    conversation !== undefined &&
    store !== undefined &&
    call !== undefined &&
    $store?.call?.id !== undefined &&
    !byteEquals(call.context.callId.bytes, $store.call.id.bytes)
  ) {
    log.debug('Switching to chosen group call');
    start(conversation, 'join').catch(assertUnreachable);
  }

  $: handleUpdateAudioFeeds(audioElement, feeds).catch((error) => {
    log.error(`Error updating audio feeds: ${error}`);
  });

  $: handleUpdateAudioSink(audioElement, audioSinkDeviceId, feeds).catch((error) => {
    log.error(`Error updating audio sink: ${error}`);
  });

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);

    return () => window.removeEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    // Stop any ongoing call.
    stop?.raise({origin: 'ui-component', cause: 'destroy'});

    // Stop capturing.
    localDevicesGuard
      .with((localDevicesStore) => {
        const devices = localDevicesStore.get();
        devices.microphone?.track.stop();
        devices.camera?.track.stop();
      }, 'stop')
      .catch(assertUnreachable);

    audioTracksMap?.clear();
    void audioContext.close().catch(assertUnreachable);
  });
</script>

<div
  use:size
  class="container"
  class:expanded={isExpanded}
  style:--c-t-feed-padding={`${FEED_PADDING_PX}px`}
  data-layout={containerLayout}
  on:changesize={handleChangeSizeContainerElement}
>
  <div class="top-bar">
    <TopBar
      {isExpanded}
      state={call === undefined
        ? {type: 'connecting'}
        : {
            type: 'connected',
            startedAt: call.context.startedAt,
            nParticipants: feeds.length,
          }}
      on:clicktoggleexpand
    />
  </div>

  <div bind:this={feedContainerElement} class="content">
    <audio bind:this={audioElement} autoplay playsinline />

    <div class="feeds">
      {#each feeds as feed (feed.participantId)}
        <ParticipantFeed {...feed} activity={{layout: containerLayout}} {services} />
      {/each}
    </div>

    <div class="footer">
      <ControlBar
        currentAudioInputDeviceId={$localDevices.microphone?.track.getSettings().deviceId}
        currentAudioOutputDeviceId={audioSinkDeviceId}
        currentVideoDeviceId={$localDevices.camera?.track.getSettings().deviceId}
        isAudioEnabled={$localDevices.microphone?.track.enabled ?? false}
        isVideoEnabled={$localDevices.camera?.track.enabled ?? false}
        onSelectAudioInputDevice={handleSelectAudioInputDevice}
        onSelectAudioOutputDevice={handleSelectAudioOutputDevice}
        onSelectVideoDevice={handleSelectVideoDevice}
        on:clickleavecall={handleClickLeaveCall}
        on:clicktoggleaudio={() => setMicrophoneCaptureState('toggle')}
        on:clicktogglevideo={() => setCameraCaptureState('toggle')}
      />
    </div>
  </div>
</div>

<style lang="scss">
  @use 'component' as *;

  $-vars: (feed-padding);
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  .container {
    display: grid;
    grid-template:
      'top-bar' rem(64px)
      'content' minmax(0, 1fr)
      / 100%;

    .top-bar {
      grid-area: top-bar;

      border-bottom: 1px solid var(--t-panel-gap-color);
      padding: rem(12px) rem(16px) rem(16px) rem(16px);
    }

    .content {
      grid-area: content;

      display: grid;
      grid-template:
        'feeds' minmax(0, 1fr)
        'footer' minmax(0, auto)
        / 100%;

      position: relative;

      audio {
        display: none;
      }

      .feeds {
        grid-area: feeds / feeds / footer / footer;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: start;
        gap: rem(12px);

        overflow-y: auto;
        padding: var($-temp-vars, --c-t-feed-padding) 0
          calc(172px + var($-temp-vars, --c-t-feed-padding)) 0;
        scroll-padding-bottom: calc(172px + var($-temp-vars, --c-t-feed-padding));
        scrollbar-width: none;
      }

      .footer {
        grid-area: footer;

        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;

        position: sticky;
        left: 0;
        right: 0;
        bottom: 0;

        padding: 0 0 rem(12px);

        &::after {
          content: '';
          pointer-events: none;

          position: fixed;
          z-index: -1;
          background: linear-gradient(
            to top,
            var(--t-aside-background-color) 0%,
            var(--t-aside-background-color) 90%,
            transparent 100%
          );
          left: 0;
          right: 0;
          bottom: 0;
          height: calc(rem(172px) + var($-temp-vars, --c-t-feed-padding));
        }
      }
    }
  }

  .container[data-layout='regular'] {
    .top-bar {
      padding: rem(12px) rem(12px) rem(16px) rem(16px);
    }

    .content {
      grid-template:
        'feeds' minmax(0, 1fr)
        'footer' 88px
        / 100%;

      .feeds {
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        grid-auto-rows: min-content;
        gap: rem(8px);

        padding: var($-temp-vars, --c-t-feed-padding);
        padding-bottom: calc(12px + 64px + var($-temp-vars, --c-t-feed-padding));
        scroll-padding-bottom: calc(12px + 64px + var($-temp-vars, --c-t-feed-padding));
      }

      .footer {
        padding: rem(12px);

        &::after {
          background: linear-gradient(
            to top,
            var(--t-aside-background-color) 0%,
            var(--t-aside-background-color) 25%,
            transparent 100%
          );
          height: rem(90px);
        }
      }
    }
  }

  .container[data-layout='pocket'],
  .container[data-layout='regular'] {
    &.expanded {
      background-color: rgb(38, 38, 38);

      .top-bar {
        border-bottom: 1px solid transparent;
      }

      .content .footer::after {
        background: none;
      }
    }
  }

  @container activity (min-width: 512px) {
    .container[data-layout='regular'] > .content > .feeds {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @container activity (min-width: 768px) {
    .container[data-layout='regular'] > .content > .feeds {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @container activity (min-width: 1024px) {
    .container[data-layout='regular'] > .content > .feeds {
      grid-template-columns: repeat(4, 1fr);
    }
  }
</style>
