<script lang="ts">
  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import ProfileComponent from '~/app/ui/main/settings/Profile.svelte';
  import Select from '~/app/ui/main/settings/Select.svelte';
  import Text from '~/app/ui/main/settings/Text.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {publicKeyGrid} from '~/common/dom/ui/fingerprint';
  import {display} from '~/common/dom/ui/state';
  import {THEMES} from '~/common/dom/ui/theme';
  import {type u53} from '~/common/types';
  import {type RemoteObject} from '~/common/utils/endpoint';
  import {type ProfileViewModelStore} from '~/common/viewmodel/profile';

  export let services: AppServices;
  const {backend, logging, router, storage} = services;
  const {viewModel} = backend;
  const {debugPanelState, theme} = storage;

  const log = logging.logger('component.profile');

  let profile: RemoteObject<ProfileViewModelStore>;
  viewModel
    .profile()
    .then((loadedProfile) => {
      profile = loadedProfile;
    })
    .catch((error) => {
      log.error(`Loading profile view model failed`, error);
    });

  function closeProfile(): void {
    router.replaceMain(ROUTE_DEFINITIONS.main.welcome.withTypedParams(undefined));
  }

  let showToggleDebugMode = false;
  let versionClickedCount = 0;
  let versionClickedTimeoutHandler: u53;
  function handleVersionClick(): void {
    if (!showToggleDebugMode) {
      versionClickedCount++;

      clearTimeout(versionClickedTimeoutHandler);

      versionClickedTimeoutHandler = setTimeout(() => {
        versionClickedCount = 0;
      }, 2000);

      if (versionClickedCount >= 5) {
        toast.addSimple('You are now a developer.', {
          name: 'bug_report',
          theme: 'Filled',
          type: 'md-icon',
          color: 'green',
        });
        showToggleDebugMode = true;
      }
    }
  }

  if ($debugPanelState === 'show') {
    showToggleDebugMode = true;
  }
</script>

<template>
  <div class="profile">
    {#if profile !== undefined}
      {#if $display === 'small'}
        <div class="back">
          <IconButton flavor="naked" on:click={closeProfile}>
            <MdIcon theme="Outlined">arrow_back</MdIcon>
          </IconButton>
        </div>
      {/if}

      <ProfileComponent
        avatar={$profile.avatar}
        displayName={$profile.displayName}
        initials={$profile.initials}
        on:back={closeProfile}
      />

      <Text label="Threema ID" value={$profile.identity} />

      <div class="public-key">
        <span class="label">Public Key</span>
        <pre><code>{publicKeyGrid($profile.publicKey)}</code></pre>
      </div>

      <Text
        label="Application Name"
        value={import.meta.env.BUILD_VARIANT === 'work' ? 'Threema Work' : 'Threema'}
      />

      <div on:click={handleVersionClick}>
        <Text label="Application Version" value={import.meta.env.BUILD_VERSION} />
      </div>

      {#if `v${import.meta.env.BUILD_VERSION}` !== import.meta.env.GIT_REVISION && import.meta.env.GIT_REVISION !== ''}
        <Text label="Git Revision" value={import.meta.env.GIT_REVISION} />
      {/if}

      <Text label="Copyright" value="Threema GmbH © 2022" />

      <Select label="Theme" bind:value={$theme} options={THEMES} />

      {#if showToggleDebugMode}
        <div class="debug-button">
          <Button
            flavor="filled"
            on:click={() => {
              $debugPanelState = $debugPanelState === 'show' ? 'hide' : 'show';
            }}>Toggle Debug Panel</Button
          >
        </div>
      {/if}
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .profile {
    display: grid;
    align-content: start;
    overflow-y: auto;

    .back {
      padding-left: rem(16px);
      padding-top: rem(12px);
    }

    .public-key {
      margin-left: 16px;

      .label {
        @extend %font-small-400;
        color: var(--t-text-e2-color);
      }
    }

    .debug-button {
      padding: rem(10px) rem(16px) rem(10px) rem(16px);
    }
  }
</style>
