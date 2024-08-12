<!--
  @component Renders a top bar with the user's profile picture and action buttons.
-->
<script lang="ts">
  import {createEventDispatcher, onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
  import RadialExclusionMaskProvider from '~/app/ui/components/hocs/radial-exclusion-mask-provider/RadialExclusionMaskProvider.svelte';
  import {getAudioDeviceContextMenuItems} from '~/app/ui/components/partials/call-activity/internal/control-bar/helpers';
  import type {ControlBarProps} from '~/app/ui/components/partials/call-activity/internal/control-bar/props';
  import type {
    AudioInputDeviceInfo,
    AudioOutputDeviceInfo,
    VideoDeviceInfo,
  } from '~/app/ui/components/partials/call-activity/internal/control-bar/types';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {AsyncLock} from '~/common/utils/lock';
  import {truncate} from '~/common/utils/string';

  const log = globals.unwrap().uiLogging.logger('ui.component.call-activity-control-bar');

  type $$Props = ControlBarProps;

  export let currentAudioInputDeviceId: $$Props['currentAudioInputDeviceId'];
  export let currentAudioOutputDeviceId: $$Props['currentAudioOutputDeviceId'];
  export let currentVideoDeviceId: $$Props['currentVideoDeviceId'];
  export let isAudioEnabled: $$Props['isAudioEnabled'];
  export let isVideoEnabled: $$Props['isVideoEnabled'];
  export let onSelectAudioInputDevice: $$Props['onSelectAudioInputDevice'];
  export let onSelectAudioOutputDevice: $$Props['onSelectAudioOutputDevice'];
  export let onSelectVideoDevice: $$Props['onSelectVideoDevice'];

  const mediaDevicesAsyncLock: AsyncLock = new AsyncLock();

  let audioDeviceSelectionPopover: SvelteNullableBinding<Popover> = null;
  let videoDeviceSelectionPopover: SvelteNullableBinding<Popover> = null;
  let audioInputDevices: AudioInputDeviceInfo[] = [];
  let audioOutputDevices: AudioOutputDeviceInfo[] = [];
  let videoDevices: VideoDeviceInfo[] = [];

  const dispatch = createEventDispatcher<{
    clickleavecall: MouseEvent;
    clicktoggleaudio: MouseEvent;
    clicktogglevideo: MouseEvent;
  }>();

  function handleClickLeaveCall(event: MouseEvent): void {
    dispatch('clickleavecall', event);
  }

  function handleClickToggleAudio(event: MouseEvent): void {
    dispatch('clicktoggleaudio', event);
  }

  function handleClickToggleVideo(event: MouseEvent): void {
    dispatch('clicktogglevideo', event);
  }

  function updateMediaDevices(): void {
    mediaDevicesAsyncLock
      .with(
        async () =>
          await navigator.mediaDevices.enumerateDevices().then((devices) => {
            videoDevices = devices.filter(
              (device): device is VideoDeviceInfo => device.kind === 'videoinput',
            );
            audioInputDevices = devices.filter(
              (device): device is AudioInputDeviceInfo => device.kind === 'audioinput',
            );
            audioOutputDevices = devices.filter(
              (device): device is AudioOutputDeviceInfo => device.kind === 'audiooutput',
            );
          }),
      )
      .catch((error) => {
        log.error(`Error enumerating media devices: ${error}`);
      });
  }

  $: audioDeviceContextMenuItems = getAudioDeviceContextMenuItems(
    $i18n,
    audioInputDevices,
    audioOutputDevices,
    currentAudioInputDeviceId,
    currentAudioOutputDeviceId,
    onSelectAudioInputDevice,
    onSelectAudioOutputDevice,
  );

  $: videoDeviceContextMenuItems = videoDevices.map<ContextMenuItem>((device) => ({
    type: 'option',
    handler: () => {
      if (device.deviceId !== currentVideoDeviceId) {
        onSelectVideoDevice(device);
      }
    },
    icon: device.deviceId === currentVideoDeviceId ? {name: 'check'} : undefined,
    label: truncate(device.label, 24, 'end'),
  }));

  onMount(() => {
    updateMediaDevices();
    navigator.mediaDevices.addEventListener('devicechange', updateMediaDevices);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', updateMediaDevices);
    };
  });
</script>

