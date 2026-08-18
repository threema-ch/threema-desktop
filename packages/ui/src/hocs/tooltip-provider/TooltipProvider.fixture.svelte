<!--
  @component Test fixture which renders a `TooltipProvider` with a button as its trigger, plus an
  unrelated button to move the pointer and the focus to. Not part of the package's API.
-->

<script lang="ts" module>
  import TooltipProvider, {type TooltipProviderProps} from './TooltipProvider.svelte';

  export type TooltipProviderFixtureProps = Omit<TooltipProviderProps, 'children'> & {
    /**
     * Whether the trigger has another `onclick` handler itself. Simulates a trigger which does
     * additional things if it's clicked, in addition to being the trigger for a tooltip.
     */
    readonly hasOwnClickHandler?: boolean;
  };
</script>

<script lang="ts">
  const {hasOwnClickHandler = false, ...props}: TooltipProviderFixtureProps = $props();
</script>

<TooltipProvider {...props}>
  {#snippet children(triggerProps)}
    {#if hasOwnClickHandler}
      <button {...triggerProps} onclick={() => undefined} type="button">Trigger</button>
    {:else}
      <button {...triggerProps} type="button">Trigger</button>
    {/if}
  {/snippet}
</TooltipProvider>

<!--
  Placed in a corner, so that it is never covered by the tooltip, which is rendered next to the
  trigger in the top layer.
-->
<button class="fixed bottom-4 left-4" type="button">Elsewhere</button>
