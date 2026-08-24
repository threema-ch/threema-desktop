<!--
  @component Test fixture which renders a `Control` with a realistic menu, next to an element
  outside of it, so that a test can click outside the control. Not part of the package's API.
-->

<script lang="ts" module>
  import {ContextMenu} from '../../components/context-menu';

  import Control, {type ControlProps} from './Control.svelte';

  /**
   * `Omit` which distributes over a union, so that omitting from the props of `Control` keeps the
   * distinction between a button and a toggle rather than collapsing it to their common props.
   */
  type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

  export type ControlFixtureProps = {
    /**
     * Whether the control has a context menu. Defaults to `false`.
     */
    readonly hasMenu?: boolean;
  } & DistributiveOmit<ControlProps, 'icon' | 'label' | 'popover'>;
</script>

<script lang="ts">
  const {hasMenu = false, log, ...restProps}: ControlFixtureProps = $props();
</script>

{#snippet contextMenu()}
  <ContextMenu {log}>
    <ContextMenu.Item checked={true}>Headset</ContextMenu.Item>
    <ContextMenu.Item checked={false}>Built-in microphone</ContextMenu.Item>
  </ContextMenu>
{/snippet}

<Control
  icon={{glyph: 'mic'}}
  label="Microphone"
  {log}
  popover={hasMenu ? {label: 'Select microphone', content: contextMenu} : undefined}
  {...restProps}
/>

<!--
  An unrelated button element for testing outside clicks. Placed in a corner, so that it is never
  covered by the menu, which is rendered next to the chevron in the top layer.
-->
<button class="fixed bottom-4 left-4" type="button">Outside</button>
