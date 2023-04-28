<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {i18n} from '~/app/ui/i18n';

  const dispatch = createEventDispatcher();
</script>

<template>
  <header>
    <IconButton
      flavor="naked"
      on:click={() => {
        dispatch('back');
      }}
    >
      <MdIcon theme="Outlined">arrow_back</MdIcon>
    </IconButton>
    {$i18n.t('contacts.label--contacts', 'Contacts')}
    <IconButton
      on:click={() => {
        dispatch('more');
      }}
      flavor="naked"
      class="wip"
    >
      <MdIcon theme="Outlined">more_vert</MdIcon>
    </IconButton>
  </header>
</template>

<style lang="scss">
  @use 'component' as *;
  header {
    display: grid;
    grid-template:
      'back title more'
      / min-content auto min-content;
    grid-auto-flow: column;
    justify-content: space-between;
    place-items: center;
    user-select: none;
  }
</style>
