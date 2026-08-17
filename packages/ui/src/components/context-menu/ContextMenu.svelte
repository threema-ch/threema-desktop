<!--
  @component A menu of actions or choices, usually composed with a `PopoverProvider` to render it in
  a popover and attach it to a trigger.

  Its items are composed as children, either directly or grouped into sections with
  `ContextMenu.Group`. The leading column is shared by all items, so labels line up whether or not
  an item has an icon of its own.

  The menu is a single tab stop, and its items are navigated with the arrow keys, `Home` and `End`.

  @example
  ```svelte
  <ContextMenu {log}>
    <ContextMenu.Item icon={{glyph: 'content_copy'}} onclick={handleClickCopy}>
      Copy link
    </ContextMenu.Item>

    <ContextMenu.Group icon={{glyph: 'mic'}}>
      {#snippet heading()}Microphone{/snippet}

      {#each microphones as microphone (microphone.id)}
        <ContextMenu.Item
          checked={microphone.id === selectedMicrophoneId}
          onclick={() => onselectmicrophone(microphone)}
          title={microphone.label}
        >
          {microphone.label}
        </ContextMenu.Item>
      {/each}
    </ContextMenu.Group>
  </ContextMenu>
  ```
-->

<script lang="ts" module>
  import type {Logger} from '@threema/ts-utils/logging/logger';
  import type {HTMLAttributes} from 'svelte/elements';
  import {cn} from 'tailwind-variants';

  import type {WithChildren, WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';

  import {setContextMenuContext} from './context';
  import {getFocusableItems, getItemToFocus} from './helpers';

  type BaseProps = WithElementRef<
    WithChildren<{
      /**
       * Logger to report errors to, e.g. if the asynchronous `onclick` handler of one of the items
       * rejects. Shared with the items, so that a menu is configured once instead of once per item.
       */
      readonly log: Logger;
    }>,
    HTMLDivElement
  >;

  export type ContextMenuProps = BaseProps &
    WithoutChildren<Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps | 'onfocusin' | 'role'>>;
</script>

<script lang="ts">
  let {
    children,
    class: className,
    log,
    onkeydown,
    ref = $bindable(null),
    ...restProps
  }: ContextMenuProps = $props();

  setContextMenuContext({
    get log() {
      return log;
    },
  });

  /**
   * Make the item which is preferred (usually the one that has focus) the menu's only tab stop, so
   * that the menu is entered and left with a single `Tab`, and navigated with the arrow keys. Falls
   * back to the first item, e.g. if the item which held the tab stop was removed.
   */
  function updateTabStop(preferred: EventTarget | undefined): void {
    if (ref === null) {
      return;
    }

    const items = getFocusableItems(ref);
    const tabStop = items.find((item) => item === preferred) ?? items[0];
    for (const item of items) {
      item.tabIndex = item === tabStop ? 0 : -1;
    }
  }

  function handleKeyDown(
    event: KeyboardEvent & {readonly currentTarget: EventTarget & HTMLDivElement},
  ): void {
    // Note: Called explicitly, because the handler of the consumer would otherwise be replaced by
    // this one when the remaining props are spread onto the element below.
    onkeydown?.(event);

    if (ref === null) {
      return;
    }

    const item = getItemToFocus(
      getFocusableItems(ref),
      document.activeElement ?? undefined,
      event.key,
    );
    if (item === undefined) {
      return;
    }

    // Prevent the arrow keys from scrolling whatever surrounds the menu.
    event.preventDefault();
    item.focus();
  }

  // The tab stop is assigned by the menu instead of by the items, because an item does not know
  // whether it is the first one. It is reassigned whenever the items change, so that a menu whose
  // items are conditional or iterated keeps exactly one of them.
  $effect(() => {
    const menu = ref;
    if (menu === null) {
      return undefined;
    }

    const observer = new MutationObserver(() => updateTabStop(document.activeElement ?? undefined));
    observer.observe(menu, {attributeFilter: ['disabled'], childList: true, subtree: true});
    updateTabStop(document.activeElement ?? undefined);

    return () => {
      observer.disconnect();
    };
  });
</script>

<!--
  The leading column is sized by the widest icon of all items, and collapses if no item has one. The
  second column may shrink below its content, so that a long label can be truncated.

  Note: The columns must not be separated by a `gap`, because it would be applied even if the
  leading column is empty. The items space their icon themselves instead.
-->
<div
  bind:this={ref}
  class={cn(
    'grid max-w-64 min-w-45 grid-cols-[auto_minmax(0,1fr)] rounded-lg bg-white py-2 text-sm text-grey-900 shadow-lg dark:bg-grey-800 dark:text-grey-50',
    className,
  )}
  onfocusin={(event) => updateTabStop(event.target ?? undefined)}
  onkeydown={handleKeyDown}
  role="menu"
  {...restProps}
>
  {@render children?.()}
</div>