<header class="container">
  <div class="left">
    <div class="control video">
      <RadialExclusionMaskProvider
        cutouts={[
          {
            diameter: 24,
            position: {
              x: 90,
              y: 10,
            },
          },
        ]}
      >
        <button class="toggle" class:enabled={isVideoEnabled} on:click={handleClickToggleVideo}>
          <MdIcon theme="Outlined">
            {#if isVideoEnabled}
              videocam
            {:else}
              videocam_off
            {/if}
          </MdIcon>
        </button>
      </RadialExclusionMaskProvider>

      <div class="chooser">
        <ContextMenuProvider
          bind:popover={videoDeviceSelectionPopover}
          anchorPoints={{
            reference: {
              horizontal: 'right',
              vertical: 'top',
            },
            popover: {
              horizontal: 'right',
              vertical: 'bottom',
            },
          }}
          flip={false}
          items={videoDeviceContextMenuItems}
          offset={{
            left: 0,
            top: -4,
          }}
          safetyGap={{
            bottom: 12,
            left: 12,
            right: 12,
            top: 12,
          }}
        >
          <button class="trigger">
            <MdIcon theme="Outlined">keyboard_arrow_up</MdIcon>
          </button>
        </ContextMenuProvider>
      </div>
    </div>

    <div class="control audio">
      <RadialExclusionMaskProvider
        cutouts={[
          {
            diameter: 24,
            position: {
              x: 90,
              y: 10,
            },
          },
        ]}
      >
        <button class="toggle" class:enabled={isAudioEnabled} on:click={handleClickToggleAudio}>
          <MdIcon theme="Outlined">
            {#if isAudioEnabled}
              mic
            {:else}
              mic_off
            {/if}
          </MdIcon>
        </button>
      </RadialExclusionMaskProvider>

      <div class="chooser">
        <ContextMenuProvider
          bind:popover={audioDeviceSelectionPopover}
          anchorPoints={{
            reference: {
              horizontal: 'right',
              vertical: 'top',
            },
            popover: {
              horizontal: 'right',
              vertical: 'bottom',
            },
          }}
          flip={false}
          items={audioDeviceContextMenuItems}
          offset={{
            left: 0,
            top: -4,
          }}
          safetyGap={{
            bottom: 12,
            left: 12,
            right: 12,
            top: 12,
          }}
        >
          <button class="trigger">
            <MdIcon theme="Outlined">keyboard_arrow_up</MdIcon>
          </button>
        </ContextMenuProvider>
      </div>
    </div>
  </div>

  <div class="right">
    <div class="control">
      <button class="toggle destructive" on:click={handleClickLeaveCall}>
        <MdIcon theme="Outlined">call_end</MdIcon>
      </button>
    </div>
  </div>
</header>

<style lang="scss">
  @use 'component' as *;

  .container {
    flex: 1 1 auto;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;

    height: rem(160px);
    max-width: rem(288px);
    background-color: none;

    .left,
    .right {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: rem(6px);

      .control {
        position: relative;

        .toggle {
          @extend %neutral-input;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: rem(11px);
          font-size: rem(24px);
          line-height: rem(24px);
          border-radius: 50%;

          color: white;
          background-color: rgb(5, 5, 5);

          &.enabled {
            background-color: rgb(25, 209, 84);
          }

          &.destructive {
            background-color: rgb(255, 0, 0);
          }

          &:hover {
            cursor: pointer;
            background-color: rgb(20, 20, 20);

            &.enabled {
              background-color: rgb(24, 181, 73);
            }

            &.destructive {
              background-color: rgb(217, 8, 8);
            }
          }

          &:active {
            cursor: pointer;
            background-color: rgb(20, 20, 20);

            &.enabled {
              background-color: rgb(22, 164, 67);
            }

            &.destructive {
              background-color: rgb(196, 11, 11);
            }
          }
        }

        .chooser {
          position: absolute;
          top: 0;
          left: 100%;
          transform: translate(calc(-50% - rem(5px)), calc(-50% + rem(5px)));

          .trigger {
            @extend %neutral-input;

            display: flex;
            place-items: center;
            place-content: center;

            padding: rem(2px) rem(2px) rem(3px) rem(3px);
            font-size: rem(15px);
            line-height: rem(15px);
            border-radius: 50%;

            color: white;
            background-color: rgb(5, 5, 5);

            &:hover {
              cursor: pointer;
              background-color: rgb(20, 20, 20);
            }
          }
        }
      }
    }

    .left {
      justify-content: left;
    }

    .right {
      justify-content: right;
    }
  }

  @container activity (min-width: 256px) {
    .container {
      flex-direction: row;

      height: rem(64px);
      padding: rem(9px);
      background-color: rgb(10, 10, 10);
      border-radius: rem(32px);

      .left,
      .right {
        flex-direction: row;

        .control {
          .toggle {
            background-color: rgb(38, 38, 38);

            &:hover {
              background-color: rgb(29, 28, 28);
            }

            &:active {
              background-color: rgb(23, 22, 22);
            }
          }

          .chooser {
            .trigger {
              background-color: rgb(38, 38, 38);

              &:hover {
                background-color: rgb(29, 28, 28);
              }
            }
          }
        }
      }
    }
  }
</style>
