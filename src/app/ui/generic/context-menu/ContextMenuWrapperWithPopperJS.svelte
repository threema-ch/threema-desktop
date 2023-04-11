<!--
  @component

  Wrapper around a context menu and its trigger based on PopperJS. It handles:

  - Opening and closing the menu
  - Positioning
  - Updating the {@link contextMenuStore} to ensure that only a single context menu is visible
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {createPopperActions, type PopperOptions} from 'svelte-popperjs';

  import {clickOutside, contextMenuStore} from '~/app/ui/generic/context-menu';
  import {type u32} from '~/common/types';
  import {WritableStore} from '~/common/utils/store';

  type DefinedPopperOptions = NonNullable<PopperOptions<never>>;

  /**
   * An `Offset` lets you displace the popper element from its reference element.
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
   * A `Position` lets you explicitly position the popper element at specific coordinates,
   * while still benefitting from container overflow avoidance.
   */
  interface Position {
    readonly x: u32;
    readonly y: u32;
  }

  /**
   * Describes the preferred placement of the popper. Modifiers like flip may change the placement
   * of the popper to make it fit better. Passed down to `svelte-popperjs`.
   *
   * @see {@link https://popper.js.org/docs/v2/constructors/#placement}
   */
  export let placement: DefinedPopperOptions['placement'] = 'auto';

  /**
   * Lets you explicitly position the popper element at specific coordinates,
   * while still benefitting from container overflow avoidance.
   *
   * Note: If a `position` is set, the popper element will not be tethered to the trigger position,
   * but to the supplied coordinates.
   */
  export let position: Position | undefined = undefined;

  /**
   * Describes the positioning strategy to use. By default, it is absolute, which in the simplest
   * cases does not require repositioning of the popper. If your reference element is in a fixed
   * container, use the fixed strategy. Passed down to `svelte-popperjs`.
   *
   * @see {@link https://popper.js.org/docs/v2/constructors/#strategy}
   */
  export let strategy: DefinedPopperOptions['strategy'] = 'absolute';

  /**
   * The offset modifier lets you displace a popper element from its reference element. This can be
   * useful if you need to apply some margin between them or if you need to fine tune the position
   * according to some custom logic. Passed down to `svelte-popperjs`.
   *
   * @see {@link https://popper.js.org/docs/v2/modifiers/offset/}
   */
  export let offset: Offset = {skidding: 0, distance: 0};

  /**
   * Whether clicking the trigger element should toggle the state or only open the context menu.
   */
  export let triggerBehavior: 'toggle' | 'open' = 'toggle';

  /**
   * The (optional) container element which is used as the basis for various settings,
   * e.g. restricting the positioning of the popper element to the bounds of the container.
   */
  export let container: HTMLElement | undefined = undefined;

  /**
   * Whether to restrict the positioning to the `containerElement`. The `containerElement`
   * must be defined to use this feature. If this attribute is false, the popper element
   * will be restricted to the bounds of the entire viewport.
   */
  export let restrictBoundsToContainer = false;

  /**
   * If the popper element should be closed when a click is detected outside its bounds.
   */
  export let closeOnClickOutside = true;

  /**
   * Whether to prevent clicks inside the `containerElement` to close the popper element.
   */
  export let closeOnClickWithinContainer = true;

  // Component event dispatcher
  const dispatch = createEventDispatcher<{
    open: undefined;
    close: undefined;
    clickTrigger: MouseEvent;
    clickOutside: {
      event: MouseEvent;
      isClickWithinContainer: boolean;
    };
  }>();

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
      {
        name: 'eventListeners',
        options: {
          scroll: false,
          resize: false,
        },
      },
      ...(restrictBoundsToContainer && container !== undefined
        ? [
            {
              name: 'preventOverflow',
              options: {
                boundary: container,
              },
            },
          ]
        : []),
    ],
  };

  $: getBoundingClientRect = () => {
    const rect = {
      bottom: position?.y ?? 0,
      height: 0,
      left: position?.x ?? 0,
      right: position?.x ?? 0,
      top: position?.y ?? 0,
      width: 0,
      x: position?.x ?? 0,
      y: position?.y ?? 0,
    };

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function toJSON(): string {
      return JSON.stringify(rect);
    }

    return {
      ...rect,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      toJSON,
    };
  };
  const virtualElement = new WritableStore({getBoundingClientRect});
  $: $virtualElement = {getBoundingClientRect};
  $: if (position !== undefined) {
    popperRef($virtualElement);
  } else if (trigger !== null) {
    popperRef(trigger);
  }

  // Determine if we should render the context menu.
  let visible = false;

  // Svelte will set the element explicitly to null, if the element gets deleted.
  // eslint-disable-next-line @typescript-eslint/ban-types
  let trigger: HTMLElement | null = null;
  // eslint-disable-next-line @typescript-eslint/ban-types
  let panel: HTMLElement | null = null;

  /**
   * Close the context menu.
   */
  export function close(): void {
    visible = false;

    console.log('close', contextMenuStore.get());

    // Remove any existing close function.
    contextMenuStore.set(undefined);
    dispatch('close');
  }

  /**
   * Open the context menu.
   */
  export function open(event?: MouseEvent): void {
    console.log('open', container);

    if ($contextMenuStore !== undefined) {
      // Call the defined close function.
      $contextMenuStore(event);
      // Remove the close function.
      contextMenuStore.set(undefined);
    }
    // Define a new close function.
    contextMenuStore.set(close);
    visible = true;
    dispatch('open');
  }

  function handleTriggerClick(event: MouseEvent): void {
    dispatch('clickTrigger', event);

    if (!visible) {
      open();
      return;
    }

    if (triggerBehavior === 'toggle') {
      close();
    }
  }

  function handleOutsideClick(event: MouseEvent): void {
    if (trigger === null || panel === null) {
      return;
    }

    if (!visible) {
      return;
    }

    // Ignore clicks inside wrapper.
    if (
      event.target === trigger ||
      event.target === panel ||
      trigger.contains(event.target as Node) ||
      panel.contains(event.target as Node)
    ) {
      return;
    }

    const isClickWithinContainer = isMouseEventWithinContainer(event);

    dispatch('clickOutside', {event, isClickWithinContainer});

    if (isClickWithinContainer && !closeOnClickWithinContainer) {
      return;
    }

    if (!closeOnClickOutside) {
      return;
    }

    close();
  }

  function isMouseEventWithinContainer(mouseEvent: MouseEvent): boolean {
    if (container === undefined) {
      return false;
    }

    return mouseEvent.target === container || container.contains(mouseEvent.target as Node);
  }
</script>

<!-- TODO(DESK-997): Consider a better strategy to detect clicks outside -->
<!-- <svelte:body on:click={onClickBody} /> -->

<template>
  <div class="container">
    <div class="trigger" bind:this={trigger} on:click={handleTriggerClick} {...$$restProps}>
      <slot name="trigger" />
    </div>

    {#if visible}
      <div
        class="panel"
        bind:this={panel}
        use:popperContent={extraOpts}
        use:clickOutside={{enabled: visible}}
        on:clickoutside={({detail: {event}}) => {
          handleOutsideClick(event);
        }}
      >
        <slot name="panel" />
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    position: relative;

    .panel {
      z-index: $z-index-context-menu;
    }
  }
</style>
