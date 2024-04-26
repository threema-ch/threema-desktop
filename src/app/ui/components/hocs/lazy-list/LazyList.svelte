<!--
  @component Renders a reactive list of keyed items which can be modified.

  The list also abstracts generic list functionality, like scrolling to an item, glueing, and
  observing items that enter and exit the view.
-->
<script lang="ts" generics="TProps extends {readonly id: unknown}">
  import {createEventDispatcher, onDestroy, onMount, tick} from 'svelte';

  import {intersection} from '~/app/ui/actions/intersection';
  import type {LazyListProps} from '~/app/ui/components/hocs/lazy-list/props';
  import {isFullyVisibleVertical, waitForPresenceOfElement} from '~/app/ui/utils/element';
  import {scrollIntoViewIfNeededAsync} from '~/app/ui/utils/scroll';
  import {
    createBufferedEventDispatcher,
    reactive,
    type SvelteNullableBinding,
  } from '~/app/ui/utils/svelte';
  import type {u53} from '~/common/types';
  import {assertUnreachable, ensureError} from '~/common/utils/assert';
  import {AsyncLock} from '~/common/utils/lock';
  import {TIMER} from '~/common/utils/timer';

  // Generic parameters are not yet recognized by the linter.
  // See https://github.com/sveltejs/eslint-plugin-svelte/issues/521
  // and https://github.com/sveltejs/svelte-eslint-parser/issues/306
  // eslint-disable-next-line no-undef
  type $$Props = LazyListProps<TProps>;

  export let items: $$Props['items'];
  export let onError: $$Props['onError'] = undefined;
  export let visibleItemId: $$Props['visibleItemId'] = undefined;

  const dispatch = createEventDispatcher<{
    /**
     * Dispatched when an item was anchored (i.e. it was scrolled to or became the `visibleItem`).
     */
    itemanchored: $$Props['items'][u53];
    /**
     * Dispatched when the list is scrolled. Note: For performance reasons, this event is
     * debounced.
     */
    scroll: {distanceFromBottomPx: u53};
  }>();

  const [dispatchBuffered, suspendBufferedDispatcher, resumeBufferedDispatcher] =
    createBufferedEventDispatcher<{
      /** Dispatched when an item has fully entered the visible area of the chat. */
      itementered: $$Props['items'][u53];
      /** Dispatched when an item has fully exited the visible area of the chat. */
      itemexited: $$Props['items'][u53];
    }>();

  const anchorLock = new AsyncLock();

  // Note: For some reason, with 1.0, the visibility is not being detected reliably.
  const anchorIntersectionThreshold = 0.9;

  let containerElement: SvelteNullableBinding<HTMLOListElement>;
  let anchorElement: SvelteNullableBinding<HTMLSpanElement>;

  let isGlobalAnchorEnabled = visibleItemId === undefined;
  let isItemAnchorEnabled = visibleItemId !== undefined;
  let isAtBottom = true;

  /**
   * Scrolls the view to the item with the given id. Note: If the item is not already present, the
   * view will not scroll.
   */
  export async function scrollToItem(
    // eslint-disable-next-line no-undef
    id: TProps['id'],
    options?: ScrollIntoViewOptions,
  ): Promise<void> {
    // Enqueue execution to avoid race conditions if another anchoring process is already in
    // progress.
    return await anchorLock.with(async () => {
      const itemElement =
        containerElement?.querySelector(`.item[data-item-id="${id}"]`) ?? undefined;
      if (itemElement === undefined) {
        return;
      }

      // Suspend global anchor, or autoscroll might not work if the view is at the very bottom.
      isGlobalAnchorEnabled = false;
      await tick();

      // Because items entering or exiting the viewport are under observation, `itementered` and
      // `itemexited` events might be triggered during automated scrolling, which in turn might
      // result in additional items to be loaded or removed. As this might result in the browser
      // ending up scrolling to the wrong place in the list, event dispatching is disabled during
      // scroll, but the events will be buffered and sent when scrolling is finished.
      suspendBufferedDispatcher();

      // Scroll item into view and wait until scrolling is done.
      await scrollIntoViewIfNeededAsync({
        container: containerElement,
        element: itemElement,
        options,
        timeoutMs: 3000,
      }).catch((error) => {
        onError?.(ensureError(error));
      });

      // Resume event dispatcher and re-emit all buffered events to get the backend in sync.
      resumeBufferedDispatcher({replay: 'all'});

      // Re-enable global anchor.
      isGlobalAnchorEnabled = true;
      await tick();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const item = items.find((i) => i.id === id);
      if (item !== undefined) {
        dispatch('itemanchored', item);
      }
    });
  }

  async function handleChangeVisibleItem(): Promise<void> {
    // Enqueue execution to avoid race conditions if another anchoring process is already in
    // progress.
    return await anchorLock.with(async () => {
      // If no item is to be made visible, do nothing.
      if (visibleItemId === undefined) {
        return;
      }

      // Enable item anchor to make it "sticky" while we wait for the element to appear and suspend
      // global anchor, or autoscroll might not work if the view is at the very bottom.
      isGlobalAnchorEnabled = false;
      isItemAnchorEnabled = true;

      // Wait for Svelte to apply changes to the DOM.
      await tick();

      // Wait until the element of the anchored item is present in the DOM.
      await waitForPresenceOfElement({
        container: containerElement,
        selector: `.item[data-item-id="${visibleItemId}"]`,
        subtree: false,
        timeoutMs: 3000,
      })
        .then(
          async (element) =>
            // Scroll item into view if it isn't already and wait until scrolling is done.
            await scrollIntoViewIfNeededAsync({
              container: containerElement,
              element,
              options: {
                behavior: 'instant',
                block: 'start',
              },
              timeoutMs: 3000,
            }),
        )
        .catch((error) => {
          onError?.(ensureError(error));
        });

      // Re-evaluate whether the view is scrolled all the way to the bottom.
      isAtBottom = isFullyVisibleVertical({
        container: containerElement,
        element: anchorElement,
      });

      // Disable item anchor and re-enable global anchor now that scrolling is finished.
      isItemAnchorEnabled = false;
      isGlobalAnchorEnabled = true;
      await tick();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const item = items.find((i) => i.id === visibleItemId);
      if (item !== undefined) {
        dispatch('itemanchored', item);
      }
    });
  }

  const handleScrollDebounced = TIMER.debounce(
    () => {
      if (containerElement !== null) {
        const scrollDistanceFromBottom =
          containerElement.scrollHeight -
          containerElement.clientHeight -
          containerElement.scrollTop;

        dispatch('scroll', {
          distanceFromBottomPx: scrollDistanceFromBottom,
        });
      }
    },
    150,
    false,
  );

  $: itemObserverOptions = {
    root: containerElement,
    threshold: 0,
  };

  $: anchorObserverOptions = {
    root: containerElement,
    threshold: anchorIntersectionThreshold,
  };

  $: reactive(handleChangeVisibleItem, [visibleItemId]).catch(assertUnreachable);

  onMount(() => {
    containerElement?.addEventListener('scroll', handleScrollDebounced);
  });

  onDestroy(() => {
    containerElement?.removeEventListener('scroll', handleScrollDebounced);
  });
