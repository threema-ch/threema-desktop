<!--
  @component 
  Renders `<slot name="below">` wrapped in an overlay, which dims the available area and
  contains `<slot name="above">` in its center.
-->
<script lang="ts">
  import type {OverlayProviderProps} from '~/app/ui/components/hocs/overlay-provider/props';

  type $$Props = OverlayProviderProps;

  export let show: NonNullable<$$Props['show']> = false;
</script>

<div class="container">
  {#if show}
    <span class="overlay">
      <slot name="above" />
    </span>
  {/if}

  <slot name="below" />
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    position: relative;

    .overlay {
      position: absolute;
      display: flex;
      z-index: $z-index-plus;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      left: 0;
      top: 0;
      background-color: var(--mc-message-overlay-background-color);
    }
  }
</style>
