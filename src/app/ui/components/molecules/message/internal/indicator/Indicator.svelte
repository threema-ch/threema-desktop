<!--
  @component
  Renders status indicator icons of a message.
-->
<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import {getIndicatorElements} from '~/app/ui/components/molecules/message/internal/indicator/helpers';
  import type {IndicatorProps} from '~/app/ui/components/molecules/message/internal/indicator/props';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  type $$Props = IndicatorProps;

  export let direction: $$Props['direction'];
  export let options: NonNullable<$$Props['options']> = {};
  export let reactions: NonNullable<$$Props['reactions']> = [];
  export let status: $$Props['status'];
  export let isDeleted: $$Props['isDeleted'] = false;

  $: elements = getIndicatorElements(direction, options, reactions, status, isDeleted);
</script>

<template>
  {#if elements.length > 0}
    <span class="elements">
      {#each elements as element}
        <span class={`element ${element.color ?? 'default'}`}>
          <MdIcon title={element.title} theme={element.filled === true ? 'Filled' : 'Outlined'}>
            {element.icon}
          </MdIcon>
          {#if element.count !== undefined && (element.count > 1 || options.alwaysShowNumber === true)}
            <Text text={element.count.toString()} />
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
