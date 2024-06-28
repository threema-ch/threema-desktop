<!--
  @component Renders the participant feed (microphone / camera) of a single receiver.
-->
<script lang="ts">
  import {onDestroy} from 'svelte';

  import {intersection, type IntersectionEventDetail} from '~/app/ui/actions/intersection';
  import {size} from '~/app/ui/actions/size';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {ParticipantFeedProps} from '~/app/ui/components/partials/call-participant-feed/props';
  import ProfilePicture from '~/app/ui/components/partials/profile-picture/ProfilePicture.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {Dimensions} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  type $$Props = ParticipantFeedProps<'local' | 'remote'>;

  export let activity: $$Props['activity'];
  export let capture: $$Props['capture'];
  export let container: $$Props['container'];
  export let updateCameraSubscription: $$Props['updateCameraSubscription'];
  export let participantId: $$Props['participantId'];
  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];
  export let tracks: $$Props['tracks'];
  export let type: $$Props['type'];

  unusedProp(participantId);

  let microphoneAudioElement: SvelteNullableBinding<HTMLAudioElement> = null;
  let cameraVideoElement: SvelteNullableBinding<HTMLVideoElement> = null;

  let dimensions: Dimensions | undefined = undefined;
  let isInViewport: boolean | undefined = undefined;

  // Note: Caching mitigates re-attaching tracks to <audio> and <video> elements which would result
  // in audio cutoff and video flickering.
  const cachedTracks: {
    microphone: MediaStreamTrack | undefined;
    camera: MediaStreamTrack | undefined;
  } = {microphone: undefined, camera: undefined};

  $: {
    if (microphoneAudioElement !== null) {
      if (tracks.type === 'local') {
        microphoneAudioElement.srcObject = null;
      } else if (
        microphoneAudioElement.srcObject === null ||
        cachedTracks.microphone !== tracks.microphone
      ) {
        microphoneAudioElement.srcObject = new MediaStream([tracks.microphone]);
        cachedTracks.microphone = tracks.microphone;
      }
    }

    if (cameraVideoElement !== null) {
      if (tracks.camera === undefined) {
        cameraVideoElement.srcObject = null;
      } else if (cameraVideoElement.srcObject === null || cachedTracks.camera !== tracks.camera) {
        cameraVideoElement.srcObject = new MediaStream([tracks.camera]);
        cachedTracks.camera = tracks.camera;
      }
    }
  }

  $: {
    if (isInViewport !== undefined && dimensions !== undefined) {
      updateCameraSubscription(
        activity.layout === 'regular' && isInViewport ? dimensions : undefined,
      );
    }
  }

  function handleChangeSize(event: CustomEvent<{entries: ResizeObserverEntry[]}>): void {
    const entry: ResizeObserverEntry | undefined = event.detail.entries.at(0);
    if (entry === undefined) {
      return;
    }
    dimensions = {
      width: Math.round(entry.contentRect.width),
      height: Math.round(entry.contentRect.height),
    };
  }

  function handleEnterOrExit(event: CustomEvent<IntersectionEventDetail>): void {
    dimensions = {
      width: Math.round(event.detail.entry.target.clientWidth),
      height: Math.round(event.detail.entry.target.clientHeight),
    };
    isInViewport = event.detail.entry.isIntersecting;
  }

  // Track camera stream health
  let unsubscribeCameraHealth: (() => void) | undefined;
  let cameraHealth: 'good' | 'stalled' | 'unknown' = 'unknown';
  function cameraHealthStalledHandler(): void {
    cameraHealth = 'stalled';
  }
  function cameraHealthGoodHandler(): void {
    cameraHealth = 'good';
  }
  onDestroy(() => unsubscribeCameraHealth?.());
  $: {
    const track = tracks.camera;
    unsubscribeCameraHealth?.();
    unsubscribeCameraHealth = undefined;
    cameraHealth = 'unknown';

    if (track !== undefined) {
      track.addEventListener('mute', cameraHealthStalledHandler);
      track.addEventListener('unmute', cameraHealthGoodHandler);
      unsubscribeCameraHealth = () => {
        track.addEventListener('mute', cameraHealthStalledHandler);
        track.addEventListener('unmute', cameraHealthGoodHandler);
      };
      cameraHealth = track.muted ? 'stalled' : 'good';
    }
  }

  $: sizeObserverOptions = {
    root: container,
    threshold: 0,
  };
</script>

<div
  use:size
  use:intersection={{options: sizeObserverOptions}}
  class="container"
  data-camera-capture={capture.camera}
  data-camera-health={cameraHealth}
  data-layout={activity.layout}
  data-type={type}
  on:changesize={handleChangeSize}
  on:intersectionenter={handleEnterOrExit}
  on:intersectionexit={handleEnterOrExit}
>
  <audio bind:this={microphoneAudioElement} autoplay playsinline />

  {#if activity.layout === 'pocket'}
    <ProfilePicture
      extraCharms={[
        {
          content: {
            type: 'icon',
            icon: capture.microphone === 'on' ? 'mic' : 'mic_off',
            family: 'material',
          },
          position: 130,
          style: {
            type: 'cutout',
            contentColor: 'white',
            gap: 2,
            backgroundColor: capture.microphone === 'on' ? 'var(--t-color-primary-600)' : 'red',
          },
        },
      ]}
      options={{
        hideDefaultCharms: true,
        isClickable: false,
      }}
      {receiver}
      {services}
      size="md"
    />
  {:else if activity.layout === 'regular'}
    <div class="video-container">
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

      <video bind:this={cameraVideoElement} autoplay disablepictureinpicture muted playsinline />
    </div>

    <div class="footer">
      <span class="pills left">
        <span class="pill name">
          <Text family="primary" size="body-small" text={receiver.name} />
        </span>
      </span>

      {#if type === 'remote'}
        <span class="pills right">
          <div class="pill control">
            <MdIcon theme="Outlined">
              {#if capture.microphone === 'on'}
                mic
              {:else}
                mic_off
              {/if}
            </MdIcon>
          </div>
        </span>
      {/if}
    </div>
  {:else}
    {unreachable(activity.layout)}
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 100%;
    border-radius: rem(10px);
    overflow: hidden;

    audio {
      display: none;
    }

    .video-container {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
    }

    .placeholder,
    video {
      position: absolute;
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
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

    video {
      object-fit: cover;
      object-position: center;
    }
    &[data-camera-capture='off'],
    &[data-camera-health='stalled'] {
      video {
        visibility: hidden;
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
          background-color: rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);

          &.control {
            font-size: rem(18px);
            padding: rem(4px);
          }
        }
      }
    }

    &[data-type='local'] {
      video {
        transform: scale(-1, 1);
      }
    }
  }
</style>
