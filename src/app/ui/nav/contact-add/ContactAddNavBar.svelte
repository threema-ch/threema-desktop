<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {i18n} from '~/app/ui/i18n';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  const dispatch = createEventDispatcher();
</script>

<template>
  <header>
    <IconButton flavor="naked" on:click={() => dispatch('back')}>
      <MdIcon theme="Outlined">arrow_back</MdIcon>
    </IconButton>
    {$i18n.t('contacts.label--add-contact', 'New Contact')}
    <Button on:click={() => dispatch('cancel')} flavor="naked" size="small"
      >{$i18n.t('contacts.action--add-contact-cancel', 'Cancel')}</Button
    >
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
