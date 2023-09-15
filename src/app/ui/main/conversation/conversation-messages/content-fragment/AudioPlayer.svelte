<!--
  @component
  Audio player used as part of a message.
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
  import {type Writable, writable} from 'svelte/store';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import LinearProgress from '#3sc/components/blocks/LinearProgress/LinearProgress.svelte';
  import {globals} from '~/app/globals';
  import {type f64} from '~/common/types';
  import {assert, ensureError} from '~/common/utils/assert';
  import {type Remote} from '~/common/utils/endpoint';
  import {ResolvablePromise} from '~/common/utils/resolvable-promise';
  import {type ConversationMessageViewModelController} from '~/common/viewmodel/conversation-message';
  import {type Message, type MessageBody} from '~/common/viewmodel/types';

  const log = globals
    .unwrap()
    .uiLogging.logger(`ui.component.conversation-message.content-fragment.audio`);

  export let messageViewModelController: Remote<ConversationMessageViewModelController>;

  /**
   * The message containing the audio to display a player for.
   */
  export let message: Message<MessageBody<'audio'>>;

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
   * Total duration of the audio track, in seconds.
   */
  let totalDuration: f64 = message.body.duration ?? 0;

  /**
   * Store containing the audio fetch state.
   */
  const audioStore: Writable<BlobState> = writable({status: 'loading'});

  /**
   * Handle play / pause button click.
   */
  function handleClickButton(): void {
    if (isLoaded.state.type === 'resolved') {
      void togglePlayback();
    } else {
      void fetchAndPlayAudio();
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
    totalDuration = Number.isNaN(audio.duration) ? message.body.duration ?? 0 : audio.duration;
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
      if (currentPosition === totalDuration) {
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

  /**
   * Fetch audio blob and update `audioStore` with the state.
   */
  async function fetchAudio({
    controller,
  }: {
    controller: Remote<ConversationMessageViewModelController>;
  }): Promise<void> {
    isLoaded = new ResolvablePromise();

    await controller
      .getBlob()
      .then((bytes) => {
        if (bytes === undefined) {
          throw new Error("Didn't receive any audio bytes");
        }

        const blob = new Blob([bytes]);
        const state: BlobState = {
          status: 'loaded',
          url: URL.createObjectURL(blob),
        } as const;

        return state;
      })
      .then((state) => {
        // Release previous `objectURL`.
        if ($audioStore.status === 'loaded') {
          URL.revokeObjectURL($audioStore.url);
        }

        audioStore.set({
          ...state,
        });
      })
      .catch((error) => {
        log.warn(`Audio data couldn't be loaded: ${error}`);

        audioStore.set({
          status: 'failed',
        });
      });
  }

  async function fetchAndPlayAudio(): Promise<void> {
    await fetchAudio({controller: messageViewModelController})
      .then(async () => {
        await isLoaded;
      })
      .then(async () => {
        assert(isLoaded.state.type === 'resolved', 'Expected audio to be loaded');
        await togglePlayback();
      })
      .catch((error) => {
        log.error(`Audio could not be loaded and played: ${ensureError(error)}`);
      });
  }

  onDestroy(() => {
    if ($audioStore.status === 'loaded') {
      URL.revokeObjectURL($audioStore.url);
    }
  });
</script>

<template>
  <div class="player">
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
        value={isLoaded.state.type === 'resolved' ? (currentPosition * 100) / totalDuration : 0}
        variant="determinate"
      />
    </span>
    {#if $audioStore.status === 'loaded'}
      <audio
        bind:this={audio}
        src={$audioStore.url}
        on:error
        on:loadedmetadata={handleLoadedMetadata}
        on:timeupdate={handleTimeUpdate}
        on:ended={handleEnded}
      />
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .player {
    display: grid;
    grid-template:
      'toggle  progress' auto
      / auto 1fr;
    place-items: center stretch;
    gap: rem(8px);
    width: 100%;

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
  }
</style>
