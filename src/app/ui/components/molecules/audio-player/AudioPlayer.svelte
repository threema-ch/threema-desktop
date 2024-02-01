<!--
  @component
  Renders an audio player.
-->
<script context="module" lang="ts">
  /**
   * States used to describe the progress when loading an audio source.
   */
  type BlobState =
    | {status: 'loading'}
    | {status: 'failed'}
    | {
        status: 'loaded';
        url: string;
      };
</script>

<script lang="ts">
  import {onDestroy} from 'svelte';

  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import LinearProgress from '~/app/ui/svelte-components/blocks/LinearProgress/LinearProgress.svelte';
  import type {AudioPlayerProps} from '~/app/ui/components/molecules/audio-player/props';
  import type {f64} from '~/common/types';
  import {assert, ensureError} from '~/common/utils/assert';
  import {ResolvablePromise} from '~/common/utils/resolvable-promise';

  type $$Props = AudioPlayerProps;

  let reportedDuration: $$Props['duration'] = undefined;
  export {reportedDuration as duration};
  export let fetchAudio: $$Props['fetchAudio'];
  export let onError: $$Props['onError'];

  /**
   * The bound HTML `audio` element.
   */
  let audio: HTMLAudioElement;

  /**
   * Whether an audio track is currently loaded.
   */
  let isLoaded = new ResolvablePromise<void>();

  /**
   * Whether playback is paused.
   */
  let isPaused = true;

  /**
   * Current position of playback, in seconds.
   */
  let currentPosition: f64 = 0;

  /**
   * Duration of the actual audio track, in seconds.
   */
  let realDuration: f64 | undefined = undefined;

  /**
   * Store containing the audio fetch state.
   */
  let blob: BlobState = {status: 'loading'};

  /**
   * Handle play / pause button click.
   */
  function handleClickButton(): void {
    if (isLoaded.state.type === 'resolved') {
      void togglePlayback();
    } else {
      void loadAndPlayAudio();
    }
  }

  /**
   * Handle audio and metadata loaded event.
   */
  function handleLoadedMetadata(): void {
    resetPlayerState();
    isLoaded.resolve();
  }

  /**
   * Handle audio time update event.
   */
  function handleTimeUpdate(): void {
    if (isLoaded.state.type !== 'resolved') {
      return;
    }

    currentPosition = audio.currentTime;
  }

  /**
   * Handle audio ended event.
   */
  function handleEnded(): void {
    isPaused = true;
  }

  /**
   * Reset player to its initial state.
   */
  function resetPlayerState(): void {
    isPaused = true;
    currentPosition = 0;
    realDuration = Number.isNaN(audio.duration) ? undefined : audio.duration;
  }

  /**
   * Start / stop playback of the audio.
   */
  async function togglePlayback(): Promise<void> {
    if (isLoaded.state.type !== 'resolved') {
      return;
    }

    if (audio.paused) {
      // If we're at the end of the track, rewind first.
      if (currentPosition === duration) {
        rewind();
      }

      await audio.play();
    } else {
      audio.pause();
    }

    isPaused = audio.paused;
  }

  /**
   * Rewind the audio.
   */
  function rewind(): void {
    if (isLoaded.state.type !== 'resolved') {
      return;
    }

    audio.load();
  }

  async function loadAudio(fetch: typeof fetchAudio): Promise<void> {
    isLoaded = new ResolvablePromise();

    await fetch()
      .then((result) => {
        if (result === undefined) {
          throw new Error("Didn't receive any audio bytes");
        }

        return {
          status: 'loaded',
          url: URL.createObjectURL(new Blob([result.bytes], {type: result.mediaType})),
        } as const;
      })
      .then((state) => {
        // Release previous `objectURL`.
        if (blob.status === 'loaded') {
          URL.revokeObjectURL(blob.url);
        }

        blob = state;
      })
      .catch((error) => {
        blob = {
          status: 'failed',
        };
      });
  }

  async function loadAndPlayAudio(): Promise<void> {
    await loadAudio(fetchAudio)
      .then(async () => {
        await isLoaded;
      })
      .then(async () => {
        assert(isLoaded.state.type === 'resolved', 'Expected audio to be loaded');
        await togglePlayback();
      })
      .catch((error) => {
        onError(ensureError(error));
      });
  }

  $: duration = realDuration ?? reportedDuration;

  onDestroy(() => {
    if (blob.status === 'loaded') {
      URL.revokeObjectURL(blob.url);
    }
  });
</script>

<div class="audio-player" class:footer={$$slots.footer}>
  <button class="toggle" on:click={handleClickButton}>
    {#if isLoaded.state.type !== 'resolved'}
      <MdIcon theme="Filled">play_arrow</MdIcon>
    {:else if isPaused}
      <MdIcon theme="Filled">play_arrow</MdIcon>
    {:else}
      <MdIcon theme="Filled">pause</MdIcon>
    {/if}
  </button>
  <span class="progress">
    <LinearProgress
      value={isLoaded.state.type === 'resolved' && duration !== undefined
        ? (currentPosition * 100) / duration
        : 0}
      variant="determinate"
    />
  </span>
  {#if $$slots.footer}
    <span class="footer">
      <slot name="footer" {duration} />
    </span>
  {/if}
  {#if blob.status === 'loaded'}
    <audio
      bind:this={audio}
      src={blob.url}
      on:error
      on:loadedmetadata={handleLoadedMetadata}
      on:timeupdate={handleTimeUpdate}
      on:ended={handleEnded}
    />
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .audio-player {
    display: grid;
    grid-template:
      'toggle progress' auto
      / auto 1fr;
    place-items: center stretch;
    gap: rem(8px);
    width: 100%;

    &.footer {
      grid-template:
        'toggle progress' auto
        '.      footer' auto
        / auto 1fr;
      row-gap: 0;
    }

    .toggle {
      grid-area: toggle;

      @include clicktarget-button-circle;
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--t-color-primary);
      background-color: transparent;
      border: rem(2px) solid var(--t-color-primary);
      width: rem(32px);
      height: rem(32px);
      font-size: rem(22px);

      --c-icon-button-naked-outer-background-color--hover: transparent;
      --c-icon-button-naked-outer-background-color--focus: transparent;
      --c-icon-button-naked-outer-background-color--active: transparent;
    }

    .progress {
      grid-area: progress;
      min-width: rem(128px);
      width: 100%;
      height: rem(3px);
      border-radius: rem(1.5px);
      overflow: hidden;

      --c-linear-progress-transition: linear 0.25s;
    }

    .footer {
      grid-area: footer;
      min-width: 100%;
    }
  }
</style>
