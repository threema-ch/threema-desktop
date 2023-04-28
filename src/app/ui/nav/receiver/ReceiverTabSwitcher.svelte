<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {type ContactTab} from '~/app/ui/nav';
  import Tab from '~/app/ui/nav/receiver/Tab.svelte';

  export let activeTab: ContactTab;

  /**
   *  TODO(DESK-830): Temporary variable to show with or without groups tab.
   *                   This will not any more needed if forwarding flow is rewitten with viewmodels
   */
  export let tmpShowGroup = true;

  const buildVariant = import.meta.env.BUILD_VARIANT;
</script>

<template>
  <div data-variant={buildVariant} data-groups={tmpShowGroup}>
    {#if buildVariant === 'work'}
      <Tab tab="work-contacts" bind:activeTab>
        <MdIcon theme="Outlined">work_outline</MdIcon>
      </Tab>
    {/if}
    <Tab tab="private-contacts" bind:activeTab>
      <MdIcon theme="Outlined">person</MdIcon>
    </Tab>
    {#if tmpShowGroup}
      <Tab tab="groups" bind:activeTab>
        <MdIcon theme="Outlined">group</MdIcon>
      </Tab>
    {/if}
    <!-- // TODO(DESK-236): Display distribution list again after the model has been introduced -->
    <!-- <Tab tab="distribution-lists" bind:activeTab>
      <MdIcon theme="Outlined">campaign</MdIcon>
    </Tab> -->
  </div>
</template>

<style lang="scss">
  @use 'component' as *;
  div {
    display: grid;
    // TODO(DESK-236): Display distribution list again after the model has been introduced
    // grid-template: 'contacts groups distributionlists';
    grid-template: 'contacts';
    place-items: center;
    justify-items: stretch;
    user-select: none;
    --c-icon-font-size: #{rem(24px)};

    &[data-groups='true'] {
      grid-template: 'contacts groups';
    }

    &[data-variant='work'] {
      // TODO(DESK-236): Display distribution list again after the model has been introduced
      // grid-template: 'work contacts groups distributionlists';
      grid-template: 'work contacts groups';
    }
  }
</style>
