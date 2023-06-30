<script lang="ts">
  import {type VirtualRect} from '~/app/ui/generic/popover';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';

  /**
   * The reference element the tooltip should attach to.
   */
  export let reference: HTMLElement | VirtualRect | undefined = undefined;

  /**
   * A reference to the popover instance of this tooltip.
   */
  export let popover: Popover | undefined = undefined;

  /**
   *
   */
</script>

<template>
  <Popover
    bind:this={popover}
    {reference}
    closeOnClickOutside={false}
    triggerBehavior="none"
    anchorPoints={{
      reference: {
        horizontal: 'center',
        vertical: 'top',
      },
      popover: {
        horizontal: 'center',
        vertical: 'bottom',
      },
    }}
    offset={{
      left: 0,
      top: -10,
    }}
  >
    <div slot="popover" class="tooltip">
      <slot />
    </div>
  </Popover>
</template>

<style lang="scss">
  @use 'component' as *;

  .tooltip {
    display: none;
    background: var(--ic-tooltip-background-color);
    color: var(--ic-tooltip-color);
    border-radius: rem(4px);
    display: flex;
    justify-content: space-around;
    align-items: center;

    &::after {
      content: '';
      width: rem(14px);
      height: rem(14px);
      background: var(--ic-tooltip-background-color);
      border-radius: rem(2px);
      position: absolute;
      left: 50%;
      margin-left: rem(-7px);
      bottom: rem(-5px);
      transform: rotate(45deg);
    }
  }
</style>
