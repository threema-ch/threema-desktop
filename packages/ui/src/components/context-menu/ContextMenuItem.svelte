<!--
  @component An item of a `ContextMenu`, i.e. an action to run or a choice to make. Must be used as
  a child of a `ContextMenu` or `ContextMenu.Group`.

  An item which is part of a set of choices takes a `checked` prop, which marks it as selected for
  assistive technology and displays a check mark in place of an `icon`.

  If an asynchronous `onclick` handler is given, the item is disabled and a loading spinner is
  displayed if there is space for it.

  Note: The label of an item is truncated instead of wrapping, so pass the untruncated text as the
  native `title` if it may be longer than the menu is wide.

  @example
  ```svelte
  <ContextMenu.Item icon={{glyph: 'content_copy'}} onclick={handleClickCopy}>Copy link</ContextMenu.Item>

  <ContextMenu.Item checked={microphone.id === selectedMicrophoneId} title={microphone.label}>
    {microphone.label}
  </ContextMenu.Item>
  ```
-->

<script lang="ts" module>
  import type {HTMLButtonAttributes} from 'svelte/elements';
  import {cn} from 'tailwind-variants';

  import type {WithChildren, WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';
  import type {AwaitableMouseEventHandler} from '../../utils/mouse-event';
  import Icon, {type IconProps} from '../icon/Icon.svelte';

  type BaseProps = WithElementRef<
    WithChildren<{
      /**
       * Whether the item is one of a set of choices, and whether it is the one currently selected.
       * A checked item displays a check mark, unless an `icon` of its own is given. Defaults to
       * `undefined`, i.e. the item is an action rather than a choice.
       */
      readonly checked?: boolean;
      /**
       * Whether the item cannot be selected. Note: A disabled item is skipped when the menu is
       * navigated with the keyboard. Defaults to `false`.
       */
      readonly disabled?: boolean;
      /**
       * An icon to render to the left of the label.
       */
      readonly icon?: Pick<IconProps, 'font' | 'glyph'>;
      /**
       * Callback to call when the item is selected. Note: If it returns a `Promise` which rejects,
       * the error is reported to the logger of the surrounding menu.
       */
      readonly onclick?: AwaitableMouseEventHandler<HTMLButtonElement>;
    }>,
    HTMLButtonElement
  >;

  export type ContextMenuItemProps = BaseProps &
    WithoutChildren<Omit<HTMLButtonAttributes, keyof BaseProps | 'aria-checked' | 'role' | 'type'>>;
</script>

<script lang="ts">
  import {isPromise} from '@threema/ts-utils/promise/is-promise';

  import Spinner from '../spinner/Spinner.svelte';

  import {getContextMenuContext} from './context';

  let {
    checked,
    children,
    class: className,
    disabled = false,
    icon,
    onclick,
    ref = $bindable(null),
    ...restProps
  }: ContextMenuItemProps = $props();

  const context = getContextMenuContext();

  let isPending = $state<boolean>(false);

  /**
   * A check mark is what marks a choice as the selected one, but an explicit icon takes precedence
   * over it, e.g. where the items of a set carry an icon each.
   */
  const displayedIcon = $derived<Pick<IconProps, 'font' | 'glyph'> | undefined>(
    icon ?? (checked === true ? {glyph: 'check'} : undefined),
  );

  /**
   * Whether the leading cell is used or reserved for potential use.
   */
  const hasLeadingCell = $derived(icon !== undefined || checked !== undefined);

  function handleClick(
    event: MouseEvent & {readonly currentTarget: EventTarget & HTMLButtonElement},
  ): void {
    // Ignore the click if a previous one is still running, so that a handler cannot be started
    // twice.
    if (isPending) {
      return;
    }

    const result = onclick?.(event);
    if (isPromise(result)) {
      isPending = true;
      result
        .catch((error: unknown) => {
          context.log.error("An error occurred in ContextMenu.Item 'onclick' handler: ", error);
        })
        .finally(() => {
          isPending = false;
        });
    }
  }
</script>

<!--
  The item spans the whole menu and takes its columns from it, so that its icon and its label line
  up with those of every other item.

  Note: The tab index is assigned by the surrounding menu, which keeps the tab stop on a single
  item.
-->
<button
  bind:this={ref}
  aria-busy={isPending ? true : undefined}
  aria-checked={checked}
  class={cn(
    'col-span-full grid grid-cols-subgrid items-center px-4 py-2 text-left ring-black outline-none select-none ring-inset hover:cursor-pointer hover:bg-black/5 focus-visible:ring-1 active:bg-black/10 disabled:pointer-events-none disabled:opacity-50 aria-checked:text-primary-800 dark:ring-white dark:hover:bg-white/5 dark:active:bg-white/10 dark:aria-checked:text-primary-500',
    className,
  )}
  {disabled}
  onclick={handleClick}
  role={checked === undefined ? 'menuitem' : 'menuitemradio'}
  type="button"
  {...restProps}
>
  {#if isPending && hasLeadingCell}
    <!-- Sized to match the line height, so that it takes exactly the space an icon would. -->
    <Spinner class="col-start-1 mr-2 size-[1lh]" />
  {:else if displayedIcon !== undefined}
    <Icon class="col-start-1 mr-2" {...displayedIcon} />
  {:else if checked === false}
    <!-- Placeholder to reserve the cell if it isn't checked yet and has no default icon. -->
    <span class="col-start-1 mr-2 size-[1lh]"></span>
  {/if}

  <span class="col-start-2 truncate">{@render children?.()}</span>
</button>
