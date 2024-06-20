<!--
  @component Renders a top bar with the user's profile picture and action buttons.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import type {ControlBarProps} from '~/app/ui/components/partials/call-activity/internal/control-bar/props';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  type $$Props = ControlBarProps;

  export let isAudioEnabled: $$Props['isAudioEnabled'];
  export let isVideoEnabled: $$Props['isVideoEnabled'];

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
</script>

<header class="container">
  <div class="left">
    <button class="control video" class:enabled={isVideoEnabled} on:click={handleClickToggleVideo}>
      <MdIcon theme="Outlined">
        {#if isVideoEnabled}
          videocam
        {:else}
          videocam_off
        {/if}
      </MdIcon>
    </button>

    <button class="control audio" class:enabled={isAudioEnabled} on:click={handleClickToggleAudio}>
      <MdIcon theme="Outlined">
        {#if isAudioEnabled}
          mic
        {:else}
          mic_off
        {/if}
      </MdIcon>
    </button>
  </div>

  <div class="right">
    <button class="control destructive leave" on:click={handleClickLeaveCall}>
      <MdIcon theme="Outlined">call_end</MdIcon>
    </button>
  </div>
</header>

<style lang="scss">
  @use 'component' as *;

  .container {
    flex: 1 1 auto;

    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;

    height: rem(64px);
    max-width: rem(288px);
    background-color: none;

    .left,
    .right {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: rem(6px);

      .control {
        @extend %neutral-input;

        display: flex;
        align-items: center;
        justify-content: center;

        padding: rem(11px);
        font-size: rem(24px);
        line-height: rem(24px);
        border-radius: 50%;

        color: white;
        background-color: rgb(38, 38, 38);

        transition: 0.15s ease-out;

        &.video,
        &.audio {
          display: none;
        }

        &.enabled {
          background-color: rgb(25, 209, 84);
        }

        &.destructive {
          background-color: rgb(255, 0, 0);
        }

        &:hover {
          cursor: pointer;
          background-color: rgb(29, 28, 28);

          &.enabled {
            background-color: rgb(24, 181, 73);
          }

          &.destructive {
            background-color: rgb(217, 8, 8);
          }
        }

        &:active {
          cursor: pointer;
          background-color: rgb(23, 22, 22);

          &.enabled {
            background-color: rgb(22, 164, 67);
          }

          &.destructive {
            background-color: rgb(196, 11, 11);
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
      padding: rem(9px);
      background-color: rgb(10, 10, 10);
      border-radius: rem(32px);

      .left,
      .right {
        .control {
          &.video,
          &.audio {
            display: flex;
          }
        }
      }
    }
  }
</style>
