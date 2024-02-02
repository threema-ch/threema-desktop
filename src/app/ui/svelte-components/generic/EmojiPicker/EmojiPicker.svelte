<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount} from 'svelte';

  import {unwrap} from '~/app/ui/svelte-components/utils/assert';

  import emoji from './emoji.html?raw';


  let wrapper: HTMLElement | null = null;

  const dispatch = createEventDispatcher<{
    insertEmoji: string;
    activeGroupChange: number;
  }>();

  /**
   * Scroll to the specified emoji group.
   */
  export function scrollToGroup(groupId: number): void {
    const title = unwrap(wrapper).querySelector(`.group-title[data-group="${groupId}"]`);
    if (title !== null) {
      title.scrollIntoView({behavior: 'smooth'});
    }
  }

  /**
   * Event handler for clicks on an emoji.
   *
   * This will emit the `insertEmoji` event with the emoji as data.
   */
  function onEmojiGroupClicked(event: MouseEvent): void {
    const target = event.target;
    if (target === null) {
      return;
    }
    const element = target as HTMLElement;
    if (element.tagName !== 'BUTTON') {
      // Click target is not an emoji button, thus we can ignore this click event
      return;
    }
    dispatch('insertEmoji', element.innerText);
  }

  let observer: IntersectionObserver;

  /**
   * Observe the currently visible emoji groups. The group with the largest
   * visible height is the active group.
   */
  function observeActiveGroup(root: HTMLElement): IntersectionObserver {
    // Mapping from group ID to visible height (in px)
    const groupVisibility = new Map<number, number>();

    function onObserverEvent(entries: IntersectionObserverEntry[]): void {
      // Update all entries
      for (const entry of entries) {
        const groupId = (entry.target as HTMLElement).dataset.group;
        if (groupId === undefined) {
          throw new Error('Observed element without group ID');
        }
        groupVisibility.set(parseInt(groupId, 10), entry.intersectionRect.height);
      }

      // Determine active group
      const groups = [...groupVisibility.entries()];
      groups.sort((a, b) => b[1] - a[1]);
      dispatch('activeGroupChange', unwrap(groups[0]?.[0]));
    }

    return new IntersectionObserver(onObserverEvent, {
      root,
      threshold: [
        // 5% Steps
        0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8,
        0.85, 0.9, 0.95, 1,
      ],
    });
  }

  onMount(() => {
    const wrapper_ = unwrap(wrapper);

    // Observer to determine active group
    observer = observeActiveGroup(wrapper_);

    // Add event listener and observe each group
    wrapper_.querySelectorAll('.group').forEach((group) => {
      (group as HTMLElement).addEventListener('click', onEmojiGroupClicked);
      observer.observe(group);
    });
  });
  onDestroy(() => {
    const wrapper_ = unwrap(wrapper);

    // Remove emoji click listener and disable observer
    wrapper_.querySelectorAll('.group').forEach((group) => {
      (group as HTMLElement).removeEventListener('click', onEmojiGroupClicked);
      observer.disconnect();
    });
  });
</script>

<div class="wrapper" bind:this={wrapper}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html emoji}
</div>

<style lang="scss">
  @use 'component' as *;

  // Big list of emoji, grouped by group
  .wrapper {
    height: 100%;
    overflow-y: scroll;

    // Get rid of default button styling
    :global(button) {
      border: none;
      padding: 0;
      background: none;
      font-size: inherit;
      font-family: inherit;
      color: inherit;
      cursor: pointer;
    }

    :global(.group-title) {
      @extend %font-meta-400;
      padding-left: 0.4em;
      text-transform: uppercase;
      color: $grey-600;
    }

    :global(.group-title:first-child) {
      margin-top: 0;
    }

    :global(.group) {
      display: grid;
      grid-template-columns: repeat(auto-fill, rem(28px));
      grid-auto-rows: rem(28px);
    }

    :global(.group button) {
      font-size: rem(19px);
    }
  }
</style>
