<!--
  @component Test fixture which renders a `PopoverProvider` with a button as its trigger and a
  button inside its popover, plus an unrelated button placed away from both. Not part of the
  package's API.
-->

<script lang="ts" module>
  import PopoverProvider, {type PopoverProviderProps} from './PopoverProvider.svelte';

  export type PopoverProviderFixtureProps = Omit<PopoverProviderProps, 'anchor' | 'popover'>;
</script>

<script lang="ts">
  const props: PopoverProviderFixtureProps = $props();
</script>

<PopoverProvider {...props}>
  {#snippet anchor(anchorProps)}
    <button {...anchorProps} type="button">Trigger</button>
  {/snippet}

  {#snippet popover()}
    <button type="button">Inside</button>
  {/snippet}
</PopoverProvider>

<!--
  An unrelated button element for testing outside clicks. Placed in a corner, so that it is never
  covered by the popover, which is rendered next to the trigger in the top layer.
-->
<button class="fixed bottom-4 left-4" type="button">Outside</button>
