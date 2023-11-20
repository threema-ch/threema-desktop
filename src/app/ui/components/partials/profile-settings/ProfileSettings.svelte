<!--
  @component
  Renders details and settings related to the user's profile.
-->
<script lang="ts">
  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Switch from '#3sc/components/blocks/Switch/Switch.svelte';
  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import ProfilePictureModal from '~/app/ui/components/partials/modals/profile-picture-modal/ProfilePictureModal.svelte';
  import ProfileInfo from '~/app/ui/components/partials/profile-settings/internal/profile-info/ProfileInfo.svelte';
  import type {ProfileSettingsProps} from '~/app/ui/components/partials/profile-settings/props';
  import {i18n, LOCALE_NAMES, LOCALES} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {publicKeyGrid} from '~/common/dom/ui/fingerprint';
  import {display} from '~/common/dom/ui/state';
  import {THEMES} from '~/common/dom/ui/theme';
  import type {u53} from '~/common/types';
  import type {Remote} from '~/common/utils/endpoint';
  import type {ProfileViewModelStore} from '~/common/viewmodel/profile';

  const log = globals.unwrap().uiLogging.logger('ui.component.profile-settings');

  type $$Props = ProfileSettingsProps;

  export let services: $$Props['services'];

  const {
    backend: {viewModel},
    router,
    storage: {debugPanelState, theme, locale, is24hTime},
  } = services;

  // TODO(DESK-800): This type is incorrect, it's actually ` | undefined`. To prevent this, the
  // remote store must be passed into this component once loaded, not before.
  let profile: Remote<ProfileViewModelStore>;
  viewModel
    .profile()
    .then((loadedProfile) => {
      profile = loadedProfile;
    })
    .catch((error) => {
      log.error('Loading profile view model failed', error);
    });

  let showToggleDebugMode = false;
  let versionClickedCount = 0;
  let versionClickedTimeoutHandler: u53;
  let isProfilePictureModalVisible = false;

  function handleClickBack(): void {
    router.replaceMain(ROUTE_DEFINITIONS.main.welcome.withoutParams());
  }

  function handleClickProfilePicture(): void {
    isProfilePictureModalVisible = true;
  }

  function handleClickVersion(): void {
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

  function handleClickChangePassword(): void {
    router.replaceModal(ROUTE_DEFINITIONS.modal.changePassword.withoutParams());
  }

  function handleCloseProfilePictureModal(): void {
    isProfilePictureModalVisible = false;
  }

  $: if ($debugPanelState === 'show') {
    showToggleDebugMode = true;
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

          {#if import.meta.env.BUILD_VARIANT === 'work'}
            <KeyValueList.Item
              key={$i18n.t('settings.label--threema-work-username', 'Threema Work Username')}
            >
              <Text text={$profile.workUsername ?? '-'} />
            </KeyValueList.Item>
          {/if}
        </KeyValueList.Section>

        <KeyValueList.Section>
          <KeyValueList.Item key={$i18n.t('settings.label--application-name', 'Application Name')}>
            <Text text={import.meta.env.APP_NAME} />
          </KeyValueList.Item>

          <KeyValueList.Item
            key={$i18n.t('settings.label--application-version', 'Application Version')}
          >
            <!-- A11y is currently not important here, as this is a developer-only feature. -->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div on:click={handleClickVersion}>
              <Text text={import.meta.env.BUILD_VERSION} />
            </div>
          </KeyValueList.Item>

          {#if `v${import.meta.env.BUILD_VERSION}` !== import.meta.env.GIT_REVISION && import.meta.env.GIT_REVISION !== ''}
            <KeyValueList.Item key={$i18n.t('settings.label--git-revision', 'Git Revision')}>
              <Text text={import.meta.env.GIT_REVISION} />
            </KeyValueList.Item>
          {/if}

          <KeyValueList.Item key={$i18n.t('settings.label--copyright', 'Copyright')}>
            <Text text={'Threema GmbH © 2020-2023'} />
          </KeyValueList.Item>
        </KeyValueList.Section>

        <KeyValueList.Section>
          <KeyValueList.Item key={$i18n.t('settings.label--theme', 'Theme')}>
            <select bind:value={$theme}>
              {#each THEMES as themeKey}
                <option value={themeKey}>
                  {themeKey}
                </option>
              {/each}
            </select>
          </KeyValueList.Item>

          <KeyValueList.Item key={$i18n.t('settings.label--language', 'Language')}>
            <select bind:value={$locale}>
              {#each LOCALES as localeKey}
                <option value={localeKey}>
                  {LOCALE_NAMES[localeKey]}
                </option>
              {/each}
            </select>
          </KeyValueList.Item>

          <KeyValueList.Item key={$i18n.t('settings.label--24-hour-time', '24-Hour Time')}>
            <Switch bind:checked={$is24hTime} />
          </KeyValueList.Item>
        </KeyValueList.Section>
      </KeyValueList>

      <div class="button">
        <Button flavor="filled" on:click={handleClickChangePassword}
          >{$i18n.t('dialog--change-password.label--title', 'Change Password')}</Button
        >
      </div>

      {#if showToggleDebugMode}
        <div class="button">
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

  {#if isProfilePictureModalVisible}
    <ProfilePictureModal
      alt={$i18n.t('settings.hint--own-profile-picture', 'My profile picture')}
      color={$profile.profilePicture.color}
      initials={$profile.initials}
      pictureBytes={$profile.profilePicture.picture}
      on:close={handleCloseProfilePictureModal}
    />
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .profile {
    display: flex;
    flex-direction: column;
    overflow-y: auto;

    .back {
      padding-left: rem(16px);
      padding-top: rem(12px);
    }

    select {
      background-color: transparent;
      color: var(--t-text-e1-color);
      option {
        // Chromium does not allow styling the dropdown menu background color. The text color is
        // applied only on some systems (e.g. Linux, but not macOS). We reset the text color to
        // ensure that the text remains readable even if the background color wasn't styled.
        color: initial;
      }
      text-transform: capitalize;
      user-select: none;
    }

    .button {
      padding: rem(10px) rem(16px) rem(10px) rem(16px);
    }
  }
</style>