</script>

<ol bind:this={containerElement} class="list">
  {#each items as item (item.id)}
    <!-- eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -->
    {@const {id} = item}
    {@const isAnchored = isItemAnchorEnabled && visibleItemId === id}

    <li
      data-item-id={`${id}`}
      class="item"
      class:anchored={isAnchored}
      use:intersection={{
        options: itemObserverOptions,
      }}
      on:intersectionenter={(event) => {
        if (isAnchored) {
          anchorLock
            .with(async () => {
              isItemAnchorEnabled = false;
              return await Promise.resolve();
            })
            .catch(assertUnreachable);
        }
        dispatchBuffered('itementered', item);
      }}
      on:intersectionexit={() => {
        dispatchBuffered('itemexited', item);
      }}
    >
      <slot name="item" {item} />
    </li>
  {/each}

  <span
    bind:this={anchorElement}
    use:intersection={{
      options: anchorObserverOptions,
    }}
    class="global-anchor bottom"
    class:anchored={isGlobalAnchorEnabled && isAtBottom}
    on:intersectionenter={(event) => {
      isAtBottom = event.detail.entry.intersectionRatio >= anchorIntersectionThreshold;
    }}
    on:intersectionexit={() => {
      isAtBottom = false;
    }}
  />
</ol>

<style lang="scss">
  @use 'component' as *;

  .list {
    padding: 0;
    margin: 0;
    list-style-type: none;
    overflow: auto;
    overscroll-behavior-y: contain;
    scroll-snap-type: y mandatory;

    .item {
      // Anchor the list.
      &.anchored {
        scroll-snap-align: start;
      }
    }

    .global-anchor {
      &.bottom {
        position: relative;
        display: block;
        height: rem(10px);
        margin-top: rem(-10px);
        visibility: hidden;

        // Anchor the list only if no item is anchoring the list.
        &.anchored:not(:has(~ .item.anchored)) {
          scroll-snap-align: end;
        }
      }
    }
  }
</style>
