<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';

  const dispatch = createEventDispatcher();
</script>

<template>
  <div>
    <IconButton on:click={() => dispatch('close')} flavor="naked">
      <MdIcon theme="Outlined">arrow_back</MdIcon>
    </IconButton>
    <slot />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    display: grid;
    grid-template:
      'close slot' #{rem(40px)}
      / #{rem(40px)} 1fr;
    column-gap: rem(8px);
    padding: #{rem(12px)} #{rem(8px)} #{rem(12px)} #{rem(16px)};
  }
</style>
