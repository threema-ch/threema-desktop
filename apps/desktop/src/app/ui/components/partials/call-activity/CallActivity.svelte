<!--
  @component Renders a panel containing the UI of a call.
-->
<script lang="ts">
  import type {EnumerableMediaDevice, LocalDevicesState} from '@threema/dom';
  import {byteEquals} from '@threema/ts-utils/byte/byte-equals';
  import type {u53} from '@threema/ts-utils/integer/u53';
  import {CallView, ContextMenu, type CallViewFeed, type FeedLabels} from '@threema/ui';
  import {onDestroy, onMount} from 'svelte';
  import {SvelteMap} from 'svelte/reactivity';

  import {globals} from '~/app/globals';
  import {createRemoteDemand} from '~/app/ui/components/partials/call-activity/demand';
  import {createCallDevices} from '~/app/ui/components/partials/call-activity/devices';
  import {
    getToastForAbortEvent,
    startCall,
    type AnyExtendedGroupCallContextAbort,
  } from '~/app/ui/components/partials/call-activity/helpers';
  import Header from '~/app/ui/components/partials/call-activity/internal/header/Header.svelte';
  import type {CallActivityProps} from '~/app/ui/components/partials/call-activity/props';
  import type {
    AugmentedOngoingGroupCallStateViewModel,
    AugmentedOngoingGroupCallViewModelBundle,
    AugmentedRemoteParticipantStateViewModel,
  } from '~/app/ui/components/partials/call-activity/transformer';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {reactive} from '~/app/ui/utils/svelte';
  import type {DbGroupReceiverLookup} from '~/common/db';
  import {assert, assertUnreachable, unwrap} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import {AbortRaiser} from '~/common/utils/signal';
  import type {RemoteStore, StoreUnsubscriber} from '~/common/utils/store';
  import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
  import type {GroupCallParticipantReceiverData} from '~/common/viewmodel/utils/call';
  import type {SelfReceiverData} from '~/common/viewmodel/utils/receiver';

  const {isExpanded, ontoggleexpand, services}: CallActivityProps = $props();

  const {electron, router} = services;
  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.call-activity');

  let stop = $state<AbortRaiser<AnyExtendedGroupCallContextAbort> | undefined>(undefined);
  // Note: `$state.raw`, so that Svelte does not wrap the viewmodel and the media objects it carries
  // in proxies.
  let call = $state.raw<AugmentedOngoingGroupCallViewModelBundle | undefined>(undefined);
  let callState = $state.raw<AugmentedOngoingGroupCallStateViewModel | undefined>(undefined);

  const demand = createRemoteDemand((kind, participantId, resolution) => {
    // Note: Reports are batched, so this may run after the call it belongs to has ended.
    const controller = call?.controller;
    if (controller === undefined) {
      return;
    }
    const intent =
      resolution === undefined
        ? ({type: 'unsubscribe'} as const)
        : ({type: 'subscribe', resolution} as const);

    const request =
      kind === 'camera'
        ? controller.remoteCamera(participantId, intent)
        : controller.remoteScreen(participantId, intent);
    request.catch((error: unknown) => {
      log.error(`Updating the ${kind} subscription of a participant failed`, error);
    });
  });

  let deviceState = $state.raw<LocalDevicesState | undefined>(undefined);
  const {
    attach: attachDevicesToCall,
    close: closeDevices,
    devices: localDevices,
    selectCamera,
    selectMicrophone,
    selectSpeaker,
    toggleScreenSharing,
  } = createCallDevices({
    electron,
    getCall: () => call,
    i18n,
    log,
    onchange: (state) => {
      deviceState = state;
    },
    services,
  });
  deviceState = localDevices.state;

  /**
   * Profile pictures of everyone in the call.
   *
   * Note: Keyed by receiver rather than by participant, because the same contact can be present in
   * a call more than once (from several devices), including the user themselves.
   */
  const images = new SvelteMap<string, Blob | undefined>();
  /**
   * Holds the unsubscribers for profile picture subscriptions.
   *
   * Note: Deliberately a plain `Map` rather than a `SvelteMap`. The effect which maintains it both
   * reads and writes it, so a reactive map would invalidate that effect from inside itself.
   */
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const imageSubscriptions = new Map<string, StoreUnsubscriber | undefined>();

  function getImageKey(receiver: GroupCallParticipantReceiverData | SelfReceiverData): string {
    return receiver.type === 'self' ? 'self' : `${receiver.lookup.type}.${receiver.lookup.uid}`;
  }

  async function loadImage(
    key: string,
    receiver: GroupCallParticipantReceiverData | SelfReceiverData,
  ): Promise<void> {
    const store =
      receiver.type === 'self'
        ? services.profilePicture.getProfilePictureForSelf()
        : await services.profilePicture.getProfilePictureForReceiver(receiver.lookup);

    // The receiver may have left the call while their store was being fetched.
    if (store === undefined || !imageSubscriptions.has(key)) {
      return;
    }
    imageSubscriptions.set(
      key,
      store.subscribe((value) => images.set(key, value?.blob)),
    );
  }

  let user = $state<RemoteStore<SelfReceiverData> | undefined>(undefined);
  services.backend.viewModel
    .user()
    .then((user_) => (user = user_))
    .catch(assertUnreachable);

  const isCameraEnabled = $derived(deviceState?.camera.isEnabled ?? false);
  const isMicrophoneEnabled = $derived(deviceState?.microphone.isEnabled ?? false);
  const isScreenShared = $derived(deviceState?.display.isEnabled ?? false);
  const isScreenSharingAllowed = $derived(
    // We can be sure that this feature is deployed in non-OnPrem builds.
    import.meta.env.BUILD_ENVIRONMENT === 'onprem'
      ? (call?.context.supportedFeatures.screenShare ?? false)
      : import.meta.env.BUILD_FLAVOR !== 'consumer-live',
  );
  const cameraDevices = $derived(deviceState?.camera.devices ?? []);
  const microphoneDevices = $derived(deviceState?.microphone.devices ?? []);
  const speakerDevices = $derived(deviceState?.speaker.devices ?? []);

  const labels = $derived<FeedLabels>({
    collapse: $i18n.t('messaging.label--call-video-collapse', 'Collapse'),
    expand: $i18n.t('messaging.label--call-video-expand', 'Expand'),
    fullscreen: $i18n.t('messaging.label--call-video-fullscreen', 'Full screen'),
    muted: $i18n.t('messaging.label--call-participant-muted', 'Microphone is muted'),
    pictureInPicture: $i18n.t('messaging.label--call-video-pip', 'Picture-in-Picture'),
  });

  /**
   * One `MediaStream` per remote track. Keeps `MediaStream`s stable as long as the track is the
   * same, which prevents re-attaching streams in the UI that haven't actually changed.
   *
   * Note: A `WeakMap` needs no housekeeping, because a receiver's track is created once and lives
   * exactly as long as the transceiver it belongs to.
   */
  const streams = new WeakMap<MediaStreamTrack, MediaStream>();

  function getStream(track: MediaStreamTrack): MediaStream {
    let stream = streams.get(track);
    if (stream === undefined) {
      stream = new MediaStream([track]);
      streams.set(track, stream);
    }
    return stream;
  }

  function describe(name: string): string {
    return $i18n.t('messaging.label--call-video-of-participant', 'Video of {name}', {name});
  }

  function buildRemoteFeed(
    participant: AugmentedRemoteParticipantStateViewModel,
    kind: 'camera' | 'screen',
  ): CallViewFeed {
    const {receiver} = participant;
    const track =
      kind === 'camera'
        ? participant.transceivers.camera.receiver.track
        : participant.transceivers.screen.receiver.track;

    return {
      alt: describe(receiver.name),
      color: receiver.color,
      id: `${kind}-${participant.id}`,
      image: images.get(getImageKey(receiver)),
      initials: receiver.initials,
      isMuted: participant.capture.microphone.state === 'off',
      kind: kind === 'camera' ? 'camera' : 'display',
      label: receiver.name,
      onchangepresentation: (presentation) => demand.report(kind, participant.id, presentation),
      stream: participant.capture[kind].state === 'on' ? getStream(track) : undefined,
    };
  }

  /**
   * The user's own feeds. Derived separately from the remote ones to decouple updates.
   */
  const localFeeds = $derived.by<{
    readonly cameras: readonly CallViewFeed[];
    readonly displays: readonly CallViewFeed[];
  }>(() => {
    const devices = deviceState;
    const self = $user;
    if (devices === undefined || self === undefined) {
      return {cameras: [], displays: []};
    }

    const commonFeedProps = {
      alt: describe(self.name),
      color: self.color,
      image: images.get(getImageKey(self)),
      initials: self.initials,
      isMuted: !devices.microphone.isEnabled,
      label: self.name,
    } as const;

    return {
      // The user's own camera, which is displayed even while it is off, in which case the avatar
      // takes its place.
      cameras: [
        {
          ...commonFeedProps,
          id: 'self-camera',
          // The user's own camera is mirrored to feel more natural.
          isMirrored: true,
          kind: 'camera',
          stream:
            devices.camera.isEnabled && devices.camera.capture.status === 'acquired'
              ? devices.camera.capture.stream
              : undefined,
        },
      ],
      // The user's own shared screen, if any. Note: The display source lets go of its capture as
      // soon as sharing stops, so a held capture means the screen is being shared.
      displays:
        devices.display.isEnabled && devices.display.capture.status === 'acquired'
          ? [
              {
                ...commonFeedProps,
                id: 'self-screen',
                kind: 'display',
                stream: devices.display.capture.stream,
              },
            ]
          : [],
    };
  });

  /**
   * The feeds of everyone else in the call.
   */
  const remoteFeeds = $derived.by<{
    readonly cameras: readonly CallViewFeed[];
    readonly displays: readonly CallViewFeed[];
  }>(() => {
    const cameras: CallViewFeed[] = [];
    const displays: CallViewFeed[] = [];

    for (const participant of callState?.remote ?? []) {
      if (participant.capture.screen.state === 'on') {
        displays.push(buildRemoteFeed(participant, 'screen'));
      }
      cameras.push(buildRemoteFeed(participant, 'camera'));
    }

    return {cameras, displays};
  });

  /**
   * The feeds of the call, in the order they should be displayed.
   */
  const feeds = $derived<readonly CallViewFeed[]>([
    ...localFeeds.displays,
    ...remoteFeeds.displays,
    ...localFeeds.cameras,
    ...remoteFeeds.cameras,
  ]);

  /**
   * Name of a device, which the platform withholds until the page was granted access to a device of
   * that kind.
   */
  function nameDevice(device: EnumerableMediaDevice, index: u53): string {
    return (
      device.label ?? $i18n.t('messaging.label--call-unnamed-device', 'Device {n}', {n: index + 1})
    );
  }

  function handleClickFeedExpand(): void {
    // Expand the panel if it is currently collapsed and a feed is clicked.
    if (!isExpanded) {
      ontoggleexpand?.();
    }
  }

  function handleClickLeaveCall(): void {
    // Stop any ongoing call.
    stop?.raise({origin: 'ui-component', cause: 'user-hangup'});

    // Navigate away.
    //
    // Note: This automatically stops capturing.
    router.go({activity: 'close'});
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }
    if (isExpanded && event.key === 'Escape') {
      ontoggleexpand?.(event);
    }
  }

  async function start(
    conversation: Remote<ConversationViewModelBundle>,
    intent: 'join' | 'join-or-create',
  ): Promise<void> {
    // Stop any previous call.
    stop?.raise({origin: 'ui-component', cause: 'switching-call'});

    // Reset call state when stopped.
    const stop_ = new AbortRaiser<AnyExtendedGroupCallContextAbort>();
    stop = stop_;
    stop_.subscribe((event) => {
      log.info('Group call stopped', event);

      const abortToast = getToastForAbortEvent($i18n, event);
      if (abortToast !== undefined) {
        if (abortToast.isFailure) {
          toast.addSimpleFailure(abortToast.text);
        } else {
          toast.addSimple(abortToast.text);
        }
      }

      // Stop sharing a screen, which is bound to the call which just ended.
      localDevices.display.disable().catch((error: unknown) => {
        log.error('Stopping screen sharing failed', error);
      });

      // Reset call state.
      stop = undefined;
      call = undefined;
      callState = undefined;
      demand.reset();

      // Navigate away, if needed.
      if (
        event.origin !== 'ui-component' ||
        (event.cause !== 'switching-call' && event.cause !== 'destroy')
      ) {
        router.go({activity: 'close'});
      }
    });

    // Start call.
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

    // Watch the state of the call.
    //
    // Note: This automatically unsubscribes updates to the view once the call stops.
    stop_.subscribe(
      call.state.subscribe((state) => {
        if (call === undefined || stop === undefined) {
          return;
        }
        callState = state;
      }),
    );

    // Hand the local tracks to the transceivers of the call which was just established, adopt the
    // call's own decision on the initial capture state, and announce their state.
    //
    // Note: Needed in addition to being run whenever a device changes, because starting a call is
    // asynchronous and the user may have changed a device while it was in flight.
    attachDevicesToCall({isNewCall: true});
  }

  // Start call and switch whenever the receiver changes.
  let group = $state<DbGroupReceiverLookup | undefined>(undefined);
  // Use `$state.raw` so that Svelte doesn't use proxies.
  let conversation = $state.raw<Remote<ConversationViewModelBundle> | undefined>(undefined);
  let store = $state<Remote<ConversationViewModelBundle>['viewModelStore'] | undefined>(undefined);

  $effect(() => {
    reactive(() => {
      if ($router.activity?.id === 'call') {
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
    }, [$router]);
  });

  // Switch to chosen call when it changes while we're in a call.
  //
  // Note: `conversation` and `store` change whenever we switch to a different group.
  // `$store.call.id` will then give us a different Group Call ID if the chosen call is different to
  // the one we are currently in which is our indicator to switch.
  $effect(() => {
    reactive(() => {
      if (
        conversation !== undefined &&
        store !== undefined &&
        call !== undefined &&
        $store?.call?.id !== undefined &&
        !byteEquals(call.context.callId.bytes, $store.call.id.bytes)
      ) {
        log.debug('Switching to chosen group call');
        start(conversation, 'join').catch(assertUnreachable);
      }
    }, [$store?.call?.id]);
  });

  // Keep the profile pictures of everyone in the call loaded, and let go of the ones which are no
  // longer needed.
  $effect(() => {
    const wanted = new Map(
      [
        ...($user === undefined ? [] : [$user]),
        ...(callState?.remote ?? []).map((participant) => participant.receiver),
      ].map((receiver) => [getImageKey(receiver), receiver] as const),
    );

    for (const [key, unsubscribe] of [...imageSubscriptions.entries()]) {
      if (!wanted.has(key)) {
        unsubscribe?.();
        imageSubscriptions.delete(key);
        images.delete(key);
      }
    }
    for (const [key, receiver] of wanted.entries()) {
      if (imageSubscriptions.has(key)) {
        continue;
      }
      imageSubscriptions.set(key, undefined);
      loadImage(key, receiver).catch((error: unknown) => {
        log.warn('Fetching the profile picture of a call participant failed', error);
      });
    }
  });

  /**
   * The remote microphone tracks which are currently mixed into the speaker.
   */
  let audible = new Set<MediaStreamTrack>();

  // Attach tracks of the call participants.
  //
  // Note: Every remote microphone is connected regardless of whether that participant is muted,
  // because a muted track is silence, and because mute is announced separately for the indicator. A
  // participant who also shares their screen is only connected once.
  $effect(() => {
    const sink = deviceState?.speaker.sink;
    if (sink === undefined) {
      return;
    }
    const current = new Set(
      (callState?.remote ?? []).map(
        (participant) => participant.transceivers.microphone.receiver.track,
      ),
    );
    for (const track of current) {
      sink.connect(track);
    }
    for (const track of audible) {
      if (!current.has(track)) {
        sink.disconnect(track);
      }
    }
    audible = current;
  });

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);

    return () => window.removeEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    // Stop any ongoing call.
    stop?.raise({origin: 'ui-component', cause: 'destroy'});

    demand.close();
    for (const unsubscribe of imageSubscriptions.values()) {
      unsubscribe?.();
    }

    // Stop capturing and tear down the audio graph.
    closeDevices();
  });
