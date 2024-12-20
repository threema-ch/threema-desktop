<!--
  @component
  An element that sticks to another element (the _reference_),
  while ensuring that it doesn't overflow a _container_ (or the window). It handles:

  - Opening and closing.
  - Positioning.
  - Animations.
  - Updating the {@link popoverStore} to ensure that only a single popover is visible.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {clickoutside} from '~/app/ui/actions/clickoutside';
  import {getPopoverOffset, popoverStore} from '~/app/ui/generic/popover/helpers';
  import type {PopoverProps} from '~/app/ui/generic/popover/props';
  import type {Offset} from '~/app/ui/generic/popover/types';
  import {fade} from '~/app/ui/transitions/fade';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = PopoverProps;

  export let afterClose: $$Props['afterClose'] = undefined;
  export let afterOpen: $$Props['afterOpen'] = undefined;
  export let anchorPoints: NonNullable<$$Props['anchorPoints']> = {
    reference: {horizontal: 'left', vertical: 'bottom'},
    popover: {horizontal: 'left', vertical: 'top'},
  };
  export let beforeClose: $$Props['beforeClose'] = undefined;
  export let beforeOpen: $$Props['beforeOpen'] = undefined;
  export let closeOnClickOutside: NonNullable<$$Props['closeOnClickOutside']> = true;
  let constraintContainer: $$Props['container'] = undefined;
  export {constraintContainer as container};
  export let element: $$Props['element'] = undefined;
  export let flip: NonNullable<$$Props['flip']> = true;
  export let offset: NonNullable<$$Props['offset']> = {left: 0, top: 0};
  export let safetyGap: NonNullable<$$Props['safetyGap']> = {left: 0, right: 0, top: 0, bottom: 0};
  export let reference: $$Props['reference'] = undefined;
  export let triggerBehavior: NonNullable<$$Props['triggerBehavior']> = 'toggle';

  const dispatch = createEventDispatcher<{
    willopen: undefined;
    willclose: undefined;
    hasopened: undefined;
    hasclosed: undefined;
    clicktrigger: MouseEvent;
    clickoutside: MouseEvent;
  }>();

  // Svelte will set the element explicitly to null, if the element gets deleted.
  let trigger: SvelteNullableBinding<HTMLElement> = null;
  let popover: SvelteNullableBinding<HTMLElement> = null;

  let position: Offset | undefined = undefined;
  let isOpen = false;

  /**
   * Close the `popover`.
   */
  export function close(event?: MouseEvent): void {
    dispatch('willclose');
    beforeClose?.(event);

    isOpen = false;

    // Remove any existing close function.
    popoverStore.set(undefined);
  }

  /**
   * Open the `popover`.
   */
  export function open(event?: MouseEvent): void {
    dispatch('willopen');
    beforeOpen?.(event);

    if ($popoverStore !== undefined) {
      // Call the defined close function.
      $popoverStore(event);
      // Remove the close function.
      popoverStore.set(undefined);
    }
    // Define a new close function.
    popoverStore.set(close);

    isOpen = true;
  }

  /**
   * Open or close the `popover`, depending on its previous state.
   */
  export function toggle(event?: MouseEvent): void {
    if (isOpen) {
      close(event);
    } else {
      open(event);
    }
  }

  /**
   * Force recalculation of the popup's positioning, and update.
   */
  export function forceReposition(): void {
    if (isOpen) {
      updatePosition();
    }
  }

  function calculatePosition(): typeof position {
    const currentReference = reference ?? trigger ?? undefined;

    if (!element || !currentReference || !popover) {
      return undefined;
    }

    const popoverOffset = getPopoverOffset(
      constraintContainer ?? document.body,
      element,
      currentReference,
      popover,
      anchorPoints,
      offset,
      flip,
      safetyGap,
    );

    return popoverOffset;
  }

  function updatePosition(): void {
    position = calculatePosition();
  }

  function handleClickTrigger(event: MouseEvent): void {
    dispatch('clicktrigger', event);

    switch (triggerBehavior) {
      case 'none':
        break;

      case 'open':
        open(event);
        break;

      case 'toggle':
        toggle(event);
        break;

      default:
        unreachable(triggerBehavior);
    }
  }

  function handleClickOutside(event: MouseEvent): void {
    if (popover === null) {
      return;
    }

    if (!isOpen) {
      return;
    }

    // Ignore clicks inside trigger.
    if (
      // If `triggerBehavior` is not `"none"`, clicks on it should not count as clicks outside, or
      // it would be closed immediately.
      triggerBehavior !== 'none' &&
      (event.target === trigger || trigger?.contains(event.target as Node) === true)
    ) {
      return;
    }

    // Ignore clicks inside wrapper.
    if (event.target === popover || popover.contains(event.target as Node)) {
      return;
    }

    dispatch('clickoutside', event);

    if (!closeOnClickOutside) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    close();
  }

  $: reactive(updatePosition, [constraintContainer, element, reference, trigger, popover]);
</script>

<div class="container" bind:this={element}>
  {#if $$slots.trigger}
    <!-- Disable a11y warnings here, because `"trigger"` actually isn't intended as a clickable
    element itself, but only as an unstyled wrapper element that catches and handles `"click"`
    events (because `<slot>` doesn't support them directly). The contents of the slot should instead
    handle a11y themselves and emit the necessary click events. Note: Use `<button>`s as slot
    content, so we get click events "for free" (even on keypress). -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="trigger" bind:this={trigger} on:click={handleClickTrigger}>
      <slot name="trigger" />
    </div>
  {/if}

  {#if isOpen}
    <div
      bind:this={popover}
      transition:fade={{duration: 100}}
      use:clickoutside={{enabled: isOpen}}
      class="popover"
      on:clickoutside={({detail: {event}}) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        handleClickOutside(event);
      }}
      on:introend={() => {
        dispatch('hasopened');
        afterOpen?.();
      }}
      on:outroend={() => {
        dispatch('hasclosed');
        afterClose?.();
      }}
      style:transform={position === undefined
        ? undefined
        : `translate(${position.left}px, ${position.top}px)`}
    >
      <slot name="popover" />
    </div>
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    position: relative;

    .popover {
      position: absolute;
      z-index: $z-index-modal;
      left: 0;
      top: 0;
    }
  }
</style>
