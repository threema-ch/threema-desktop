<!--
  @component Renders the group call activity sidebar.
-->
<script lang="ts">
  import {onDestroy} from 'svelte';

  import {globals} from '~/app/globals';
  import {size} from '~/app/ui/actions/size';
  import {
    startCall,
    type AnyExtendedGroupCallContextAbort,
    updateRemoteParticipantFeeds,
    selectInitialCaptureDevices,
    type CaptureDevices,
    attachLocalDeviceAndAnnounceCaptureState,
    type ActivityLayout,
  } from '~/app/ui/components/partials/call-activity/helpers';
  import ControlBar from '~/app/ui/components/partials/call-activity/internal/control-bar/ControlBar.svelte';
  import TopBar from '~/app/ui/components/partials/call-activity/internal/top-bar/TopBar.svelte';
  import type {GroupCallActivityProps} from '~/app/ui/components/partials/call-activity/props';
  import type {AugmentedOngoingGroupCallViewModelBundle} from '~/app/ui/components/partials/call-activity/transformer';
  import ParticipantFeed from '~/app/ui/components/partials/call-participant-feed/ParticipantFeed.svelte';
  import type {ParticipantFeedProps} from '~/app/ui/components/partials/call-participant-feed/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import type {DbGroupReceiverLookup} from '~/common/db';
  import {assert, assertUnreachable, unreachable, unwrap} from '~/common/utils/assert';
  import {byteEquals} from '~/common/utils/byte';
  import type {Remote} from '~/common/utils/endpoint';
  import {AbortRaiser} from '~/common/utils/signal';
  import type {RemoteStore} from '~/common/utils/store';
  import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
  import type {SelfReceiverData} from '~/common/viewmodel/utils/receiver';

  type $$Props = GroupCallActivityProps;

  export let isExpanded: $$Props['isExpanded'];
  export let services: $$Props['services'];

  const FEED_MIN_WIDTH_PX = 256;

  const {router} = services;
  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.call-activity');

  let containerLayout: ActivityLayout = 'regular';

  let microphone: CaptureDevices['microphone'];
  let camera: CaptureDevices['microphone'];
  let localFeed: Omit<ParticipantFeedProps<'local'>, 'services'> | undefined;

  let stop: AbortRaiser<AnyExtendedGroupCallContextAbort> | undefined;
  let call: AugmentedOngoingGroupCallViewModelBundle | undefined;
  let remoteFeeds: readonly Omit<ParticipantFeedProps<'remote'>, 'activity' | 'services'>[] = [];

  let feeds: readonly Omit<ParticipantFeedProps<'local' | 'remote'>, 'activity' | 'services'>[] =
    [];
  $: feeds = [...(localFeed !== undefined ? [localFeed] : []), ...remoteFeeds];

  onDestroy(() => {
    // Stop any ongoing call
    stop?.raise({origin: 'ui-component', cause: 'destroy'});

    // Stop capturing
    microphone?.track.stop();
    camera?.track.stop();
  });

  function handleChangeSizeContainerElement(
    event: CustomEvent<{entries: ResizeObserverEntry[]}>,
  ): void {
    const width = event.detail.entries[0]?.contentRect.width;

    requestAnimationFrame(() => {
      if ((width ?? 0) < FEED_MIN_WIDTH_PX) {
        containerLayout = 'pocket';
      } else {
        containerLayout = 'regular';
      }
    });
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
    microphone = attachLocalDeviceAndAnnounceCaptureState(
      log,
      call,
      stop,
      'microphone',
      microphone,
      microphone === undefined
        ? undefined
        : {
            track: microphone.track,
            state,
          },
    );
  }

  function setCameraCaptureState(state: 'on' | 'off' | 'toggle'): void {
    camera = attachLocalDeviceAndAnnounceCaptureState(
      log,
      call,
      stop,
      'camera',
      camera,
      camera === undefined
        ? undefined
        : {
            track: camera.track,
            state,
          },
    );
  }

  // Setup capture devices at startup
  //
  // Note: Devices will always be muted initially.
  selectInitialCaptureDevices(log, {microphone: 'on', camera: 'off'})
    .then((devices) => {
      microphone = devices.microphone;
      camera = devices.camera;
    })
    .catch(assertUnreachable);

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
        activity: {
          layout: containerLayout,
        },
        receiver: $user,
        participantId: 'local',
        tracks: {
          type: 'local',
          camera: camera?.track,
        },
        capture: {
          camera: camera?.state ?? 'off',
          microphone: microphone?.state ?? 'off',
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
            $i18n.t('messaging.error--call-disconnected', 'Call was disconnected'),
          );
          break;

        case 'group-left-kicked-or-removed':
          toast.addSimpleFailure(
            $i18n.t(
              'messaging.error--call-group-left-kicked-or-removed',
              'Group call was left because you left the group',
            ),
          );
          break;

        case 'group-calls-disabled':
          toast.addSimpleFailure(
            $i18n.t(
              'messaging.error--call-group-calls-disabled',
              'Group call feature was disabled',
            ),
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
              'Call has ended due to inactivity',
            ),
          );
          break;

        case 'destroy':
          // UI component which hosted the group call was destroyed. Just show the user an info that
          // the group call has ended.
          toast.addSimple($i18n.t('messaging.hint--call-ended', 'Call has ended'));
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
              'Call has ended due to an unexpected error',
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
        remoteFeeds = updateRemoteParticipantFeeds(log, call.controller, stop, state);
      }),
    );

    // Attach local tracks to local transceivers, mute microphone if desired by the group call and
    // otherwise announce devices as defined by the user.
    //
    // Note 1: Because starting the call is async and the user may change the capture state in
    // between, we'll need to do this explicitly here.
    //
    // Note 2: Changing the capture state implicitly adds any local tracks to the associated local
    // transceivers.
    setMicrophoneCaptureState(
      call.state.get().local.capture.microphone === 'off' ? 'off' : microphone?.state ?? 'off',
    );
    setCameraCaptureState(camera?.state ?? 'off');
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
        .then((conversation_) => {
          conversation = unwrap(conversation_);
          store = conversation.viewModelStore;
          start(conversation, intent).catch(assertUnreachable);
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
</script>

<div
  use:size
  class="container"
  class:expanded={isExpanded}
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

  <div class="content">
    <div class="feeds">
      {#each feeds as feed (feed.participantId)}
        <ParticipantFeed {...feed} activity={{layout: containerLayout}} {services} />
      {/each}
    </div>

    <div class="footer">
      <ControlBar
        isAudioEnabled={microphone?.track.enabled ?? false}
        isVideoEnabled={camera?.track.enabled ?? false}
        on:clickleavecall={handleClickLeaveCall}
        on:clicktoggleaudio={() => setMicrophoneCaptureState('toggle')}
        on:clicktogglevideo={() => setCameraCaptureState('toggle')}
      />
    </div>
  </div>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    overflow: hidden;
    grid-template:
      'top-bar' rem(64px)
      'content' 1fr
      / 100%;

    .top-bar {
      grid-area: top-bar;

      border-bottom: 1px solid var(--t-panel-gap-color);
      padding: rem(12px) rem(16px) rem(16px) rem(16px);
    }

    .content {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: space-between;

      position: relative;
      overflow-y: auto;

      .feeds {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: start;
        gap: rem(12px);

        padding: rem(16px) 0;
      }

      .footer {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;

        position: sticky;
        left: 0;
        right: 0;
        bottom: 0;

        padding: 0 rem(12px) rem(12px) rem(12px);

        &::after {
          content: '';

          position: fixed;
          z-index: -1;
          background: linear-gradient(to top, var(--t-aside-background-color), transparent);
          left: 0;
          right: 0;
          bottom: 0;
          height: rem(104px);
        }
      }
    }

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

  .container[data-layout='regular'] {
    .top-bar {
      padding: rem(12px) rem(12px) rem(16px) rem(16px);
    }

    .content {
      .feeds {
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        grid-auto-rows: min-content;
        gap: rem(8px);

        padding: rem(16px);
      }

      .footer {
        padding: rem(12px);
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
