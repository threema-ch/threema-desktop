<!--
  @component Renders the UI for a call, including video feeds of participants and the given media
  controls. Knows nothing about where it is placed: It fills whatever box it is given and arranges
  its content for the available size.

  @example
  ```svelte
  <CallView {feeds} {labels} {log} onclickfeedexpand={handleClickFeedExpand}>
    {#snippet controls()}
      <CallView.Control
        icon={{glyph: isMicrophoneEnabled ? 'mic' : 'mic_off'}}
        isActive={isMicrophoneEnabled}
        label="Microphone"
        {log}
        onclick={handleClickToggleMicrophone}
        popover={{label: 'Select microphone', content: microphoneContextMenu}}
        type="toggle"
      />
      <CallView.Control
        icon={{glyph: 'call_end'}}
        label="Leave call"
        {log}
        onclick={handleClickLeave}
        type="button"
        variant="destructive"
      />
    {/snippet}
  </CallView>
  ```
-->

<script lang="ts" module>
  import type {u53} from '@threema/ts-utils/integer/u53';
  import type {Logger} from '@threema/ts-utils/logging/logger';
  import {type Snippet, untrack} from 'svelte';
  import type {HTMLAttributes} from 'svelte/elements';
  import {cn} from 'tailwind-variants';

  import type {WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';

  import Feed, {type FeedLabels, type FeedProps} from './Feed.svelte';

  /**
   * A participant's feed, i.e. one tile of the call.
   */
  export interface CallViewFeed
    extends Pick<
      FeedProps,
      | 'alt'
      | 'color'
      | 'image'
      | 'initials'
      | 'isMirrored'
      | 'isMuted'
      | 'label'
      | 'onchangepresentation'
      | 'stream'
    > {
    /**
     * Stable identity of the feed, which keeps its element across a reordering of the feeds.
     */
    readonly id: string;
    /**
     * The type of content displayed. A `'display'`, i.e. a shared screen, is fitted rather than
     * cropped, and takes the spotlight when it appears.
     */
    readonly kind: 'camera' | 'display';
  }

  /**
   * Number of feeds beyond which the layout does not change any more.
   */
  const MAX_COUNTED_FEEDS = 12;

  /**
   * Breakpoint at which the view switches to the small layout, which displays the feeds in a
   * vertical stack. Important: Keep this in line with the container queries below.
   */
  const BREAKPOINT_SMALL_PX = 768;

  type BaseProps = WithElementRef<
    {
      /**
       * `CallView.Control` components, which are arranged in a bar floating over the feeds.
       */
      readonly controls?: Snippet;
      /**
       * The feeds to display, in the order they should be arranged in.
       */
      readonly feeds: readonly CallViewFeed[];
      readonly labels: FeedLabels;
      readonly log: Logger;
      /**
       * Reports a click on a specific feed.
       */
      readonly onclickfeed?: (event: MouseEvent, feed: CallViewFeed) => void;
      /**
       * Reports a click which expanded a feed, which happens when either the feed itself or its
       * expand action is clicked.
       */
      readonly onclickfeedexpand?: (event: MouseEvent, feed: CallViewFeed) => void;
    },
    HTMLDivElement
  >;

  export type CallViewProps = BaseProps &
    WithoutChildren<Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>>;
</script>

<script lang="ts">
  let {
    class: className,
    controls,
    feeds,
    labels,
    log,
    onclickfeed,
    onclickfeedexpand,
    ref = $bindable(null),
    ...restProps
  }: CallViewProps = $props();

  // Svelte uses `null` if ref is not bound.
  //
  // eslint-disable-next-line @typescript-eslint/no-restricted-types
  let controlsRef = $state<HTMLDivElement | null>(null);

  // Current observed width the view is rendered at.
  let widthPx = $state<u53 | undefined>(undefined);

  /**
   * Id of the feed which should be expanded, i.e. rendered larger than the other feeds. If
   * `undefined` the feeds are all displayed in a grid of equally-sized cells.
   */
  let expandedFeedCandidateId = $state<string | undefined>(undefined);

  /**
   * Id of the feed which is actually expanded, which is none while the view is too narrow for the
   * expanded layout.
   */
  const expandedFeedId = $derived(
    widthPx !== undefined && widthPx < BREAKPOINT_SMALL_PX ? undefined : expandedFeedCandidateId,
  );

  /**
   * Whether the user controls the layout manually, or it reacts to changes automatically.
   */
  let layoutMode = $state<'auto' | 'manual'>('auto');

  /**
   * Which feeds were present the last time the auto-expanded feed was considered. Note:
   * Deliberately not reactive, because it is only ever read and written explicitly by the
   * reconciliation `$effect` further down below.
   */
  let seenFeedIds = new Set<string>();

  const feedCount = $derived<u53 | 'many'>(
    feeds.length > MAX_COUNTED_FEEDS ? 'many' : feeds.length,
  );

  const controlsCount = $derived.by(() => {
    // If `controls` changes, we need to recelculate the child count.
    //
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    controls;

    return controlsRef?.childElementCount;
  });

  // Auto-expand a screen share which just appeared, and give it up when the feed it points at is
  // gone.
  $effect(() => {
    if (layoutMode === 'manual') {
      return;
    }

    let lastAddedDisplayFeedId: string | undefined = undefined;
    for (const feed of feeds) {
      // The last (i.e. most recently added) feed of type `'display'` is the one that should be
      // expanded, or none if there is no shared screen.
      if (feed.kind === 'display' && !seenFeedIds.has(feed.id)) {
        lastAddedDisplayFeedId = feed.id;
      }
    }

    // Record all current `feeds` as seen.
    seenFeedIds = new Set(feeds.map((feed) => feed.id));

    // Note: The state this writes is read untracked, so that the effect runs when the feeds change
    // and not when this effect changes the expanded feed itself.
    untrack(() => {
      // If a new display feed appeared, so we set it as the expanded feed.
      if (lastAddedDisplayFeedId !== undefined) {
        expandedFeedCandidateId = lastAddedDisplayFeedId;
        return;
      }
      // If the currently expanded feed disappeared, we unset the auto-expansion.
      if (
        expandedFeedCandidateId !== undefined &&
        !feeds.some((feed) => feed.id === expandedFeedCandidateId)
      ) {
        expandedFeedCandidateId = undefined;
      }
    });
  });

  /**
   * Expand the given feed, or collapse it if it is the expanded one already.
   */
  function toggleExpansion(event: MouseEvent, feed: CallViewFeed): void {
    // If the user changes the expanded state of a feed manually, we switch to manual layout mode
    // for the rest of the call.
    layoutMode = 'manual';

    // Note: Intentionally compare against the expanded feed instead of just the candidate. If there
    // is a candidate which was not applied, even if it's the same one, it will cause expansion to
    // be retried (which is what we want).
    if (expandedFeedId === feed.id) {
      // The toggled feed is the currently expanded feed, which means it should be collapsed.
      expandedFeedCandidateId = undefined;
      return;
    }

    expandedFeedCandidateId = feed.id;
    onclickfeedexpand?.(event, feed);
  }

  function handleClickFeed(event: MouseEvent, feed: CallViewFeed): void {
    onclickfeed?.(event, feed);
    toggleExpansion(event, feed);
  }
</script>

<div
  bind:this={ref}
  bind:clientWidth={widthPx}
  class={cn('@container-[size]/call-view grid size-full grid-cols-1 grid-rows-1', className)}
  {...restProps}
>
  <div class="stage col-start-1 row-start-1" style:--controls-count={controlsCount ?? 0}>
    <!--
      The stage is as tall as the space it was given and scrolls, while the tiles container is as
      tall as the layout needs and may outgrow the stage.
    -->
    <div class="tiles gap-2" data-feed-count={feedCount}>
      {#each feeds as feed (feed.id)}
        <div
          class="feed grid min-h-0 min-w-0 grid-cols-1 grid-rows-1"
          data-expanded={feed.id === expandedFeedId}
        >
          <Feed
            alt={feed.alt}
            color={feed.color}
            fit={feed.kind === 'display' ? 'contain' : 'cover'}
            image={feed.image}
            initials={feed.initials}
            isExpanded={feed.id === expandedFeedId}
            isMirrored={feed.isMirrored}
            isMuted={feed.isMuted}
            label={feed.label}
            {labels}
            {log}
            onchangepresentation={feed.onchangepresentation}
            onclick={(event) => handleClickFeed(event, feed)}
            onclickexpand={(event) => toggleExpansion(event, feed)}
            stream={feed.stream}
          />
        </div>
      {/each}
    </div>
  </div>

  <!-- Controls container -->
  <div
    class="pointer-events-none z-0 col-start-1 row-start-1 self-end bg-linear-to-t from-white from-[calc(100%-32px)] to-transparent pb-2 @min-[176px]:bg-none @min-[176px]:p-2 dark:from-grey-800"
  >
    <!-- `display: contents` keeps the theme from painting a background. -->
    <div class="contents" data-theme="dark">
      <div
        bind:this={controlsRef}
        class="controls pointer-events-auto mx-auto flex w-fit max-w-full flex-col items-center overflow-x-auto [scrollbar-width:none] @min-[176px]:flex-row @min-[176px]:rounded-full @min-[176px]:bg-black @min-[176px]:p-1"
      >
        {@render controls?.()}
      </div>
    </div>
  </div>
</div>

<style>
  .stage {
    /* Size of a single control, including its paddings. */
    --control-size: 3.625rem;
    /* The padding of the controls container. */
    --controls-container-padding: 0.25rem;
    /* The total height of the controls container. */
    --controls-container-height: calc(var(--control-size) + 2 * var(--controls-container-padding));

    --stage-padding: 0.5rem;
    /* Gap between stage and controls container. */
    --stage-controls-gap: 0.5rem;

    padding: var(--stage-padding);
    padding-block-end: calc(
      var(--stage-padding) + var(--controls-container-height) + var(--stage-controls-gap)
    );
    overflow-y: auto;
    scroll-padding-block-end: calc(
      var(--stage-padding) + var(--controls-container-height) + var(--stage-controls-gap)
    );
    scrollbar-width: none;
  }

  .tiles {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-auto-rows: 1fr;
    align-content: start;
  }

  .feed {
    align-self: stretch;
  }

  /* Small */
  @container call-view (min-width: 768px) {
    .tiles {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .tiles[data-feed-count='1'] {
      grid-template-columns: minmax(0, 1fr);
      height: 100%;
    }

    .tiles[data-feed-count='2'],
    .tiles[data-feed-count='3'],
    .tiles[data-feed-count='4'] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @container call-view (min-width: 768px) and (min-height: 768px) {
    .tiles[data-feed-count='2'] {
      height: 100%;
    }

    .tiles[data-feed-count='3'],
    .tiles[data-feed-count='4'] {
      grid-template-rows: repeat(2, minmax(0, 1fr));
      height: 100%;
    }
  }

  /* Medium */
  @container call-view (min-width: 1024px) {
    .tiles {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .tiles[data-feed-count='5'],
    .tiles[data-feed-count='6'] {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .tiles[data-feed-count='many'] {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
  }

  @container call-view (min-width: 1024px) and (min-height: 768px) {
    .tiles[data-feed-count='5'],
    .tiles[data-feed-count='6'] {
      grid-template-rows: repeat(2, minmax(0, 1fr));
      height: 100%;
    }
  }

  /* Large */
  @container call-view (min-width: 1440px) {
    .tiles[data-feed-count='many'] {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }

  /*
    Expanded layout: One feed is maximized, the rest are displayed in a vertical list on its right
    side.
  */
  @container call-view (min-width: 768px) {
    /* Sidebar tiles */
    .tiles:has(> .feed[data-expanded='true']) {
      --sidebar-cell-width: 16rem;
      /* The height of the cell is calculated from the width in ratio 4:3. */
      --sidebar-cell-height: calc(var(--sidebar-cell-width) * 3 / 4);

      grid-template-columns: minmax(0, 1fr) var(--sidebar-cell-width);
      grid-template-rows: repeat(auto, var(--sidebar-cell-height));
      grid-auto-rows: var(--sidebar-cell-height);
    }

    /* Expanded tile */
    .tiles:has(> .feed[data-expanded='true']) > .feed[data-expanded='true'] {
      /* The first column is used for the expanded tile. */
      grid-column: 1;
      /* The rows are sized for the sidebar tiles, so the expanded tile just spans all of them. */
      grid-row: 1 / -1;
      /* The expanded tile fills the entire available height. */
      height: calc(
        100cqb - 2 * var(--stage-padding) - var(--controls-container-height) -
          var(--stage-controls-gap)
      );
      /* Always keep the expanded tle visible when the list is scrolled. */
      position: sticky;
      inset-block-start: 0;
    }

    .tiles:has(> .feed[data-expanded='true']) > .feed:not([data-expanded='true']) {
      /* The second column is used for the sidebar. */
      grid-column: 2;
    }

    .tiles:has(> .feed[data-expanded='true']:only-child) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @container call-view (max-width: 176px) {
    .stage {
      /* 
        Because the controls container is vertical, we must multiply the size of a control with the
        count of controls to calculate its total height.
      */
      --controls-container-height: calc(
        var(--controls-count) * var(--control-size) + 2 * var(--controls-container-padding)
      );
    }
  }
</style>
