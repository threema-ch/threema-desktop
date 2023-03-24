<!--
  @component

  Wrapper around a context menu and its trigger based on PopperJS. It handles:

  - Opening and closing the menu
  - Positioning
  - Updating the {@link contextMenuStore} to ensure that only a single context menu is visible
-->
<script lang="ts">
  import {createPopperActions, type PopperOptions} from 'svelte-popperjs';

  import {contextMenuStore} from '~/app/ui/generic/context-menu';
  import {type u32} from '~/common/types';

  type DefinedPopperOptions = NonNullable<PopperOptions<never>>;

  /**
   * The `offset` lets you displace a popper element from its reference element.
   *
   * @see {@link https://popper.js.org/docs/v2/modifiers/offset/}
   */
  interface Offset {
    /**
     * The number `skidding` displaces the popper along the reference element.
     *
     * @see {@link https://popper.js.org/docs/v2/modifiers/offset/#skidding}
     */
    readonly skidding: u32;

    /**
     * The number `distance` displaces the popper away from, or toward, the reference element in
     * the direction of its placement. A positive number displaces it further away, while a negative
     * number lets it overlap the reference.
     *
     * @see {@link https://popper.js.org/docs/v2/modifiers/offset/#distance}
     */
    readonly distance: u32;
  }

  /**
   * Describes the preferred placement of the popper. Modifiers like flip may change the placement
   * of the popper to make it fit better. Passed down to `svelte-popperjs`.
   *
   * @see {@link https://popper.js.org/docs/v2/constructors/#placement}
   */
  export let placement: DefinedPopperOptions['placement'] = 'auto';

  /**
   * Describes the positioning strategy to use. By default, it is absolute, which in the simplest
   * cases does not require repositioning of the popper. If your reference element is in a fixed
   * container, use the fixed strategy. Passed down to `svelte-popperjs`.
   *
   * @see {@link https://popper.js.org/docs/v2/constructors/#strategy}
   */
  export let strategy: DefinedPopperOptions['strategy'] = 'fixed';

  /**
   * The offset modifier lets you displace a popper element from its reference element. This can be
   * useful if you need to apply some margin between them or if you need to fine tune the position
   * according to some custom logic. Passed down to `svelte-popperjs`.
   *
   * @see {@link https://popper.js.org/docs/v2/modifiers/offset/}
   */
  export let offset: Offset = {skidding: 0, distance: 0};

  const [popperRef, popperContent] = createPopperActions({
    placement,
    strategy,
  });

  $: extraOpts = {
    placement,
    strategy,
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [offset.skidding, offset.distance],
        },
      },
    ],
  };

  // Determine if we should render the context menu
  let visible = false;

  // Svelte will set the element explicitly to null, if the element gets deleted.
  // eslint-disable-next-line @typescript-eslint/ban-types
  let trigger: HTMLElement | null = null;
  // eslint-disable-next-line @typescript-eslint/ban-types
  let panel: HTMLElement | null = null;

  /**
   * Close the context menu
   */
  export function close(): void {
    visible = false;
    // Remove any existing close function
    contextMenuStore.set(undefined);
  }

  /**
   * Open the context menu
   */
  function open(event?: MouseEvent): void {
    if ($contextMenuStore !== undefined) {
      // Call the defined close function
      $contextMenuStore(event);
      // Remove the close function
      contextMenuStore.set(undefined);
    }
    // Define a new close function
    contextMenuStore.set(close);
    visible = true;
  }

  /**
   * Toggle the context menu
   */
  function toggleVisibility(): void {
    if (visible) {
      close();
    } else {
      open();
    }
  }

  function onClickBody(event: MouseEvent): void {
    if (!visible) {
      return;
    }

    if (trigger === null || panel === null) {
      // Wrapper is not visible (was removed by svelte)
      return;
    }

    if (
      event.target === trigger ||
      event.target === panel ||
      trigger.contains(event.target as Node) ||
      panel.contains(event.target as Node)
    ) {
      // Ignore clicks inside wrapper
      return;
    }

    close();
  }
</script>

<!-- TODO(DESK-997): Consider a better strategy to detect clicks outside -->
<svelte:body on:click={onClickBody} />

<template>
  <div
    class="trigger"
    bind:this={trigger}
    use:popperRef
    on:click={toggleVisibility}
    {...$$restProps}
  >
    <slot name="trigger" />
  </div>

  {#if visible}
    <div
      class="panel"
      bind:this={panel}
      on:contextmenu|preventDefault
      use:popperContent={extraOpts}
    >
      <slot name="panel" />
    </div>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .panel {
    z-index: $z-index-context-menu;
  }
</style>
