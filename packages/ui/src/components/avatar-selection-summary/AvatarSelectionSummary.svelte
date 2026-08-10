<!--
@component Summary of the items which are currently selected, e.g. the members chosen for a new
group. Every item is displayed as its avatar with its label below, along with a charm for each of its
actions.

@example
```svelte
<AvatarSelectionSummary heading="..." items={...} />
```
-->

<script lang="ts" module>
  import type {HTMLAttributes} from 'svelte/elements';
  import {cn} from 'tailwind-variants';

  import type {WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';
  import {Avatar, type AvatarProps} from '../avatar';
  import Icon from '../icon/Icon.svelte';

  export type AvatarSelectionSummaryItem = Pick<
    AvatarProps,
    'color' | 'description' | 'image' | 'initials'
  > & {
    readonly actions?: {
      /**
       * If provided, an option for removing the item will be rendered.
       */
      readonly remove?: {
        /**
         * A11y label to add to the respective button of this action.
         */
        readonly label: string;
        readonly onclick: () => void;
      };
    };
    /**
     * Stable identifier of the item, used to keep track of the rendered items.
     */
    readonly id: PropertyKey;
    /**
     * Label to display below the avatar.
     */
    readonly label: string;
  };

  type BaseProps = WithElementRef<
    {
      /**
       * Heading displayed above the items, e.g. how many of the maximum number of members are
       * currently selected. If not provided, no heading is displayed.
       */
      readonly heading?: string;
      /**
       * The items which are currently selected.
       */
      readonly items: readonly AvatarSelectionSummaryItem[];
    },
    HTMLDivElement
  >;

  export type AvatarSelectionSummaryProps = BaseProps &
    WithoutChildren<Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>>;
</script>

<script lang="ts">
  let {
    class: className,
    heading,
    items,
    ref = $bindable(null),
    ...restProps
  }: AvatarSelectionSummaryProps = $props();
</script>

{#snippet item({actions, color, description, image, initials, label}: AvatarSelectionSummaryItem)}
  <li class="flex flex-col items-center gap-1.5">
    <Avatar class="size-12" {color} {description} {image} {initials}>
      {#if actions?.remove !== undefined}
        <Avatar.Charm position={{type: 'radial', degrees: 45, offsetPx: {x: -1, y: 1}}}>
          <button
            class="flex size-4 items-center justify-center rounded-full bg-grey-400 text-xs text-white hover:cursor-pointer dark:bg-grey-400 dark:text-grey-800"
            aria-label={actions.remove.label}
            onclick={actions.remove.onclick}
            type="button"
          >
            <Icon class="dark:font-medium" glyph="close" />
          </button>
        </Avatar.Charm>
      {/if}
    </Avatar>

    <!-- Note: `whitespace-nowrap` is required for the label to be ellipsized instead of wrapped. -->
    <div class="w-full overflow-hidden text-center text-[10px] text-ellipsis whitespace-nowrap">
      {label}
    </div>
  </li>
{/snippet}

<!--
  Note: `min-h-30` fits exactly one row of items, and `max-h-36` cuts the summary off in the middle
  of the third row, so that it is apparent that there are more items to scroll to.
-->
<div
  bind:this={ref}
  class={cn('w-full rounded-lg bg-grey-200 dark:bg-grey-800', className)}
  {...restProps}
>
  <!--
    Heading and list share the same grid to:
      - Keep them left-aligned relative to each other.
      - Align the entire grid to the center of its container.
      - Allow the amount of rows and columns to be allocated automatically, based on the available
        space in either direction.
  -->
  <div
    class="grid max-h-56 w-full auto-rows-auto grid-cols-[repeat(auto-fit,56px)] justify-center gap-x-2 gap-y-3 overflow-y-auto p-4 has-[>p]:pt-3"
  >
    {#if heading !== undefined}
      <!-- Use the entire first row for the heading. -->
      <p class="col-span-full row-span-1 text-grey-600 dark:text-grey-300">
        {heading}
      </p>
    {/if}

    <!-- Place list in a subgrid to align it on the same tracks as the heading. -->
    {#if items.length > 0}
      <ul class="col-span-full grid list-none grid-cols-subgrid gap-y-3 p-0">
        {#each items as currentItem (currentItem.id)}
          {@render item(currentItem)}
        {/each}
      </ul>
    {/if}
  </div>
</div>
