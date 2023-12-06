<script lang="ts">
  import IconButton from 'threema-svelte-components/src/components/blocks/Button/IconButton.svelte';
  import MdIcon from 'threema-svelte-components/src/components/blocks/Icon/MdIcon.svelte';
  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import ProfilePictureModal from '~/app/ui/components/partials/modals/profile-picture-modal/ProfilePictureModal.svelte';
  import type {ProfileSettingsProps} from '~/app/ui/components/partials/settings/internal/profile-settings/props';
  import {i18n} from '~/app/ui/i18n';
  import {publicKeyGrid} from '~/common/dom/ui/fingerprint';
  import {display} from '~/common/dom/ui/state';
  import type {Remote} from '~/common/utils/endpoint';
  import type {ProfileViewModelStore} from '~/common/viewmodel/profile';

  const log = globals.unwrap().uiLogging.logger('ui.component.settings');

  type $$Props = ProfileSettingsProps;
  export let services: $$Props['services'];
  const {
    backend: {viewModel},
    router,
  } = services;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let profile: Remote<ProfileViewModelStore>;

  viewModel
    .profile()
    .then((loadedProfile) => {
      profile = loadedProfile;
    })
    .catch((error) => {
      log.error('Loading profile view model failed', error);
    });

  let isProfilePictureModalVisible = false;
  function handleClickProfilePicture(): void {
    isProfilePictureModalVisible = true;
  }
  function handleCloseProfilePictureModal(): void {
    isProfilePictureModalVisible = false;
  }

  function handleClickBack(): void {
    router.replaceMain(ROUTE_DEFINITIONS.main.welcome.withoutParams());
  }
</script>

<template>
  <div class="profile">
    <!-- eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -->
    {#if profile !== undefined}
      {#if $display === 'small'}
        <div class="back">
          <IconButton flavor="naked" on:click={handleClickBack}>
            <MdIcon theme="Outlined">arrow_back</MdIcon>
          </IconButton>
        </div>
      {/if}

      <ProfileInfo
        color={$profile.profilePicture.color}
        displayName={$profile.displayName}
        initials={$profile.initials}
        pictureBytes={$profile.profilePicture.picture}
        on:clickprofilepicture={handleClickProfilePicture}
      />

      <KeyValueList>
        <KeyValueList.Section>
          <KeyValueList.Item key={$i18n.t('settings.label--threema-id', 'Threema ID')}>
            <Text text={$profile.identity} />
          </KeyValueList.Item>

          <KeyValueList.Item key={$i18n.t('settings.label--public-key', 'Public Key')}>
            <pre><code>{publicKeyGrid($profile.publicKey)}</code></pre>
          </KeyValueList.Item>
        </KeyValueList.Section>
      </KeyValueList>
    {/if}

    {#if isProfilePictureModalVisible}
      <ProfilePictureModal
        alt={$i18n.t('settings.hint--own-profile-picture', 'My profile picture')}
        color={$profile.profilePicture.color}
        initials={$profile.initials}
        pictureBytes={$profile.profilePicture.picture}
        on:close={handleCloseProfilePictureModal}
      />
    {/if}
  </div>
</template>
