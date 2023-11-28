<script lang="ts">
  import {getSettingsInformationMap} from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/helpers';
  import SettingsNavElement from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/internal/settings-nav-element/SettingsNavElement.svelte';
  import type {SettingsNavListProps} from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/props';
  import type {SettingsInformation} from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/types';
  import {i18n} from '~/app/ui/i18n';
  import {ensureSettingsCategory} from '~/common/settings';

  type $$Props = SettingsNavListProps;

  export let services: $$Props['services'];

  $: settingsInformation = getSettingsInformationMap($i18n);
  // TODO(DESK-1238) let svelte 4 directly iterate over the object
  $: iterableSettingsWithIcon = Object.entries<SettingsInformation>({...settingsInformation});
</script>

<template>
  <div class="settings-category-list">
    <div class="anchor" />
    {#each iterableSettingsWithIcon as [category, info]}
      <div class="settings-category">
        <SettingsNavElement
          {services}
          settingsInformation={info}
          category={ensureSettingsCategory(category)}
        ></SettingsNavElement>
      </div>
    {/each}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .settings-category-list {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;

    overflow-y: auto;
    overflow-x: hidden;
    scroll-snap-type: y mandatory;

    .anchor {
      height: 1px;
    }
  }
</style>
