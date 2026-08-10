<!--
  @component A vertical navigation strip, intended for app navigation.

  The strip is composed of two groups laid out top-to-bottom:

  - `startItems`: The primary feature navigation. Rendered in a scrollable container so that, when
    the window becomes too short, these items scroll *behind* the fixed end group instead of
    overlapping it.
  - `endItems` + `avatar`: A fixed group pinned to the bottom (e.g. Settings, then the user avatar).
-->
<script lang="ts" module>
  import {cn, tv} from 'tailwind-variants';

  import type {WithElementRef} from '../../utils/element';
  import {Avatar, type AvatarProps} from '../avatar';
  import Icon, {type IconProps} from '../icon/Icon.svelte';

  export const verticalNavigationStripVariants = tv({
    slots: {
      // Fills the area given by the consumer in both dimensions.
      root: 'relative flex h-full w-full flex-col items-center overflow-hidden select-none',
      start:
        'flex min-h-0 w-full flex-1 flex-col items-center gap-5 overflow-y-auto pb-6 ![scrollbar-width:none]',
      // Non-shrinking end group. The `before` pseudo-element fades out the start group content
      // scrolling up behind it.
      end: 'relative flex w-full shrink-0 flex-col items-center gap-5 bg-white pt-2 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-6 before:bg-gradient-to-t before:from-white before:to-transparent dark:bg-grey-800 dark:before:from-grey-800',
      item: 'group flex w-full flex-col items-center gap-1 rounded-md px-2 text-grey-900 outline-none hover:cursor-pointer dark:text-grey-50',
      iconBox:
        'flex items-center justify-center rounded-lg p-2 ring-black transition-colors ring-inset group-focus-visible:ring-1 dark:ring-white',
      label:
        'w-full overflow-hidden text-center text-[10px] leading-3.5 font-semibold tracking-[-0.2px] text-ellipsis whitespace-nowrap',
    },
    variants: {
      active: {
        true: {
          iconBox: 'bg-grey-200 dark:bg-grey-600',
          item: 'dark:text-grey-50',
        },
        false: {
          iconBox:
            'group-hover:bg-grey-100 active:bg-grey-200 dark:group-hover:bg-grey-700 dark:active:bg-grey-600',
        },
      },
    },
    defaultVariants: {
      active: false,
    },
  });

  interface NavTarget {
    /**
     * Whether this item represents the currently active area.
     */
    readonly active?: boolean;
    /**
     * Callback invoked when the item is triggered, and is not already `active`.
     */
    readonly onclick?: (event: MouseEvent) => void;
    /**
     * Optional stable identifier, rendered as a `data-testid` attribute on the rendered button for
     * use as a test selector.
     */
    readonly testId?: string;
  }

  export interface VerticalNavigationItem extends NavTarget {
    /**
     * Icon to render above the label.
     *
     * Note: The font style is not configurable, because it conveys whether the item is `active`.
     */
    readonly icon: {
      readonly font?: Pick<NonNullable<IconProps['font']>, 'family'>;
      readonly glyph: IconProps['glyph'];
    };
    /**
     * Short label rendered below the icon. Also used as the item's accessible name.
     */
    readonly label: string;
  }

  export type VerticalNavigationAvatar = NavTarget &
    Pick<AvatarProps, 'color' | 'description' | 'image' | 'initials'> & {
      /**
       * Accessible name for the avatar button (e.g. the user's display name).
       */
      readonly label: string;
    };

  export type VerticalNavigationStripProps = WithElementRef<
    {
      /**
       * Primary feature navigation items, rendered in the scrollable start group.
       */
      readonly startItems: readonly VerticalNavigationItem[];
      /**
       * Items rendered in the fixed end group, above the avatar.
       */
      readonly endItems?: readonly VerticalNavigationItem[];
      /**
       * Avatar button pinned to the bottom of the end group.
       */
      readonly avatar?: VerticalNavigationAvatar;
      /**
       * Accessible name for the surrounding `<nav>` landmark.
       */
      readonly label?: string;
      readonly class?: string;
    },
    HTMLElement
  >;
</script>

<script lang="ts">
  let {
    startItems,
    endItems = [],
    avatar,
    label,
    class: className,
    ref = $bindable(null),
  }: VerticalNavigationStripProps = $props();

  const slots = $derived(verticalNavigationStripVariants());

  function handleClick(target: NavTarget, event: MouseEvent): void {
    if (target.active ?? false) {
      return;
    }
    target.onclick?.(event);
  }

  /**
   * Determine the icon font style of a nav item, which conveys whether the item is active.
   */
  function getIconFontStyle(item: VerticalNavigationItem): NonNullable<IconProps['font']>['style'] {
    return (item.active ?? false) ? 'filled' : 'outlined';
  }
</script>

{#snippet navItem(item: VerticalNavigationItem)}
  {@const itemSlots = verticalNavigationStripVariants({active: item.active ?? false})}
  {@const ariaCurrent = (item.active ?? false) ? 'page' : undefined}

  <button
    type="button"
    class={itemSlots.item()}
    aria-current={ariaCurrent}
    data-testid={item.testId}
    onclick={(event) => handleClick(item, event)}
  >
    <span class={itemSlots.iconBox()}>
      <Icon
        class="text-2xl"
        font={{...item.icon.font, style: getIconFontStyle(item)}}
        glyph={item.icon.glyph}
      />
    </span>
    <span class={itemSlots.label()}>{item.label}</span>
  </button>
{/snippet}

{#snippet avatarButton(data: VerticalNavigationAvatar)}
  <button
    type="button"
    class={cn(
      'mt-2 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full outline-none hover:cursor-pointer focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white',
    )}
    aria-current={data.active === true ? 'page' : undefined}
    aria-label={data.label}
    data-testid={data.testId}
    onclick={(event) => handleClick(data, event)}
    title={data.label}
  >
    <Avatar {...data} />
  </button>
{/snippet}

<nav bind:this={ref} class={cn(slots.root(), className)} aria-label={label}>
  <div class={slots.start()}>
    {#each startItems as item (item.label)}
      {@render navItem(item)}
    {/each}
  </div>

  {#if endItems.length > 0 || avatar !== undefined}
    <div class={slots.end()}>
      {#each endItems as item (item.label)}
        {@render navItem(item)}
      {/each}
      {#if avatar !== undefined}
        {@render avatarButton(avatar)}
      {/if}
    </div>
  {/if}
</nav>
