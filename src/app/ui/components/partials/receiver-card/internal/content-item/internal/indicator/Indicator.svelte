<!--
  @component 
  Renders the status indicator icon of a receiver (i.e., the status of the last message in the
  corresponding conversation).
-->
<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {getIndicatorElement} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/indicator/helpers';
  import type {IndicatorProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/indicator/props';

  type $$Props = IndicatorProps;

  export let conversation: $$Props['conversation'];
  export let options: $$Props['options'] = undefined;
  export let reactions: NonNullable<$$Props['reactions']> = [];
  export let status: $$Props['status'];

  $: element = getIndicatorElement(reactions, conversation.receiver.type, status, options);
</script>

{#if element !== undefined}
  <span class={`element ${element.color ?? 'default'}`}>
    <MdIcon theme="Filled">{element.icon}</MdIcon>
  </span>
{/if}

<style lang="scss">
  @use 'component' as *;

  .element {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: rem(3px);
    font-size: rem(12px);
    line-height: rem(18px);

    &.acknowledged {
      color: var(--mc-message-status-acknowledged-color);
    }

    &.declined {
      color: var(--mc-message-status-declined-color);
    }

    &.error {
      color: var(--mc-message-status-error-color);
    }
  }
</style>
