<!--
  @component A section of a `ContextMenu`, with an optional heading which labels it. Must be used as
  a child of a `ContextMenu`.

  Adjacent groups are separated by a divider, so a group without a heading is how a menu is split
  into unlabelled parts.

  Note: A group draws its divider even if it contains no items, so render the whole section
  conditionally rather than only its items.

  @example
  ```svelte
  <ContextMenu.Group icon={{glyph: 'volume_up'}}>
    {#snippet heading()}Speakers{/snippet}

    <ContextMenu.Item onclick={handleClickSpeaker}>Built-in speakers</ContextMenu.Item>
  </ContextMenu.Group>
  ```
-->

<script lang="ts" module>
  import type {Snippet} from 'svelte';
  import type {HTMLAttributes} from 'svelte/elements';
  import {cn} from 'tailwind-variants';

  import type {WithChildren, WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';
  import Icon, {type IconProps} from '../icon/Icon.svelte';

  type BaseProps = WithElementRef<
    WithChildren<{
      /**
       * Label of the section, rendered above its items. A section without one is separated from its
       * neighbours, but not labelled.
       */
      readonly heading?: Snippet;
      /**
       * An icon to render to the left of the `heading`. Ignored if the section has no heading.
       */
      readonly icon?: Pick<IconProps, 'font' | 'glyph'>;
    }>,
    HTMLDivElement
  >;

  export type ContextMenuGroupProps = BaseProps &
    WithoutChildren<
      Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps | 'aria-labelledby' | 'role'>
    >;
</script>

<script lang="ts">
  let {
    children,
    class: className,
    heading,
    icon,
    ref = $bindable(null),
    ...restProps
  }: ContextMenuGroupProps = $props();

  const headingId = $props.id();
</script>

<!--
  The section spans the whole menu and passes its columns on to its rows, so that they line up with
  the rows of every other section.

  The divider is drawn by the section which follows another one, which is why a menu cannot end up
  with a dangling divider.
-->
<div
  bind:this={ref}
  aria-labelledby={heading === undefined ? undefined : headingId}
  class={cn(
    'col-span-full grid grid-cols-subgrid border-grey-200 dark:border-grey-700 [[role=group]+&]:mt-2 [[role=group]+&]:border-t [[role=group]+&]:pt-2',
    className,
  )}
  role="group"
  {...restProps}
>
  {#if heading !== undefined}
    <div
      id={headingId}
      class="col-span-full grid grid-cols-subgrid items-center px-4 py-1 text-xs font-medium text-grey-500 select-none dark:text-grey-400"
    >
      {#if icon !== undefined}
        <Icon class="col-start-1 mr-2" {...icon} />
      {/if}

      <span class="col-start-2 truncate">{@render heading()}</span>
    </div>
  {/if}

  {@render children?.()}
</div>
