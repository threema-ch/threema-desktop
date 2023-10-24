<!--
  @component 
  Renders the name of the sender of a message.
-->
<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {SenderProps} from '~/app/ui/components/molecules/message/internal/sender/props';

  type $$Props = SenderProps;

  export let color: $$Props['color'];
  export let name: $$Props['name'];
</script>

<span class="sender" style="--c-t-text-color: var(--c-profile-picture-initials-{color});">
  <Text text={name} wrap={false} selectable={true} />
</span>

<style lang="scss">
  @use 'component' as *;

  $-vars: (text-color);
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  .sender {
    @extend %font-small-700;
    color: var($-temp-vars, --c-t-text-color);
  }
</style>
