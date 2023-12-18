<!--
  @component
  Renders the settings navigation sidebar.
-->
<script lang="ts">
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import SettingsNavList from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/SettingsNavList.svelte';
  import type {SettingsNavProps} from '~/app/ui/components/partials/settings-nav/props';
  import {i18n} from '~/app/ui/i18n';

  type $$Props = SettingsNavProps;

  export let services: $$Props['services'];

  const {router} = services;

  function handleClickBack(): void {
    router.go(
      ROUTE_DEFINITIONS.nav.conversationList.withoutParams(),
      ROUTE_DEFINITIONS.main.welcome.withoutParams(),
      undefined,
      undefined,
    );
  }
</script>

<div class="container">
  <div class="navbar">
    <div class="left">
      <IconButton flavor="naked" on:click={handleClickBack}>
        <MdIcon theme="Outlined">arrow_back</MdIcon>
      </IconButton>
    </div>
    <div class="center">
      <Text
        text={$i18n.t('settings.label--title')}
        color="mono-high"
        family="secondary"
        size="body"
      />
    </div>
  </div>
  <div class="list">
    <SettingsNavList {services} />
  </div>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    overflow: hidden;
    background-color: var(--t-nav-background-color);
    grid-template:
      'navbar' min-content
      'list' 1fr
      / 100%;

    .navbar {
      grid-area: navbar;
      padding: rem(12px) rem(16px);
      display: grid;
      grid-template:
        'left center right' min-content
        / rem(40px) auto rem(40px);
      gap: rem(12px);
      align-items: center;

      .left {
        grid-area: left;
      }

      .center {
        grid-area: center;
        justify-self: center;
      }
    }

    .list {
      grid-area: list;
    }
  }
</style>
