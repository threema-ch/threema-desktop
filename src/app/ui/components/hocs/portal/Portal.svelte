<!--
  @component
  Renders the given content as a child of `target`. Note: If `target` is not defined,
  the portal will not be rendered at all.
-->
<script lang="ts">
  import {onDestroy, onMount} from 'svelte';

  import type {PortalProps} from '~/app/ui/components/hocs/portal/props';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {TIMER} from '~/common/utils/timer';

  type $$Props = PortalProps;

  export let hidden: NonNullable<$$Props['hidden']> = false;
  export let target: $$Props['target'] = undefined;

  let invalid = false;
  let ref: SvelteNullableBinding<HTMLElement> = null;

  onMount(() => {
    if (target !== undefined && target !== null && ref !== null) {
      target.appendChild(ref);
    } else {
      invalid = true;
    }
  });

  /**
   * Clean up the content if the portal is destroyed.
   */
  onDestroy(() => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const _ref = ref;

    // TODO(DESK-1339): Is this delay really needed? If yes, maybe replace with tick.then()?
    TIMER.timeout(() => {
      if (_ref?.parentNode) {
        _ref.parentNode.removeChild(_ref);
      }
    }, 0);
  });
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
