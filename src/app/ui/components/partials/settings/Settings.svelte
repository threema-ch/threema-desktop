<!--
  @component
  Renders the main settings view.
-->
<script lang="ts">
  import type {SvelteComponent} from 'svelte';

  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import About from '~/app/ui/components/partials/settings/internal/about/About.svelte';
  import type {AboutProps} from '~/app/ui/components/partials/settings/internal/about/props';
  import AppearanceSettings from '~/app/ui/components/partials/settings/internal/appearance-settings/AppearanceSettings.svelte';
  import type {AppearanceSettingsProps} from '~/app/ui/components/partials/settings/internal/appearance-settings/props';
  import DevicesSettings from '~/app/ui/components/partials/settings/internal/devices-settings/DevicesSettings.svelte';
  import type {DevicesSettingsProps} from '~/app/ui/components/partials/settings/internal/devices-settings/props';
  import MediaSettings from '~/app/ui/components/partials/settings/internal/media-settings/MediaSettings.svelte';
  import type {MediaSettingsProps} from '~/app/ui/components/partials/settings/internal/media-settings/props';
  import ProfileSettings from '~/app/ui/components/partials/settings/internal/profile-settings/ProfileSettings.svelte';
  import type {ProfileSettingsProps} from '~/app/ui/components/partials/settings/internal/profile-settings/props';
  import SecuritySettings from '~/app/ui/components/partials/settings/internal/security-settings/SecuritySettings.svelte';
  import type {SecuritySettingsProps} from '~/app/ui/components/partials/settings/internal/security-settings/props';
  import type {SettingsProps} from '~/app/ui/components/partials/settings/props';
  import {i18n} from '~/app/ui/i18n';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {reactive} from '~/app/ui/utils/svelte';
  import {display} from '~/common/dom/ui/state';
  import type {SettingsCategory} from '~/common/settings';

  type $$Props = SettingsProps;

  interface SettingsPage {
    readonly title: string;
    readonly component: typeof SvelteComponent<
      | AboutProps
      | AppearanceSettingsProps
      | DevicesSettingsProps
      | MediaSettingsProps
      | ProfileSettingsProps
      | SecuritySettingsProps
    >;
  }

  export let services: $$Props['services'];

  const {router} = services;

  let settingsPageMap: {[Key in Exclude<SettingsCategory, 'calls' | 'privacy'>]: SettingsPage};
  let settingsPage: SettingsPage;

  function handleClickBack(): void {
    router.replaceMain(ROUTE_DEFINITIONS.main.welcome.withoutParams());
  }

  function handleChangeRoute(): void {
    const route = $router.main;

    if (route.id !== 'settings') {
      return;
    }

    if (route.params.category === 'calls' || route.params.category === 'privacy') {
      return;
    }

    settingsPage = settingsPageMap[route.params.category];
  }

  function handleChangeLanguage(): void {
    settingsPageMap = {
      about: {
        title: $i18n.t('settings--about.label--title', 'About Threema'),
        component: About,
      },
      appearance: {
        title: $i18n.t('settings--appearance.label--title', 'Appearance Settings'),
        component: AppearanceSettings,
      },
      profile: {
        title: $i18n.t('settings--profile.label--title', 'Profile Settings'),
        component: ProfileSettings,
      },
      security: {
        title: $i18n.t('settings--security.label--title', 'Security Settings'),
        component: SecuritySettings,
      },
      devices: {
        title: $i18n.t('settings--devices.label--title', 'Device Settings'),
        component: DevicesSettings,
      },
      media: {
        title: $i18n.t('settings--media.label--title', 'Media & Storage'),
        component: MediaSettings,
      },
    };
  }

  $: reactive(handleChangeLanguage, [$i18n]);
  $: reactive(handleChangeRoute, [$router.main, settingsPageMap]);
</script>

<div class="container">
  <div class="navbar">
    {#if $display === 'small'}
      <div class="left">
        <IconButton flavor="naked" on:click={handleClickBack}>
          <MdIcon theme="Outlined">arrow_back</MdIcon>
        </IconButton>
      </div>
    {/if}

    <div class="center">
      <Text text={settingsPage.title} color="mono-high" family="secondary" size="body" />
    </div>
  </div>

  <div class="content">
    <svelte:component this={settingsPage.component} {services} />
  </div>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    grid-template:
      'navbar' min-content
      'content' auto
      / auto;
    overflow: hidden;

    .navbar {
      grid-area: navbar;
      padding: rem(12px) rem(16px);
      display: grid;
      grid-template:
        'left center right' minmax(rem(40px), min-content)
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

    .content {
      grid-area: content;
      max-height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      padding-bottom: rem(12px);
    }
  }
</style>
