<!--
  @component Renders a reactive list of keyed items which can be modified.

  The list also abstracts generic list functionality, like scrolling to an item, glueing, and
  observing items that enter and exit the view.
-->
<script lang="ts" generics="TId, TProps">
  import {createEventDispatcher} from 'svelte/internal';

  import {intersection} from '~/app/ui/actions/intersection';
  import type {LazyListProps} from '~/app/ui/components/hocs/lazy-list/props';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {u53} from '~/common/types';

  // Generic parameters are not yet recognized by the linter.
  // See https://github.com/sveltejs/eslint-plugin-svelte/issues/521
  // and https://github.com/sveltejs/svelte-eslint-parser/issues/306
  // eslint-disable-next-line no-undef
  type $$Props = LazyListProps<TId, TProps>;

  export let items: $$Props['items'];
  export let lastItemId: $$Props['lastItemId'];
  export let initiallyVisibleItemId: $$Props['initiallyVisibleItemId'] = undefined;

  let containerElement: SvelteNullableBinding<HTMLOListElement>;
  let isAtBottom = true;

  /**
   * Scrolls the view to the item with the given id.
   */
  // Generic parameters are not yet recognized by the linter.
  // See https://github.com/sveltejs/eslint-plugin-svelte/issues/521
  // and https://github.com/sveltejs/svelte-eslint-parser/issues/306
  // eslint-disable-next-line no-undef
  export function scrollToItem(id: TId, behavior: ScrollBehavior): void {
    if (containerElement !== null) {
      const itemElement = containerElement.querySelector(`.item.${id}]`);

      itemElement?.scrollIntoView({
        behavior,
        block: 'end',
      });
    }
  }

  /**
   * Scrolls the view to the last item. Note: This won't be the last item in the items list, but the
   * first item found with the `isLast` flag set to true.
   */
  export function scrollToLast(behavior: ScrollBehavior): void {
    if (containerElement !== null && lastItemId !== undefined) {
      scrollToItem(lastItemId, behavior);
    }
  }

  const dispatch = createEventDispatcher<{
    /** Dispatched when an item has fully entered the visible area of the chat. */
    itementered: $$Props['items'][u53];
    /** Dispatched when an item has fully exited the visible area of the chat. */
    itemexited: $$Props['items'][u53];
  }>();

  $: defaultObserverOptions = {
    root: containerElement,
    threshold: 0,
  };

  // Note: For some reason, with 1.0, the visibility is not being detected reliably.
  const anchorIntersectionThreshold = 0.9;

  $: lastObserverOptions = {
    root: containerElement,
    threshold: anchorIntersectionThreshold,
  };

  $: shouldScrollToInitiallyVisible = initiallyVisibleItemId !== undefined;
</script>

<ol
  bind:this={containerElement}
  class="list"
  class:gluedbottom={isAtBottom && !shouldScrollToInitiallyVisible}
>
  {#each items as item (item.id)}
    <!-- eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -->
    {@const {id} = item}
    {@const isLast = lastItemId === id}
    {@const isInitiallyVisible = initiallyVisibleItemId === id}

    <li
      class={`item ${id}`}
      class:last={isLast}
      class:initiallyvisible={isInitiallyVisible}
      class:gluedtop={isInitiallyVisible && shouldScrollToInitiallyVisible}
      use:intersection={{
        options: defaultObserverOptions,
      }}
      on:intersectionenter={(event) => {
        if (isInitiallyVisible) {
          shouldScrollToInitiallyVisible = false;
        }
        dispatch('itementered', item);
      }}
      on:intersectionexit={() => {
        dispatch('itemexited', item);
      }}
    >
      <slot name="item" {item} />
    </li>

    {#if isLast}
      <span
        use:intersection={{
          options: lastObserverOptions,
        }}
        class="anchor"
        on:intersectionenter={(event) => {
          isAtBottom = event.detail.entry.intersectionRatio >= anchorIntersectionThreshold;
        }}
        on:intersectionexit={() => {
          isAtBottom = false;
        }}
      />
    {/if}
  {/each}
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

    .anchor {
      position: relative;
      display: block;
      height: rem(10px);
      margin-top: rem(-10px);
      visibility: hidden;
    }

    &.gluedbottom {
      .anchor {
        scroll-snap-align: end;
      }
    }

    .item.gluedtop {
      scroll-snap-align: start;
    }
  }
</style>
