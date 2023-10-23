<!--
  @component
  Renders a chat message bubble.
-->
<script lang="ts">
  import type {BubbleProps} from '~/app/ui/components/molecules/message/internal/bubble/props';

  type $$Props = BubbleProps;

  export let direction: $$Props['direction'];
  export let padding: NonNullable<$$Props['padding']> = 'normal';
</script>

<div class={`bubble ${direction} ${padding}`}>
  <slot />
</div>

<style lang="scss">
  @use 'component' as *;

  .bubble {
    border-radius: rem(10px);

    &.inbound {
      background-color: var(--mc-message-background-color-incoming);
    }

    &.outbound {
      background-color: var(--mc-message-background-color-outgoing);
    }

    &.normal {
      padding: rem(8px) rem(10px);
    }

    &.thin {
      padding: rem(2px);
    }
  }
</style>
