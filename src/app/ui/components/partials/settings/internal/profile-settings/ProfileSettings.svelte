<!--
  @component
  Renders a settings page for user profile settings.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import ProfilePictureModal from '~/app/ui/components/partials/modals/profile-picture-modal/ProfilePictureModal.svelte';
  import {createDropdownItems} from '~/app/ui/components/partials/settings/helpers';
  import {
    getProfilePictureShareWithDropdown,
    getProfilePictureShareWithDropdownLabel,
  } from '~/app/ui/components/partials/settings/internal/profile-settings/helpers';
  import DeleteProfileModal from '~/app/ui/components/partials/settings/internal/profile-settings/internal/delete-profile-modal/DeleteProfileModal.svelte';
  import ProfileInfo from '~/app/ui/components/partials/settings/internal/profile-settings/internal/profile-info/ProfileInfo.svelte';
  import PublicKeyModal from '~/app/ui/components/partials/settings/internal/profile-settings/internal/public-key-modal/PublicKeyModal.svelte';
  import type {ProfileSettingsProps} from '~/app/ui/components/partials/settings/internal/profile-settings/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {reactive} from '~/app/ui/utils/svelte';
  import type {ProfilePictureShareWith} from '~/common/model/settings/profile';
  import type {ProfileSettingsView} from '~/common/model/types/settings';
  import type {IdentityString} from '~/common/network/types';
  import {unreachable} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import type {ProfileViewModelStore} from '~/common/viewmodel/profile';

  const log = globals.unwrap().uiLogging.logger('ui.component.profile-settings');

  type $$Props = ProfileSettingsProps;

  export let services: $$Props['services'];
  export let actions: $$Props['actions'];
  export let settings: $$Props['settings'];

  const {
    backend: {viewModel},
  } = services;

  let profileViewModelStore: Remote<ProfileViewModelStore>;

  let modalState: 'none' | 'profile-picture' | 'public-key' | 'delete-profile' = 'none';
  let profilePictureShareWithItems: ContextMenuItem[];

  viewModel
    .profile()
    .then((loadedProfile) => {
      profileViewModelStore = loadedProfile;
    })
    .catch((error: unknown) => {
      log.error('Loading profile view model failed', error);
    });

  function handleClickProfilePicture(): void {
    modalState = 'profile-picture';
  }

  function handleClickPublicKeyItem(): void {
    modalState = 'public-key';
  }

  function handleCloseModal(): void {
    modalState = 'none';
  }

  function handleClickCopyThreemaId(): void {
    navigator.clipboard
      .writeText($profileViewModelStore.identity)
      .catch(() => log.error('Failed to copy Threema ID to clipboard'));

    toast.addSimpleSuccess(
      $i18n.t('settings--profile.prose--copy-id-content', 'Threema ID copied to clipboard'),
    );
  }

  function handleChangeProfileSettings(): void {
    const currentAllowList: readonly IdentityString[] =
      settings.profilePictureShareWith.group === 'allowList'
        ? settings.profilePictureShareWith.allowList
        : [];

    const dropdown = getProfilePictureShareWithDropdown($i18n, currentAllowList);
    profilePictureShareWithItems = createDropdownItems<
      ProfileSettingsView,
      ProfilePictureShareWith
    >(dropdown, (profilePictureShareWith) => {
      actions.updateSettings({profilePictureShareWith});
    });
  }

  $: reactive(handleChangeProfileSettings, [settings, $i18n]);
</script>

<!-- eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -->
{#if $profileViewModelStore !== undefined}
  <div class="profile">
    <!-- eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -->
    <KeyValueList>
      <KeyValueList.Section
        title={$i18n.t(
          'settings--profile.prose--main-section-title',
          'Nickname, Avatar & Threema ID',
        )}
      >
        <KeyValueList.Item key="">
          <ProfileInfo
            color={$profileViewModelStore.profilePicture.color}
            displayName={$profileViewModelStore.displayName}
            initials={$profileViewModelStore.initials}
            pictureBytes={$profileViewModelStore.profilePicture.picture}
            on:clickprofilepicture={handleClickProfilePicture}
          />
        </KeyValueList.Item>

        {#if import.meta.env.BUILD_FLAVOR === 'work-onprem'}
          <KeyValueList.Item
            key={$i18n.t('settings.label--threema-onprem-username', 'Threema OnPrem Username')}
          >
            <Text text={$profileViewModelStore.workUsername ?? '-'} selectable={true} />
          </KeyValueList.Item>
        {:else if import.meta.env.BUILD_VARIANT === 'work'}
          <KeyValueList.Item
            key={$i18n.t('settings.label--threema-work-username', 'Threema Work Username')}
          >
            <Text text={$profileViewModelStore.workUsername ?? '-'} selectable={true} />
          </KeyValueList.Item>
        {/if}

        <!--Not implemented yet-->
        {#if import.meta.env.DEBUG}
          <KeyValueList.ItemWithDropdown
            options={{disabled: false}}
            key={`🐞 ${$i18n.t(
              'settings--profile.label--profile-picture-visibility',
              'Who can see your profile picture?',
            )}`}
            items={profilePictureShareWithItems}
          >
            <Text
              text={getProfilePictureShareWithDropdownLabel(
                settings.profilePictureShareWith.group,
                $i18n,
              )}
            ></Text>
          </KeyValueList.ItemWithDropdown>
        {/if}
        <KeyValueList.ItemWithButton
          key={$i18n.t('settings--profile.label--threema-id', 'Threema ID')}
          icon="content_copy"
          on:click={handleClickCopyThreemaId}
        >
          <Text text={$profileViewModelStore.identity} />
        </KeyValueList.ItemWithButton>

        <KeyValueList.ItemWithButton
          key=""
          icon="chevron_right"
          on:click={handleClickPublicKeyItem}
        >
          <Text text={$i18n.t('settings--profile.label--public-key', 'Public Key')}></Text>
        </KeyValueList.ItemWithButton>
      </KeyValueList.Section>
      <KeyValueList.Section title="">
        <KeyValueList.ItemWithButton
          icon={'delete_forever'}
          key=""
          on:click={() => (modalState = 'delete-profile')}
        >
          <Text text={$i18n.t('settings--profile.label--delete-profile', 'Remove ID and Data')} />
        </KeyValueList.ItemWithButton>
      </KeyValueList.Section>
    </KeyValueList>
  </div>
{/if}

{#if modalState === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState === 'profile-picture'}
  <ProfilePictureModal
    alt={$i18n.t('settings.hint--own-profile-picture', 'My profile picture')}
    color={$profileViewModelStore.profilePicture.color}
    initials={$profileViewModelStore.initials}
    pictureBytes={$profileViewModelStore.profilePicture.picture}
    on:close={handleCloseModal}
  />
{:else if modalState === 'public-key'}
  <PublicKeyModal publicKey={$profileViewModelStore.publicKey} on:close={handleCloseModal} />
{:else if modalState === 'delete-profile'}
  <DeleteProfileModal {services} on:close={handleCloseModal} />
{:else}
  {unreachable(modalState)}
{/if}
