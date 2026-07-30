<!--
  @component Renders an audio player.
-->
<script lang="ts" module>
</script>

<script lang="ts">
  import {ensureArrayBufferBackedView} from '@threema/ts-utils/byte/array-buffer-backed-view';
  import type {f64} from '@threema/ts-utils/float/f64';
  import {ensureError} from '@threema/ts-utils/meta/ensure-error';
  import {onDestroy, tick, untrack} from 'svelte';

  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import WaveformSilder from '~/app/ui/components/atoms/waveform-slider/WaveformSilder.svelte';
  import type {AudioPlayerProps} from '~/app/ui/components/molecules/audio-player/props';
  import type {LazyAudioContent} from '~/app/ui/components/molecules/audio-player/types';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';
  import {calculateRootMeanSquare} from '~/common/utils/audio';

  const log = globals.unwrap().uiLogging.logger('ui.component.audio-player');

  // The maximum number of waves. This is tuned to the message width.
  const MAX_WAVES = 48;

  // Thresholds for skipping waveform calculation.
  const MAX_WAVEFORM_AUDIO_DURATION = 600; // 10 minutes in seconds
  const MAX_WAVEFORM_AUDIO_FILE_SIZE = 8_388_608; // 8 MB in bytes

  const {audioFile, onerror, snippetFooter}: AudioPlayerProps = $props();

  let playbackSpeed = $state<0.5 | 1 | 1.25 | 1.5 | 2>(1);

  /**
   * The bound HTML `audio` element.
   */
  let audioElement = $state<SvelteNullableBinding<HTMLAudioElement>>(null);

  /**
   * Whether playback is paused.
   */
  let isPaused = $state(true);

  /**
   * Current position of playback, in seconds.
   */
  let currentSliderPosition = $state<f64>(0);

  /**
   * The current audio position.
   *
   * Important: This should only be set in this component when the user
   * skips the audio wit the slider.
   */
  let currentAudioPosition = $state<f64>(0);

  /**
   * Store containing the audio fetch state.
   */
  let audio = $state<LazyAudioContent>({state: 'loading'});

  let waveformData = $state<readonly f64[]>([]);

  let duration = $state<f64>(audioFile.duration ?? 0);

  async function loadAudio(): Promise<void> {
    const fileInformation = await audioFile.fetchFileBytes().catch((error) => {
      log.debug(
        'Loading the audio bytes failed, either there was an error or the upload is not yet done',
        ensureError(error),
      );
      return undefined;
    });

    untrack(() => revokeCurrentAudioUrl(audio));

    if (fileInformation === undefined) {
      audio = {state: 'failed'};
      return;
    }

    if (!fileInformation.mediaType.startsWith('audio/')) {
      log.warn(`The loaded file is of type audio but of ${fileInformation.mediaType}`);
      audio = {state: 'failed'};
      return;
    }

    const audioBlob = new Blob([ensureArrayBufferBackedView(fileInformation.bytes)]);
    audio = {
      state: 'loaded',
      url: URL.createObjectURL(audioBlob),
    };

    // Skip waveform calculation if audio file is either too long or too large. Skips expensive
    // waveform calculation, which might even crash the renderer process.
    if (
      (duration !== undefined && duration > MAX_WAVEFORM_AUDIO_DURATION) ||
      audioFile.sizeInBytes > MAX_WAVEFORM_AUDIO_FILE_SIZE
    ) {
      log.debug(
        `Skipping waveform calculation for audio file (duration: ${duration}s, size: ${audioFile.sizeInBytes} bytes)`,
      );
      waveformData = [];
    } else {
      // Non-blocking calculation of RMS.
      calculateRootMeanSquare(audioBlob, MAX_WAVES, log)
        .then((result) => {
          waveformData = result ?? [];
        })
        .catch(assertUnreachable);
    }
  }

  function revokeCurrentAudioUrl(currentAudio: LazyAudioContent): void {
    if (currentAudio.state === 'loaded') {
      URL.revokeObjectURL(currentAudio.url);
    }
  }

  /**
   * Handle play / pause button click.
   */
  function handleClickButton(): void {
    if (audio.state === 'loaded') {
      togglePlayback().catch(assertUnreachable);
    }
  }

  function handleClickCirclePlayBackSpeed(currentPlaybackSpeed: typeof playbackSpeed): void {
    switch (currentPlaybackSpeed) {
      case 0.5:
        playbackSpeed = 1;
        return;
      case 1:
        playbackSpeed = 1.25;
        return;
      case 1.25:
        playbackSpeed = 1.5;
        return;
      case 1.5:
        playbackSpeed = 2;
        return;
      case 2:
        playbackSpeed = 0.5;
        return;
      default:
        unreachable(currentPlaybackSpeed);
    }
  }

  /**
   * Handle audio time update event.
   */
  function handleTimeUpdate(): void {
    if (audio.state !== 'loaded') {
      return;
    }

    currentSliderPosition = audioElement?.currentTime ?? 0;
  }

  /**
   * Handle audio ended event.
   */
  function handleEnded(): void {
    isPaused = true;
  }

  function pauseAudio(): void {
    audioElement?.pause();
  }

  async function play(el: HTMLAudioElement): Promise<void> {
    try {
      await el.play();
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        log.warn('Could not play audio: DOMException AbortError');
        return;
      }
      log.error('Could not play audio: ', ensureError(error));
    }
  }

  async function restartAudio(): Promise<void> {
    if (audioElement === null || isPaused) {
      return;
    }
    await play(audioElement);
  }

  /**
   * Start / stop playback of the audio.
   */
  async function togglePlayback(): Promise<void> {
    if (audioElement === null) {
      return;
    }

    if (audioElement.paused) {
      // If we're at the end of the track, rewind first.
      if (currentSliderPosition === duration) {
        audioElement.currentTime = 0;
      }
      await play(audioElement);
    } else {
      audioElement.pause();
    }

    isPaused = audioElement.paused;
  }

  async function onSliderMoved(event: Event): Promise<void> {
    const target = event.target;
    if (target === null) {
      return;
    }

    // Usage of `in` is necessary here because property 'value' is not owned. Because the key is
    // hardcoded, unexpected property access is not possible.
    //
    // eslint-disable-next-line no-restricted-syntax
    if ('value' in target && typeof target.value === 'string') {
      const newPosition = parseFloat(target.value);
      if (!isNaN(newPosition)) {
        currentSliderPosition = newPosition;
        currentAudioPosition = newPosition;
        await tick();
      }
    }
  }

  function onMetadataLoaded(): void {
    duration = audioElement?.duration ?? audioFile.duration ?? 0;
  }

  $effect(() => {
    reactive(() => {
      loadAudio().catch(assertUnreachable);
    }, [audioFile]);
  });

  onDestroy(() => revokeCurrentAudioUrl(audio));
