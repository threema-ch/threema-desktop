<!--
  @component
  Renders the main settings view.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import {getCategoryTitle} from '~/app/ui/components/partials/settings/helpers';
  import About from '~/app/ui/components/partials/settings/internal/about/About.svelte';
  import AppearanceSettings from '~/app/ui/components/partials/settings/internal/appearance-settings/AppearanceSettings.svelte';
  import ChatSettings from '~/app/ui/components/partials/settings/internal/chat-settings/ChatSettings.svelte';
  import DevicesSettings from '~/app/ui/components/partials/settings/internal/devices-settings/DevicesSettings.svelte';
  import MediaSettings from '~/app/ui/components/partials/settings/internal/media-settings/MediaSettings.svelte';
  import ProfileSettings from '~/app/ui/components/partials/settings/internal/profile-settings/ProfileSettings.svelte';
  import SecuritySettings from '~/app/ui/components/partials/settings/internal/security-settings/SecuritySettings.svelte';
  import type {SettingsProps} from '~/app/ui/components/partials/settings/props';
  import type {RemoteSettingsViewModelStoreValue} from '~/app/ui/components/partials/settings/types';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {reactive} from '~/app/ui/utils/svelte';
  import {display} from '~/common/dom/ui/state';
  import type {SettingsCategory} from '~/common/settings';
  import {ensureError, unreachable} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';
  import type {SettingsViewModelBundle} from '~/common/viewmodel/settings';
  import type {SettingsPageUpdate} from '~/common/viewmodel/settings/controller/types';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.settings');

  type $$Props = SettingsProps;

  export let services: $$Props['services'];

  const {router} = services;

  // ViewModelBundle of the settings.
  let viewModelStore: IQueryableStore<RemoteSettingsViewModelStoreValue | undefined> =
    new ReadableStore(undefined);
  let viewModelController: Remote<SettingsViewModelBundle>['viewModelController'] | undefined =
    undefined;

  let currentCategory: Exclude<SettingsCategory, 'calls' | 'privacy'> = 'profile';

  services.backend.viewModel
    .settings()
    .then((viewModelBundle) => {
      // Unpack bundle
      viewModelStore = viewModelBundle.viewModelStore;
      viewModelController = viewModelBundle.viewModelController;
    })
    .catch((error: unknown) => {
      log.error(`Failed to load settings page: ${ensureError(error)}`);
      router.goToWelcome();
    });

  function handleClickBack(): void {
    router.goToWelcome();
  }

  function handleChangeRoute(): void {
    const route = $router.main;

    if (route.id !== 'settings') {
      return;
    }

    if (route.params.category === 'calls' || route.params.category === 'privacy') {
      return;
    }

    currentCategory = route.params.category;
  }

  function handleUpdateSettings(settingsUpdate: SettingsPageUpdate): void {
    viewModelController?.update(settingsUpdate).catch((error) => {
      log.error(`Error updating settings: ${error}`);

      toast.addSimpleFailure(
        $i18n.t('settings.error--settings-update', 'Unable to update settings, please try again.'),
      );
    });
  }

  $: reactive(handleChangeRoute, [$router.main]);
</script>

{#if $viewModelStore !== undefined}
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
        <Text
          text={getCategoryTitle(currentCategory, $i18n)}
          color="mono-high"
          family="secondary"
          size="body"
        />
      </div>
    </div>

    <div class="content">
      {#if currentCategory === 'about'}
        <About {services} />
      {:else if currentCategory === 'appearance'}
        <AppearanceSettings
          {services}
          actions={{
            updateSettings: (update) => {
              handleUpdateSettings({update, type: 'appearance'});
            },
          }}
          settings={$viewModelStore.appearance}
        />
      {:else if currentCategory === 'chat'}
        <ChatSettings
          actions={{
            updateSettings: (update) => {
              handleUpdateSettings({update, type: 'chat'});
            },
          }}
          settings={$viewModelStore.chat}
        />
      {:else if currentCategory === 'devices'}
        <DevicesSettings
          {services}
          actions={{
            updateSettings: (update) => {
              handleUpdateSettings({update, type: 'devices'});
            },
          }}
          settings={$viewModelStore.devices}
        />
      {:else if currentCategory === 'media'}
        <MediaSettings
          actions={{
            updateSettings: (update) => {
              handleUpdateSettings({update, type: 'media'});
            },
          }}
          settings={$viewModelStore.media}
        />
      {:else if currentCategory === 'profile'}
        <ProfileSettings
          {services}
          actions={{
            updateSettings: (update) => {
              handleUpdateSettings({update, type: 'profile'});
            },
          }}
          settings={$viewModelStore.profile}
        />
      {:else if currentCategory === 'security'}
        <SecuritySettings {services} />
      {:else}
        {unreachable(currentCategory)}
      {/if}
    </div>
  </div>
{/if}

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
      padding: rem(12px) rem(8px);
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
