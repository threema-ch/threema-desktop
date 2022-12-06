<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';

  const dispatch = createEventDispatcher();
</script>

<template>
  <header>
    <IconButton flavor="naked" on:click={() => dispatch('back')}>
      <MdIcon theme="Outlined">arrow_back</MdIcon>
    </IconButton>
    New Contact
    <Button on:click={() => dispatch('cancel')} flavor="naked" size="small">Cancel</Button>
  </header>
</template>

<style lang="scss">
  @use 'component' as *;
  header {
    display: grid;
    grid-template:
      'back title cancel'
      / min-content auto min-content;
    grid-auto-flow: column;
    justify-content: space-between;
    place-items: center;
    user-select: none;
  }
</style>
