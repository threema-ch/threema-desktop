<!--
  @component Renders the given content as a child of `target`. Note: If `target` is not defined, the
  portal will not be rendered at all.
-->
<script lang="ts">
  import type {PortalProps} from '~/app/ui/components/hocs/portal/props';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  type $$Props = PortalProps;

  export let hidden: NonNullable<$$Props['hidden']> = false;
  export let target: $$Props['target'] = undefined;

  let invalid = false;
  let ref: SvelteNullableBinding<HTMLElement> = null;

  function handleChangeTarget(currentTarget: $$Props['target'], currentRef: typeof ref): void {
    if (currentTarget !== undefined && currentTarget !== null && currentRef !== null) {
      currentTarget.appendChild(currentRef);
      invalid = false;
    } else {
      invalid = true;
    }
  }

  $: handleChangeTarget(target, ref);
</script>

<div bind:this={ref} class="portal" class:hidden>
  {#if !invalid}
    <slot />
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .portal {
    &.hidden {
      display: none;
    }
  }
</style>
