<script lang="ts">
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {ContactTab} from '~/app/ui/nav';
  import Tab from '~/app/ui/nav/receiver/Tab.svelte';
  import type {u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';

  export let activeTab: ContactTab;

  /**
   *  TODO(DESK-830): Temporary variable to show with or without groups tab.
   *                   This will not any more needed if forwarding flow is rewitten with viewmodels
   */
  export let tmpShowGroup = true;

  const buildVariant = import.meta.env.BUILD_VARIANT;
  const tabs = [
    {
      id: 'private-contacts',
      icon: 'person',
    },
    {
      id: 'groups',
      icon: 'group',
    },
    {
      id: 'work-contacts',
      icon: 'work_outline',
    },
    {
      id: 'distribution-lists',
      icon: 'campaign',
    },
  ] as const;

  function isTabVisible(tab: (typeof tabs)[u53]): boolean {
    switch (tab.id) {
      case 'work-contacts':
        // The work contacts tab is only visible in work builds.
        return buildVariant === 'work';

      case 'private-contacts':
        // The private contacts tab is always visible.
        return true;

      case 'groups':
        // TODO(DESK-830): The groups tab is controlled by `tmpShowGroup`. Update this if said
        // variable is removed.
        return tmpShowGroup;

      case 'distribution-lists':
        // TODO(DESK-236): Currently never displayed. Display distribution list again after the
        // model has been introduced.
        return false;

      default:
        return unreachable(tab);
    }
  }

  $: visibleTabs = tabs.filter(isTabVisible);
</script>

<template>
  {#if visibleTabs.length >= 2}
    <div style={`grid-template-columns: repeat(${visibleTabs.length}, 1fr);`}>
      {#each visibleTabs as tab}
        <Tab tab={tab.id} bind:activeTab>
          <MdIcon theme="Outlined">{tab.icon}</MdIcon>
        </Tab>
      {/each}
    </div>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;
  div {
    display: grid;
    place-items: center;
    justify-items: stretch;
    gap: rem(4px);
    user-select: none;
    --c-icon-font-size: #{rem(24px)};
  }
</style>
