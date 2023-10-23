<!--
  @component
  Renders a chat view.
-->
<script lang="ts" generics="TId, TProps">
  import {createEventDispatcher} from 'svelte/internal';

  import {intersection} from '~/app/ui/actions/intersection';
  import type {LazyListProps} from '~/app/ui/components/organisms/lazy-list/props';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {u53} from '~/common/types';

  // Generic parameters are not yet recognized by the linter.
  // See https://github.com/sveltejs/eslint-plugin-svelte/issues/521
  // and https://github.com/sveltejs/svelte-eslint-parser/issues/306
  // eslint-disable-next-line no-undef
  type $$Props = LazyListProps<TId, TProps>;

  export let items: $$Props['items'];
  export let lastItemId: $$Props['lastItemId'];

  let containerElement: SvelteNullableBinding<HTMLOListElement>;
  let isNearBottom = true;

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

  $: lastObserverOptions = {
    root: containerElement,
    threshold: 0.95,
  };
</script>

<ol bind:this={containerElement} class="list" class:glued={isNearBottom}>
  <!-- eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -->
  {#each items as item (item.id)}
    <!-- eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -->
    {@const {id} = item}
    {@const isLast = lastItemId === id}

    <li
      class={`item ${id}`}
      class:last={isLast}
      use:intersection={{
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        options: isLast ? lastObserverOptions : defaultObserverOptions,
      }}
      on:intersectionenter={(event) => {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (isLast) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          isNearBottom = event.detail.entry.intersectionRatio >= 0.95;
        }

        dispatch('itementered', item);
      }}
      on:intersectionexit={() => {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (isLast) {
          isNearBottom = false;
        }

        dispatch('itemexited', item);
      }}
    >
      <slot name="item" {item} />
    </li>
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

    &.glued {
      .last {
        scroll-snap-align: end;
      }
    }
  }
</style>
