<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import ProfilePictureModal from '~/app/ui/components/partials/modals/profile-picture-modal/ProfilePictureModal.svelte';
  import ProfileInfo from '~/app/ui/components/partials/profile-info/ProfileInfo.svelte';
  import {createDropdownItems} from '~/app/ui/components/partials/settings/helpers';
  import {
    profilePictureShareWithDropdown,
    profilePictureSharedWithLabel,
  } from '~/app/ui/components/partials/settings/internal/profile-settings/helpers';
  import PublicKeyModal from '~/app/ui/components/partials/settings/internal/profile-settings/internal/public-key-modal/PublicKeyModal.svelte';
  import type {ProfileSettingsProps} from '~/app/ui/components/partials/settings/internal/profile-settings/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import type {ContextMenuItem} from '~/app/ui/utils/context-menu/types';
  import type {ProfilePictureShareWith} from '~/common/model/settings/profile';
  import type {ProfileSettings, ProfileSettingsView} from '~/common/model/types/settings';
  import type {RemoteModelStore} from '~/common/model/utils/model-store';
  import type {IdentityString} from '~/common/network/types';
  import type {Remote} from '~/common/utils/endpoint';
  import type {ProfileViewModelStore} from '~/common/viewmodel/profile';

  const log = globals.unwrap().uiLogging.logger('ui.component.profile-settings');

  type $$Props = ProfileSettingsProps;
  export let services: $$Props['services'];
  const {
    backend: {viewModel, model},
  } = services;

  let profile: Remote<ProfileViewModelStore>;
  let profileSettings: RemoteModelStore<ProfileSettings> | undefined;

  let publicKeyModalOpen: boolean = false;
  function handleClosePublicKeyModal(): void {
    publicKeyModalOpen = false;
  }

  viewModel
    .profile()
    .then((loadedProfile) => {
      profile = loadedProfile;
    })
    .catch((error) => {
      log.error('Loading profile view model failed', error);
    });

  model.user.profileSettings
    .then((settings) => (profileSettings = settings))
    .catch(() => log.error('Failed to load profile settings model'));

  let profilePictureSharedWithItems: ContextMenuItem[];
  $: if ($profileSettings !== undefined) {
    const sharedArray: Readonly<IdentityString[]> =
      $profileSettings.view.profilePictureShareWith.group === 'allowList'
        ? $profileSettings.view.profilePictureShareWith.allowList
        : [];

    const dropdown = profilePictureShareWithDropdown($i18n, sharedArray);
    profilePictureSharedWithItems = createDropdownItems<
      ProfileSettingsView,
      keyof ProfileSettingsView,
      ProfilePictureShareWith
    >(dropdown, localChange);
  }

  let isProfilePictureModalVisible = false;
  function handleClickProfilePicture(): void {
    isProfilePictureModalVisible = true;
  }
  function handleCloseProfilePictureModal(): void {
    isProfilePictureModalVisible = false;
  }
  function localChange<N extends keyof ProfileSettingsView>(
    newValue: ProfileSettingsView[N],
    changeName: N,
  ): void {
    profileSettings
      ?.get()
      .controller.update({[changeName]: newValue})
      .catch(() => log.error(`Failed to update settings: ${changeName}`));
  }

  function copyToClipboard(textToCopy: string): void {
    navigator.clipboard
      .writeText(textToCopy)
      .catch(() => log.error('Failed to copy ID to clipboard'));
    toast.addSimpleSuccess(
      $i18n.t(
        'settings--profile-settings.prose--copy-id-content',
        'Threema ID copied to clipboard',
      ),
    );
  }
</script>

<template>
  <div class="profile">
    <!-- eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -->
    {#if profile !== undefined}
      <KeyValueList>
        <KeyValueList.Section
          title={$i18n.t(
            'settings--profile-settings.prose--main-section-title',
            'Nickname, Avatar & Threema ID',
          )}
        >
          <KeyValueList.Item key="">
            <ProfileInfo
              color={$profile.profilePicture.color}
              displayName={$profile.displayName}
              initials={$profile.initials}
              pictureBytes={$profile.profilePicture.picture}
              on:clickprofilepicture={handleClickProfilePicture}
            />
          </KeyValueList.Item>
          {#if import.meta.env.BUILD_VARIANT === 'work'}
            <KeyValueList.Item
              key={$i18n.t('settings.label--threema-work-username', 'Threema Work Username')}
            >
              <Text text={$profile.workUsername ?? '-'} />
            </KeyValueList.Item>
          {/if}
          {#if $profileSettings !== undefined}
            <!--Not implemented yet-->
            {#if import.meta.env.DEBUG}
              <KeyValueList.ItemWithDropdown
                options={{disabled: false}}
                key={`🐞 ${$i18n.t(
                  'settings--profile-settings.label--profile-picture-visibility',
                  'Who can see your profile picture?',
                )}`}
                items={profilePictureSharedWithItems}
              >
                <Text
                  text={profilePictureSharedWithLabel(
                    $profileSettings.view.profilePictureShareWith.group,
                    $i18n,
                  )}
                ></Text>
              </KeyValueList.ItemWithDropdown>
            {/if}
          {/if}
          <KeyValueList.ItemWithButton
            key={$i18n.t('settings.profile-settings.label--threema-id', 'Threema ID')}
            icon="content_copy"
            on:click={() => copyToClipboard($profile.identity)}
          >
            <Text text={$profile.identity} />
          </KeyValueList.ItemWithButton>

          <KeyValueList.ItemWithButton
            key=""
            icon="chevron_right"
            on:click={() => (publicKeyModalOpen = true)}
          >
            <Text text={$i18n.t('settings--profile-settings.label--public-key', 'Public Key')}
            ></Text>
          </KeyValueList.ItemWithButton>
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
  {#if publicKeyModalOpen}
    <PublicKeyModal publicKey={$profile.publicKey} on:close={handleClosePublicKeyModal}
    ></PublicKeyModal>
  {/if}
</template>
