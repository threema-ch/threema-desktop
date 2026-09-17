<!--
  @component Renders a video feed of a call participant's camera or display.

  @example
  ```svelte
  <Feed
    alt="Video of Jane Doe"
    initials="JD"
    isMuted={participant.isMuted}
    kind="camera"
    label="Jane Doe"
    labels={{
      collapse: 'Collapse',
      expand: 'Expand',
      fullscreen: 'Full screen',
      muted: 'Microphone is muted',
      pictureInPicture: 'Picture-in-Picture',
    }}
    {log}
    onchangepresentation={handleChangePresentation}
    onclick={handleClickFeed}
    onclickexpand={handleClickExpandFeed}
    stream={participant.stream}
  />
  ```
-->

<script lang="ts" module>
  import type {u53} from '@threema/ts-utils/integer/u53';
  import type {Logger} from '@threema/ts-utils/logging/logger';
  import {onDestroy} from 'svelte';
  import type {HTMLAttributes} from 'svelte/elements';
  import {cn} from 'tailwind-variants';

  import {Avatar, type AvatarProps} from '../../components/avatar';
  import Button from '../../components/button/Button.svelte';
  import Icon from '../../components/icon/Icon.svelte';
  import {CharmsProvider} from '../../hocs/charms-provider';
  import TooltipProvider from '../../hocs/tooltip-provider/TooltipProvider.svelte';
  import type {WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';
  import {PROFILE_PICTURE_BACKGROUND_COLOR_CLASS_MAP} from '../../utils/profile-picture-color';

  /**
   * A box the feed is displayed in CSS pixels.
   */
  export interface FeedSize {
    readonly height: u53;
    readonly width: u53;
  }

  /**
   * How a feed is currently presented to the user.
   */
  export interface FeedPresentation {
    /**
     * Whether the feed is supposed to be expanded, i.e. rendered larger than the other feeds.
     */
    readonly isExpanded: boolean;
    readonly isFullscreen: boolean;
    readonly isPictureInPicture: boolean;
    /**
     * Whether the feed is currently visible in the viewport. Note: In fullscreen or
     * picture-in-picture mode, this is always `true`.
     */
    readonly isVisible: boolean;
    /**
     * The dimensions the feed is currently rendered at. Note: This includes fullscreen or
     * picture-in-picture mode.
     */
    readonly size: FeedSize | undefined;
  }

  /**
   * Text snippets used throughout the component.
   */
  export interface FeedLabels {
    /**
     * Label of the expand action while the feed is expanded, e.g. `'Collapse'`.
     */
    readonly collapse: string;
    /**
     * Label of the expand action while the feed is not expanded, e.g. `'Expand'`.
     */
    readonly expand: string;
    /**
     * Label of the fullscreen trigger, e.g. `'Full screen'`.
     */
    readonly fullscreen: string;
    /**
     * Label of the mute indicator, e.g. `'Microphone is muted'`.
     */
    readonly muted: string;
    /**
     * Label of the PiP trigger, e.g. `'Picture-in-Picture'`.
     */
    readonly pictureInPicture: string;
  }

  type BaseProps = WithElementRef<
    {
      /**
       * Description of the feed's surface for assistive technology, e.g. `'Video of Jane Doe'`. Not
       * displayed.
       */
      readonly alt: string;
      /**
       * The participant's profile color to use as a fallback.
       */
      readonly color?: AvatarProps['color'];
      /**
       * How the video fills the surface.
       */
      readonly fit: 'cover' | 'contain';
      /**
       * The participant's profile picture to use as a fallback.
       */
      readonly image?: AvatarProps['image'];
      /**
       * The participant's initials to use as a fallback.
       */
      readonly initials: AvatarProps['initials'];
      /**
       * Whether this feed is the currently expanded one, so that the correct label can be
       * displayed.
       */
      readonly isExpanded: boolean;
      /**
       * Whether to mirror the video on the vertical axis.
       */
      readonly isMirrored?: boolean;
      /**
       * Whether the participant's microphone is muted.
       */
      readonly isMuted: boolean;
      /**
       * Name of the participant, displayed on the feed.
       */
      readonly label: string;
      readonly labels: FeedLabels;
      readonly log: Logger;
      /**
       * Media to display. If `undefined`, the avatar is displayed instead.
       *
       * Note: The identity of the stream should stay stable across a change of the track inside it,
       * so that the picture does not blank out.
       */
      readonly stream?: MediaStream;
      /**
       * Reports how the feed is presented to the user whenever a relevant property changes.
       */
      readonly onchangepresentation?: (presentation: FeedPresentation) => void;
      /**
       * Reports a click on the feed's surface. If `undefined`, the surface is not interactive.
       */
      readonly onclick?: (event: MouseEvent) => void;
      /**
       * Reports a click on the expand action. If `undefined`, no expand action is rendered.
       */
      readonly onclickexpand?: (event: MouseEvent) => void;
    },
    HTMLDivElement
  >;

  export type FeedProps = BaseProps &
    WithoutChildren<Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>>;

  /**
   * Geometry shared by the picture and the overlay on top of it, so that the two cannot drift
   * apart.
   */
  const LAYER_CLASSES =
    'col-start-1 row-start-1 grid aspect-4/3 size-full @max-[160px]:aspect-square';
</script>

<script lang="ts">
  let {
    alt,
    class: className,
    color,
    fit,
    image,
    initials,
    isExpanded,
    isMirrored = false,
    isMuted,
    label,
    labels,
    log,
    onchangepresentation,
    onclick,
    onclickexpand,
    ref = $bindable(null),
    stream,
    ...restProps
  }: FeedProps = $props();

  // Note: `null` rather than `undefined`, because that is what Svelte assigns to a `bind:this` when
  // the element is unmounted.
  //
  // eslint-disable-next-line @typescript-eslint/no-restricted-types
  let videoElement = $state<HTMLVideoElement | null>(null);

  // Note: Svelte backs these bindings with a `ResizeObserver` and reads them once before the first
  // paint, so the reported size is correct from the start.
  let heightPx = $state<u53 | undefined>(undefined);
  let widthPx = $state<u53 | undefined>(undefined);

  let isIntersecting = $state<boolean>(false);
  let isFullscreen = $state<boolean>(false);
  let pictureInPictureSizePx = $state<FeedSize | undefined>(undefined);

  const isFullscreenAvailable = $derived(stream !== undefined && document.fullscreenEnabled);
  const isPictureInPicture = $derived(pictureInPictureSizePx !== undefined);
  const isPictureInPictureAvailable = $derived(
    stream !== undefined &&
      document.pictureInPictureEnabled &&
      !(videoElement?.disablePictureInPicture ?? false),
  );
  const sizePx = $derived<FeedSize | undefined>(
    heightPx === undefined || widthPx === undefined
      ? undefined
      : {height: heightPx, width: widthPx},
  );
  const presentation = $derived<FeedPresentation>({
    isExpanded,
    isFullscreen,
    isPictureInPicture,
    // Fullscreen and picture-in-picture take the feed out of the layout, so whether its own box
    // intersects says nothing about whether the user sees it.
    isVisible: isPictureInPicture || isFullscreen || isIntersecting,
    size: pictureInPictureSizePx ?? sizePx,
  });

  $effect(() => {
    onchangepresentation?.(presentation);
  });

  // Attach the stream to the element, but only when it is not the one which is attached already, to
  // prevent flickering.
  $effect(() => {
    const element = videoElement;
    if (element === null || stream === undefined || element.srcObject === stream) {
      return;
    }

    element.srcObject = stream;
  });

  // Track whether the feed's own box is within view.
  $effect(() => {
    const element = ref;
    if (element === null) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (entry !== undefined) {
          isIntersecting = entry.isIntersecting;
        }
      },
      {threshold: 0},
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  });

  // Track whether this feed is the fullscreen element.
  $effect(() => {
    const element = ref;
    if (element === null) {
      return undefined;
    }

    function handleChangeFullscreen(): void {
      isFullscreen = document.fullscreenElement === element;
    }

    document.addEventListener('fullscreenchange', handleChangeFullscreen);

    return () => {
      document.removeEventListener('fullscreenchange', handleChangeFullscreen);
    };
  });

  // Track whether the video is in the platform's picture-in-picture window, and how large that
  // window currently is. Note: The size is only readable from the `PictureInPictureWindow` the
  // event hands over, and only stays current while a `resize` listener is attached to it, which has
  // to be removed again when the video leaves the window.
  $effect(() => {
    const element = videoElement;
    if (element === null) {
      return undefined;
    }

    let pictureInPictureWindow: PictureInPictureWindow | undefined = undefined;

    function handleResizePictureInPicture(event: Event): void {
      const target = event.target;
      if (target instanceof PictureInPictureWindow) {
        pictureInPictureSizePx = {
          height: Math.round(target.height),
          width: Math.round(target.width),
        };
      }
    }

    function handleEnterPictureInPicture(event: PictureInPictureEvent): void {
      pictureInPictureWindow = event.pictureInPictureWindow;
      pictureInPictureSizePx = {
        height: Math.round(pictureInPictureWindow.height),
        width: Math.round(pictureInPictureWindow.width),
      };
      pictureInPictureWindow.addEventListener('resize', handleResizePictureInPicture);
    }

    function handleLeavePictureInPicture(): void {
      pictureInPictureWindow?.removeEventListener('resize', handleResizePictureInPicture);
      pictureInPictureWindow = undefined;
      pictureInPictureSizePx = undefined;
    }

    element.addEventListener('enterpictureinpicture', handleEnterPictureInPicture);
    element.addEventListener('leavepictureinpicture', handleLeavePictureInPicture);

    return () => {
      element.removeEventListener('enterpictureinpicture', handleEnterPictureInPicture);
      element.removeEventListener('leavepictureinpicture', handleLeavePictureInPicture);
      handleLeavePictureInPicture();
    };
  });

  function handleClickFullscreen(): void {
    const element = ref;
    if (element === null) {
      return;
    }

    // The whole feed goes fullscreen rather than only the video, so that the actions and the footer
    // stay usable, and so that the size the feed reports is the size of the screen by itself.
    const request =
      document.fullscreenElement === element
        ? document.exitFullscreen()
        : element.requestFullscreen();
    request.catch((error: unknown) => {
      log.warn('Changing the fullscreen state of a feed failed', error);
    });
  }

  function handleClickPictureInPicture(): void {
    const element = videoElement;
    if (element === null) {
      return;
    }

    if (document.pictureInPictureElement === element) {
      document.exitPictureInPicture().catch((error: unknown) => {
        log.warn('Leaving picture-in-picture failed', error);
      });
      return;
    }

    requestPictureInPicture(element).catch((error: unknown) => {
      log.warn('Entering picture-in-picture failed', error);
    });
  }

  async function requestPictureInPicture(element: HTMLVideoElement): Promise<void> {
    // The platform refuses the request until it knows the video's dimensions.
    if (element.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise<void>((resolve) => {
        element.addEventListener('loadedmetadata', () => resolve(), {once: true});
      });
    }

    await element.requestPictureInPicture();
  }

  onDestroy(() => {
    // Neither mode survives the element it presents, so leave both rather than stranding the user
    // in a fullscreen view of something which is gone.
    if (ref !== null && document.fullscreenElement === ref) {
      document.exitFullscreen().catch((error: unknown) => {
        log.warn('Leaving fullscreen failed', error);
      });
    }
    if (videoElement !== null && document.pictureInPictureElement === videoElement) {
      document.exitPictureInPicture().catch((error: unknown) => {
        log.warn('Leaving picture-in-picture failed', error);
      });
    }

    // Feed is gone.
    onchangepresentation?.({
      isExpanded: false,
      isFullscreen: false,
      isPictureInPicture: false,
      isVisible: false,
      size: undefined,
    });
  });
