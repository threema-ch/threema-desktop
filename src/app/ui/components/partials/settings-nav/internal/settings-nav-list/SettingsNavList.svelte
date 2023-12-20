<!--
  @component
  Renders a list of settings nav items that link to the various settings pages.
-->
<script lang="ts">
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {getSettingsNavItems} from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/helpers';
  import SettingsNavElement from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/internal/settings-nav-item/SettingsNavItem.svelte';
  import type {SettingsNavItemProps} from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/internal/settings-nav-item/props';
  import type {SettingsNavListProps} from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/props';
  import {i18n} from '~/app/ui/i18n';
  import {ensureSettingsCategory, type SettingsCategory} from '~/common/settings';

  type $$Props = SettingsNavListProps;

  export let services: $$Props['services'];

  const {router} = services;

  function handleClickItem(category: SettingsCategory): void {
    router.replaceMain(ROUTE_DEFINITIONS.main.settings.withTypedParams({category}));
  }

  // TODO(DESK-1238): Let svelte 4 directly iterate over the object.
  $: settingsNavItems = Object.entries<SettingsNavItemProps>({...getSettingsNavItems($i18n)});
</script>

<div class="settings-category-list">
  {#each settingsNavItems as [category, props]}
    {@const isActive =
      $router.main.id === 'settings' ? $router.main.params.category === category : false}

    <div class="settings-category">
      <SettingsNavElement
        {isActive}
        {...props}
        on:click={() => handleClickItem(ensureSettingsCategory(category))}
      />
    </div>
  {/each}
</div>

<style lang="scss">
  @use 'component' as *;

  .settings-category-list {
    max-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }
</style>
