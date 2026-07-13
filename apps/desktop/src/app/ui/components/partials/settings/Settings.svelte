<!--
  @component Renders the main settings view.
-->
<script lang="ts">
  import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
  import {ensureError} from '@threema/ts-utils/meta/ensure-error';

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
  import {reactive, svelteUnreachable} from '~/app/ui/utils/svelte';
  import {display} from '~/common/dom/ui/state';
  import type {WorkAvailabilityStatus} from '~/common/model/types/work-availability-status';
  import type {SettingsCategory} from '~/common/settings';
  import type {Remote} from '~/common/utils/endpoint';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';
  import type {SettingsViewModelBundle} from '~/common/viewmodel/settings';
  import type {SettingsPageUpdate} from '~/common/viewmodel/settings/controller/types';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.settings');

  const {services}: SettingsProps = $props();

  const {router} = services;

  // ViewModelBundle of the settings.
  let viewModelStore = $state<IQueryableStore<RemoteSettingsViewModelStoreValue | undefined>>(
    new ReadableStore(undefined),
  );
  let viewModelController: Remote<SettingsViewModelBundle>['viewModelController'] | undefined =
    undefined;

  let currentCategory =
    $state<Exclude<SettingsCategory, 'calls' | 'privacy' | 'troubleshooting' | 'work'>>('profile');

  services.backend.viewModel
    .settings()
    .then((viewModelBundle) => {
      // Unpack bundle.
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

    if (
      route.params.category === 'calls' ||
      route.params.category === 'privacy' ||
      route.params.category === 'troubleshooting' ||
      route.params.category === 'work'
    ) {
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

  async function handleUpdateProfilePicture(
    profilePicture: ReadonlyUint8Array | undefined,
  ): Promise<void> {
    try {
      await viewModelController?.updateProfilePicture(profilePicture);
    } catch (error) {
      log.error(`Error updating profile picture: ${error}`);
      toast.addSimpleFailure(
        profilePicture === undefined
          ? $i18n.t(
              'settings.error--profile-picture-settings-delete',
              'Unable to delete your profile picture, please try again.',
            )
          : $i18n.t(
              'settings.error--profile-picture-settings-update',
              'Unable to update your profile picture, please try again.',
            ),
      );
    }
  }

  async function handleUpdateWorkAvailabilityStatus(
    workAvailabilityStatus: WorkAvailabilityStatus,
  ): Promise<void> {
    await viewModelController?.updateWorkAvailabilityStatus(workAvailabilityStatus);
  }

  $effect(() => {
    reactive(handleChangeRoute, [$router.main]);
  });
</script>

{#if $viewModelStore !== undefined}
  <div
    class="container"
    data-build-platform={import.meta.env.BUILD_PLATFORM}
    data-display={$display}
  >
    <div class="top-bar">
      {#if $display === 'small'}
        <div class="left">
          <div class="back">
            <IconButton flavor="naked" onclick={handleClickBack}>
              <MdIcon theme="Outlined">arrow_back</MdIcon>
            </IconButton>
          </div>
        </div>
      {/if}

      <div class="center">
        <Text
          text={getCategoryTitle(currentCategory, $i18n)}
          color="mono-high"
          ellipsis
          family="secondary"
          size="body"
          wrap={false}
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
          {services}
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
          {services}
          settings={$viewModelStore.media}
        />
      {:else if currentCategory === 'profile'}
        <ProfileSettings
          {services}
          actions={{
            updateSettings: (update) => {
              handleUpdateSettings({update, type: 'profile'});
            },
            updateProfilePicture: handleUpdateProfilePicture,
            updateWorkAvailabilityStatus: handleUpdateWorkAvailabilityStatus,
          }}
          settings={$viewModelStore.profile}
        />
      {:else if currentCategory === 'security'}
        <SecuritySettings {services} />
      {:else}
        {svelteUnreachable(currentCategory)}
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    grid-template:
      'top-bar' min-content
      'content' auto
      / auto;
    overflow: hidden;

    .top-bar {
      grid-area: top-bar;
      padding: rem(12px) rem(8px);
      display: grid;
      grid-template:
        'left center right'
        / rem(40px) auto rem(40px);
      gap: rem(12px);
      align-items: center;

      height: rem(64px);
      user-select: none;

      .left {
        grid-area: left;
      }

      .center {
        grid-area: center;
        justify-self: center;

        min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }
    }

    .content {
      grid-area: content;
      max-height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      padding-bottom: rem(12px);
    }

    &[data-build-platform='macos'] {
      .top-bar {
        // Use as drag area for the Electron window.
        -webkit-app-region: drag;

        .left .back {
          // Keep item clickable in drag area.
          -webkit-app-region: no-drag;
        }
      }
    }
  }
</style>
