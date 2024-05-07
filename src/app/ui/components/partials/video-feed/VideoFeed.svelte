<!--
  @component Renders the video feed of a single receiver.
-->
<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import ProfilePicture from '~/app/ui/components/partials/profile-picture/ProfilePicture.svelte';
  import type {VideoFeedProps} from '~/app/ui/components/partials/video-feed/props';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  type $$Props = VideoFeedProps;

  export let isAudioEnabled: $$Props['isAudioEnabled'];
  export let isVideoEnabled: $$Props['isVideoEnabled'];
  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];

  unusedProp(services);
</script>

<div class="container">
  {#if isVideoEnabled}
    <!-- TODO(DESK-1447): Use real video stream. Note: Possibly an additional check is needed
        here to determine whether the stream is actually healthy. -->
    <video autoplay loop>
      <source src="./res/do-not-commit/flower.webm" type="video/webm" />
    </video>
  {:else}
    <div class="placeholder" data-color={receiver.color}>
      <ProfilePicture
        options={{
          isClickable: false,
        }}
        {receiver}
        {services}
        size="md"
      />
    </div>
  {/if}

  <div class="footer">
    <span class="pills left">
      <span class="pill name">
        <Text family="primary" size="body-small" text={receiver.name} />
      </span>
    </span>

    <span class="pills right">
      <div class="pill control">
        <MdIcon theme="Outlined">
          {#if isVideoEnabled}
            videocam
          {:else}
            videocam_off
          {/if}
        </MdIcon>
      </div>

      <div class="pill control">
        <MdIcon theme="Outlined">
          {#if isAudioEnabled}
            mic
          {:else}
            mic_off
          {/if}
        </MdIcon>
      </div>
    </span>
  </div>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    position: relative;
    width: 100%;
    border-radius: rem(10px);
    overflow: hidden;

    video,
    .placeholder {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      object-position: center;
    }

    .placeholder {
      display: flex;
      place-items: center;
      place-content: center;
      padding-bottom: rem(8px);

      @each $color in map-get-req($config, profile-picture-colors) {
        &[data-color='#{$color}'] {
          color: var(--c-profile-picture-initials-#{$color}, default);
          background-color: var(--c-profile-picture-background-#{$color}, default);
        }
      }
    }

    .footer {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: rem(8px);

      position: absolute;
      bottom: 0;
      width: 100%;
      padding: rem(8px);

      .pills {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        justify-content: center;
        gap: rem(4px);

        .pill {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          justify-content: center;

          padding: rem(4px) rem(8px);
          border-radius: rem(13px);
          color: white;
          background-color: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);

          &.control {
            font-size: rem(18px);
            padding: rem(4px);
          }
        }
      }
    }
  }
</style>