</script>

{#snippet action(glyph: string, text: string, handleClick: (event: MouseEvent) => void)}
  <TooltipProvider placement="block-end" {text}>
    {#snippet children(anchorProps)}
      <Button
        {...anchorProps}
        aria-label={text}
        class="pointer-events-auto p-1 text-lg text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.5)] hover:bg-white/20 active:bg-white/30 dark:text-white"
        icon={{glyph}}
        {log}
        onclick={handleClick}
        shape="circle"
        type="button"
        variant="secondary"
      />
    {/snippet}
  </TooltipProvider>
{/snippet}

<div
  bind:this={ref}
  bind:clientHeight={heightPx}
  bind:clientWidth={widthPx}
  class={cn('group @container grid w-full grid-cols-1 grid-rows-1', className)}
  {...restProps}
>
  <svelte:element
    this={onclick === undefined ? 'div' : 'button'}
    aria-label={alt}
    class={cn(
      LAYER_CLASSES,
      // Explicit tracks, so that the cell has a definite size for the picture to fill.
      'grid-cols-1 grid-rows-1 rounded-xl ring-black outline-none focus-visible:ring-2 @max-[160px]:rounded-full dark:ring-white',
      onclick !== undefined && 'hover:cursor-pointer',
    )}
    {onclick}
    role={onclick === undefined ? 'img' : undefined}
    type={onclick === undefined ? undefined : 'button'}
  >
    <CharmsProvider class="size-full">
      {#snippet charms()}
        {#if isMuted}
          <CharmsProvider.Charm
            class="hidden @max-[160px]:flex"
            position={{type: 'radial', degrees: 135}}
          >
            <span
              class="flex size-6 items-center justify-center overflow-hidden rounded-full bg-black/50 text-sm text-white"
            >
              <Icon class="block" glyph="mic_off" label={labels.muted} />
            </span>
          </CharmsProvider.Charm>
        {/if}
      {/snippet}

      <div
        class={cn(
          'grid size-full grid-cols-1 grid-rows-1 place-items-center overflow-hidden rounded-xl @max-[160px]:rounded-full',
          color === undefined
            ? 'bg-grey-200 dark:bg-grey-900'
            : PROFILE_PICTURE_BACKGROUND_COLOR_CLASS_MAP[color],
        )}
      >
        <Avatar
          class="col-start-1 row-start-1 size-[clamp(2rem,24cqw,7.5rem)] @max-[160px]:size-full"
          {color}
          {image}
          {initials}
        />

        {#if stream !== undefined}
          <video
            bind:this={videoElement}
            class={cn(
              'z-0 col-start-1 row-start-1 block size-full object-center',
              fit === 'contain' ? 'object-contain' : 'object-cover',
              isMirrored && '-scale-x-100',
              // While the video is in the platform's window, this element paints nothing useful, so
              // the avatar shows through instead. It has to stay mounted, because it is the source.
              isPictureInPicture && 'invisible',
            )}
            autoplay
            muted
            playsinline
          ></video>
        {/if}
      </div>
    </CharmsProvider>
  </svelte:element>

  <!--
    Overlay, which takes exactly the same box as the surface.
  -->
  <div
    class={cn(
      LAYER_CLASSES,
      'pointer-events-none relative grid-cols-1 grid-rows-[auto_1fr_auto] @max-[160px]:hidden',
    )}
  >
    <!--
      The actions are revealed on hover, and on focus so that they can be revealed and focused by
      keyboard.
    -->
    <div
      class="row-span-1 row-start-1 flex items-start justify-end gap-1 rounded-t-xl bg-linear-to-b from-black/50 to-transparent p-2 pb-8 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 @max-[160px]:hidden"
    >
      {#if onclickexpand !== undefined}
        {@render action(
          isExpanded ? 'close_fullscreen' : 'open_in_full',
          isExpanded ? labels.collapse : labels.expand,
          onclickexpand,
        )}
      {/if}
      {#if isFullscreenAvailable}
        {@render action(
          isFullscreen ? 'fullscreen_exit' : 'fullscreen',
          labels.fullscreen,
          handleClickFullscreen,
        )}
      {/if}
      {#if isPictureInPictureAvailable}
        {@render action('pip', labels.pictureInPicture, handleClickPictureInPicture)}
      {/if}
    </div>

    <!-- Footer -->
    <div class="row-span-1 row-start-3 flex items-center justify-between gap-2 p-2">
      <span
        class="flex min-w-0 items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs/4.5 font-bold text-white"
        title={label}
      >
        {label}
      </span>

      {#if isMuted}
        <!-- Sized explicitly, so a missing icon font cannot stretch it. -->
        <span
          class="flex size-6.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/50 text-[18px]/none text-white"
        >
          <Icon class="block" glyph="mic_off" label={labels.muted} />
        </span>
      {/if}
    </div>
  </div>
</div>