</script>

<div class="audio-player" class:footer={snippetFooter !== undefined}>
  <button class="toggle" disabled={audio.state === 'failed'} onclick={handleClickButton}>
    {#if audio.state === 'loaded'}
      {#if isPaused}
        <MdIcon theme="Filled">play_arrow</MdIcon>
      {:else}
        <MdIcon theme="Filled">pause</MdIcon>
      {/if}
    {:else if audio.state === 'failed'}
      <MdIcon theme="Filled">close</MdIcon>
    {/if}
  </button>
  <span class="progress">
    <WaveformSilder
      disabled={audio.state === 'failed'}
      bind:value={currentSliderPosition}
      min={0}
      max={duration ?? 0}
      step={0.1}
      oninput={onSliderMoved}
      onbeforeslidermoves={pauseAudio}
      onafterslidermoved={restartAudio}
      {waveformData}
    />
  </span>
  <button
    class="speed"
    disabled={audio.state === 'failed'}
    onclick={() => handleClickCirclePlayBackSpeed(playbackSpeed)}
  >
    <Text color="mono-low" family="secondary" text={`${playbackSpeed}x`}></Text>
  </button>
  {#if snippetFooter !== undefined}
    <span class="footer">
      {@render snippetFooter?.(currentSliderPosition > 0 ? currentSliderPosition : duration)}
    </span>
  {/if}
  {#if audio.state === 'loaded'}
    <audio
      bind:this={audioElement}
      src={audio.url}
      onerror={(event) => {
        onerror(new Error('Unknown error in audio element'));
      }}
      onloadedmetadata={onMetadataLoaded}
      ontimeupdate={handleTimeUpdate}
      onended={handleEnded}
      bind:playbackRate={playbackSpeed}
      bind:currentTime={currentAudioPosition}
    ></audio>
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .audio-player {
    display: grid;
    grid-template:
      'toggle . progress . speed' auto
      / auto rem(12px) 1fr rem(2px) auto;
    place-items: center stretch;
    row-gap: rem(4px);
    width: 100%;
    padding-top: rem(12px);

    &.footer {
      grid-template:
        'toggle . progress . speed' auto
        '.      . footer   . .    ' auto
        / auto rem(12px) 1fr rem(2px) auto;
    }

    .toggle {
      grid-area: toggle;

      --c-icon-button-naked-outer-background-color--hover: transparent;
      --c-icon-button-naked-outer-background-color--focus: transparent;
      --c-icon-button-naked-outer-background-color--active: transparent;

      @include clicktarget-button-circle;

      & {
        display: flex;
        justify-content: center;
        align-items: center;
        color: var(--t-color-primary);
        background-color: transparent;
        border: rem(2px) solid var(--t-color-primary);
        width: rem(32px);
        height: rem(32px);
        font-size: rem(22px);
      }
    }

    .progress {
      grid-area: progress;

      display: flex;
      align-items: center;
      justify-content: stretch;
      height: 100%;
    }

    .speed {
      grid-area: speed;

      width: rem(42px);
      padding-block: rem(2px);
      border-radius: rem(11px);

      @include clicktarget-button-rect;
    }

    .footer {
      grid-area: footer;
      min-width: 100%;
    }
  }
</style>
