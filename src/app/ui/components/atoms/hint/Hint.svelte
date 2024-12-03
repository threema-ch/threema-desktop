<script lang="ts">
  import type {HintProps} from '~/app/ui/components/atoms/hint/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import Tooltip from '~/app/ui/generic/popover/Tooltip.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  type $$Props = HintProps;

  export let text: $$Props['text'];
  export let icon: $$Props['icon'];

  let tooltipWrapper: HTMLElement | undefined;
  let tooltipPopover: Popover | undefined;
</script>

<span>
  <div
    class="info"
    role="tooltip"
    bind:this={tooltipWrapper}
    on:mouseenter={tooltipPopover?.open}
    on:mouseleave={tooltipPopover?.close}
  >
    <MdIcon theme="Outlined">{icon}</MdIcon>
  </div>

  <Tooltip bind:popover={tooltipPopover} reference={tooltipWrapper}>
    <p class="tooltip-content">{text}</p>
  </Tooltip>
</span>

<style lang="scss">
  @use 'component' as *;

  .info {
    font-size: rem(20px);
  }

  .tooltip-content {
    white-space: nowrap;
    padding: 0;
    margin: rem(10px);
  }
</style>
