<!--
  @component
  Renders a chat message.
-->
<script lang="ts">
  import type {KeyValueListProps} from '~/app/ui/components/molecules/key-value-list/props';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type $$Props = KeyValueListProps;
</script>

<div class="list">
  <slot />
</div>

<style lang="scss">
  @use 'component' as *;
</style>
