<!--
  @component 
  Renders status indicator icons of a message.
-->
<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Label from '~/app/ui/components/atoms/label/Label.svelte';
  import {getIndicatorElements} from '~/app/ui/components/molecules/message/internal/indicator/helpers';
  import type {IndicatorProps} from '~/app/ui/components/molecules/message/internal/indicator/props';

  type $$Props = IndicatorProps;

  export let direction: $$Props['direction'];
  export let hideStatus: NonNullable<$$Props['hideStatus']> = false;
  export let reactions: NonNullable<$$Props['reactions']> = [];
  export let status: $$Props['status'];

  $: elements = getIndicatorElements(direction, hideStatus, reactions, status);

  // TODO: Check this again, if the correct statii are displayed. Note: Currently, the message
  // status is displayed in group chats, which shouldn't be the case.
</script>

<template>
  {#if elements.length > 0}
    <span class="elements">
      {#each elements as element}
        <span class={`element ${element.color ?? 'default'}`}>
          <MdIcon theme={element.filled === true ? 'Filled' : 'Outlined'}>{element.icon}</MdIcon>

          {#if element.count !== undefined && element.count > 1}
            <Label text={element.count.toString()} />
          {/if}
        </span>
      {/each}
    </span>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .elements {
    display: flex;
    align-items: center;
    justify-content: end;
    gap: rem(4px);

    .element {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: rem(3px);

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
  }
</style>