</script>

{#snippet cameraMenu()}
  <ContextMenu {log}>
    <ContextMenu.Item
      checked={deviceState?.camera.selected === undefined}
      onclick={async () => await selectCamera({type: 'system-default'})}
    >
      {$i18n.t('messaging.label--call-default-device', 'Default')}
    </ContextMenu.Item>

    {#each cameraDevices as device, index (device.id)}
      <ContextMenu.Item
        checked={device.id === deviceState?.camera.selected?.id}
        onclick={async () => await selectCamera({type: 'id', id: device.id})}
        title={device.label}
      >
        {nameDevice(device, index)}
      </ContextMenu.Item>
    {/each}
  </ContextMenu>
{/snippet}

{#snippet audioMenu()}
  <ContextMenu {log}>
    {#if speakerDevices.length > 0}
      <ContextMenu.Group icon={{glyph: 'volume_up'}}>
        {#snippet heading()}
          {$i18n.t('messaging.label--call-select-audio-output', 'Speakers')}
        {/snippet}

        <ContextMenu.Item
          checked={deviceState?.speaker.selected === undefined}
          onclick={async () => await selectSpeaker({type: 'system-default'})}
        >
          {$i18n.t('messaging.label--call-default-device', 'Default')}
        </ContextMenu.Item>

        {#each speakerDevices as device, index (device.id)}
          <ContextMenu.Item
            checked={device.id === deviceState?.speaker.selected?.id}
            onclick={async () => await selectSpeaker({type: 'id', id: device.id})}
            title={device.label}
          >
            {nameDevice(device, index)}
          </ContextMenu.Item>
        {/each}
      </ContextMenu.Group>
    {/if}

    <ContextMenu.Group icon={{glyph: 'mic'}}>
      {#snippet heading()}
        {$i18n.t('messaging.label--call-select-audio-input', 'Microphone')}
      {/snippet}

      <ContextMenu.Item
        checked={deviceState?.microphone.selected === undefined}
        onclick={async () => await selectMicrophone({type: 'system-default'})}
      >
        {$i18n.t('messaging.label--call-default-device', 'Default')}
      </ContextMenu.Item>

      {#each microphoneDevices as device, index (device.id)}
        <ContextMenu.Item
          checked={device.id === deviceState?.microphone.selected?.id}
          onclick={async () => await selectMicrophone({type: 'id', id: device.id})}
          title={device.label}
        >
          {nameDevice(device, index)}
        </ContextMenu.Item>
      {/each}
    </ContextMenu.Group>
  </ContextMenu>
{/snippet}

{#snippet controls()}
  <CallView.Control
    disabled={cameraDevices.length === 0}
    icon={{glyph: isCameraEnabled ? 'videocam' : 'videocam_off'}}
    isActive={isCameraEnabled}
    label={$i18n.t('messaging.action--call-toggle-camera', 'Camera')}
    {log}
    onclick={() => localDevices.camera.toggle()}
    popover={cameraDevices.length === 0
      ? undefined
      : {
          label: $i18n.t('messaging.label--call-select-camera', 'Select camera'),
          content: cameraMenu,
        }}
    type="toggle"
  />

  <CallView.Control
    disabled={microphoneDevices.length === 0}
    icon={{glyph: isMicrophoneEnabled ? 'mic' : 'mic_off'}}
    isActive={isMicrophoneEnabled}
    label={$i18n.t('messaging.action--call-toggle-microphone', 'Microphone')}
    {log}
    onclick={() => localDevices.microphone.toggle()}
    popover={microphoneDevices.length === 0 && speakerDevices.length === 0
      ? undefined
      : {
          label: $i18n.t('messaging.label--call-select-audio-device', 'Select audio device'),
          content: audioMenu,
        }}
    type="toggle"
  />

  {#if isScreenSharingAllowed}
    <CallView.Control
      icon={{glyph: isScreenShared ? 'screen_share' : 'stop_screen_share'}}
      isActive={isScreenShared}
      label={$i18n.t('messaging.action--call-toggle-screen-sharing', 'Share screen')}
      {log}
      onclick={toggleScreenSharing}
      type="toggle"
    />
  {/if}

  <CallView.Control
    icon={{glyph: 'call_end'}}
    label={$i18n.t('messaging.action--call-leave', 'Leave call')}
    {log}
    onclick={handleClickLeaveCall}
    type="button"
    variant="destructive"
  />
{/snippet}

<div
  class="@container grid h-full grid-rows-[4rem_minmax(0,1fr)]"
  data-theme={isExpanded ? 'dark' : undefined}
>
  <Header
    {isExpanded}
    {log}
    onclicktoggleexpand={ontoggleexpand}
    state={call === undefined
      ? {type: 'connecting'}
      : {
          type: 'connected',
          nParticipants: 1 + (callState?.remote.length ?? 0),
          startedAt: call.context.startedAt,
        }}
  />

  <CallView {controls} {feeds} {labels} {log} onclickfeedexpand={handleClickFeedExpand} />
</div>
