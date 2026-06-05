<!--
  @component Renders a settings page for user profile settings.
-->
<script lang="ts">
  import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';

  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import ProfilePictureModal from '~/app/ui/components/partials/modals/profile-picture-modal/ProfilePictureModal.svelte';
  import SetAvailabilityStatusModal from '~/app/ui/components/partials/modals/set-availability-status-modal/SetAvailabilityStatusModal.svelte';
  import {getProfilePictureShareWithLabel} from '~/app/ui/components/partials/settings/internal/profile-settings/helpers';
  import DeleteProfileModal from '~/app/ui/components/partials/settings/internal/profile-settings/internal/delete-profile-modal/DeleteProfileModal.svelte';
  import ProfileInfo from '~/app/ui/components/partials/settings/internal/profile-settings/internal/profile-info/ProfileInfo.svelte';
  import PublicKeyModal from '~/app/ui/components/partials/settings/internal/profile-settings/internal/public-key-modal/PublicKeyModal.svelte';
  import type {ProfileSettingsProps} from '~/app/ui/components/partials/settings/internal/profile-settings/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {mapToLabel} from '~/app/ui/utils/availability-status';
  import {svelteUnreachable} from '~/app/ui/utils/svelte';
  import {getAndParseMdm} from '~/common/mdm';
  import type {WorkAvailabilityStatus} from '~/common/model/types/work-availability-status';
  import {mapToColor, mapToIcon} from '~/common/utils/availability-status';
  import type {Remote} from '~/common/utils/endpoint';
  import type {ProfileViewModelStore} from '~/common/viewmodel/profile';

  const log = globals.unwrap().uiLogging.logger('ui.component.profile-settings');

  const {actions, services, settings}: ProfileSettingsProps = $props();

  const {
    backend: {viewModel},
  } = services;

  let profileViewModelStore = $state<Remote<ProfileViewModelStore> | undefined>(undefined);

  let modalState = $state<
    'none' | 'profile-picture' | 'public-key' | 'delete-profile' | 'set-availability-status'
  >('none');

  viewModel
    .profile()
    .then((loadedProfile) => {
      profileViewModelStore = loadedProfile;
    })
    .catch((error: unknown) => {
      log.error('Loading profile view model failed', error);
    });

  const workSettingsViewStore = $derived(services.settings.views.work);
  const isRemoteSecretEnabled = $derived.by(() => {
    try {
      return getAndParseMdm(
        $workSettingsViewStore.threemaMdmParameters,
        'th_enable_remote_secret',
        log,
      );
    } catch {
      return undefined;
    }
  });

  function handleClickProfilePicture(): void {
    modalState = 'profile-picture';
  }

  function handleClickPublicKeyItem(): void {
    modalState = 'public-key';
  }

  function handleClickSetAvailabilityStatusItem(): void {
    modalState = 'set-availability-status';
  }

  function handleCloseModal(): void {
    modalState = 'none';
  }

  function handleClickCopyThreemaId(): void {
    if ($profileViewModelStore?.identity === undefined) {
      return;
    }

    navigator.clipboard
      .writeText($profileViewModelStore.identity)
      .catch(() => log.error('Failed to copy Threema ID to clipboard'));

    toast.addSimpleSuccess(
      $i18n.t('settings--profile.prose--copy-id-content', '{shortAppName} ID copied to clipboard', {
        shortAppName: import.meta.env.SHORT_APP_NAME,
      }),
    );
  }

  async function handleChangeProfilePicture(blob: Blob | undefined): Promise<void> {
    const profilePicture =
      blob !== undefined
        ? (new Uint8Array(await blob.arrayBuffer()) as ReadonlyUint8Array)
        : undefined;

    await actions.updateProfilePicture(profilePicture);
  }

  async function handleSetAvailabilityStatus(
    workAvailabilityStatus: WorkAvailabilityStatus,
  ): Promise<void> {
    await actions.updateWorkAvailabilityStatus(workAvailabilityStatus);
  }
</script>

{#if $profileViewModelStore !== undefined}
  <div class="profile">
    <KeyValueList>
      <KeyValueList.Section
        title={$i18n.t(
          'settings--profile.prose--main-section-title',
          'Nickname, Avatar & {shortAppName} ID',
          {
            shortAppName: import.meta.env.SHORT_APP_NAME,
          },
        )}
      >
        <KeyValueList.Item key="">
          <ProfileInfo
            color={$profileViewModelStore.profilePicture.color}
            displayName={$profileViewModelStore.displayName}
            initials={$profileViewModelStore.initials}
            onclickprofilepicture={handleClickProfilePicture}
            pictureBytes={$profileViewModelStore.profilePicture.picture}
            updateProfilePicture={handleChangeProfilePicture}
          />
        </KeyValueList.Item>

        {#if import.meta.env.BUILD_FLAVOR === 'work-sandbox' || import.meta.env.BUILD_FLAVOR === 'work-live'}
          <KeyValueList.ItemWithButton
            icon="edit"
            key={$i18n.t('settings--profile.label--set-availability-status', 'Set Status')}
            onclick={handleClickSetAvailabilityStatusItem}
          >
            <div class="container">
              <div
                class="icon"
                style:--c-availability-status-icon-color={mapToColor(
                  $profileViewModelStore.workAvailabilityStatus.category,
                )}
              >
                <MdIcon theme="Filled"
                  >{mapToIcon($profileViewModelStore.workAvailabilityStatus.category)}</MdIcon
                >
              </div>

              <div class="content">
                <Text
                  text={mapToLabel(
                    $profileViewModelStore.workAvailabilityStatus.category,
                    $profileViewModelStore.workAvailabilityStatus.description,
                    $i18n,
                  )}
                />
              </div>
            </div>
          </KeyValueList.ItemWithButton>
        {/if}

        <KeyValueList.ItemWithHint
          key={$i18n.t(
            'settings--profile.label--profile-picture-visibility',
            'Who can see your profile picture?',
          )}
          hint={$i18n.t(
            'settings--profile.hint--profile-picture-visibility',
            'You can change this setting in the mobile app in the “Profile” tab.',
          )}
          icon="info"
        >
          <Text
            text={getProfilePictureShareWithLabel(settings.profilePictureShareWith.group, $i18n)}
          ></Text>
        </KeyValueList.ItemWithHint>

        {#if import.meta.env.BUILD_FLAVOR === 'work-onprem'}
          <KeyValueList.Item
            key={$i18n.t('settings.label--threema-onprem-username', '{fullAppName} Username', {
              fullAppName: import.meta.env.APP_NAME,
            })}
          >
            <Text text={$profileViewModelStore.workUsername ?? '-'} selectable={true} />
          </KeyValueList.Item>
        {:else if import.meta.env.BUILD_VARIANT === 'work' || import.meta.env.BUILD_VARIANT === 'custom'}
          <KeyValueList.Item
            key={$i18n.t('settings.label--threema-work-username', '{fullAppName} Username', {
              fullAppName: import.meta.env.APP_NAME,
            })}
          >
            <Text text={$profileViewModelStore.workUsername ?? '-'} selectable={true} />
          </KeyValueList.Item>
        {/if}

        <KeyValueList.ItemWithButton
          icon="content_copy"
          key={$i18n.t('settings--profile.label--threema-id', '{shortAppName} ID', {
            shortAppName: import.meta.env.SHORT_APP_NAME,
          })}
          onclick={handleClickCopyThreemaId}
        >
          <Text text={$profileViewModelStore.identity} />
        </KeyValueList.ItemWithButton>

        {#if isRemoteSecretEnabled === true}
          <KeyValueList.Item key={$i18n.t('settings--pofile.label--remote-secret', 'DualLock')}>
            <Text text={$i18n.t('settings.label--activated', 'Activated')} />
          </KeyValueList.Item>
        {/if}

        <KeyValueList.ItemWithButton icon="chevron_right" key="" onclick={handleClickPublicKeyItem}>
          <Text text={$i18n.t('settings--profile.label--public-key', 'Public Key')}></Text>
        </KeyValueList.ItemWithButton>
      </KeyValueList.Section>
      <KeyValueList.Section title="">
        <KeyValueList.ItemWithButton
          icon="delete_forever"
          key=""
          onclick={() => (modalState = 'delete-profile')}
        >
          <Text
            text={$i18n.t(
              'settings--profile.label--delete-profile',
              'Remove {shortAppName} ID and Data',
              {
                shortAppName: import.meta.env.SHORT_APP_NAME,
              },
            )}
          />
        </KeyValueList.ItemWithButton>
      </KeyValueList.Section>
    </KeyValueList>
  </div>

  {#if modalState === 'none'}
    <!-- No modal is displayed in this state. -->
  {:else if modalState === 'profile-picture'}
    <ProfilePictureModal
      alt={$i18n.t('settings.hint--own-profile-picture', 'My profile picture')}
      color={$profileViewModelStore.profilePicture.color}
      initials={$profileViewModelStore.initials}
      onclose={handleCloseModal}
      pictureBytes={$profileViewModelStore.profilePicture.picture}
    />
  {:else if modalState === 'public-key'}
    <PublicKeyModal onclose={handleCloseModal} publicKey={$profileViewModelStore.publicKey} />
  {:else if modalState === 'delete-profile'}
    <DeleteProfileModal onclose={handleCloseModal} {services} />
  {:else if modalState === 'set-availability-status'}
    <SetAvailabilityStatusModal
      onclose={handleCloseModal}
      onsubmit={handleSetAvailabilityStatus}
      workAvailabilityStatus={$profileViewModelStore.workAvailabilityStatus}
    />
  {:else}
    {svelteUnreachable(modalState)}
  {/if}
{/if}

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--c-availability-status-icon-color);

  .container {
    @extend %neutral-input;
    display: flex;
    align-items: flex-start;
    gap: rem(8px);

    .icon {
      display: inline-block;
      font-size: large;
      line-height: 1;
      vertical-align: top;
      transform: translateY(0.1em);
      color: var($-temp-vars, --c-availability-status-icon-color);
    }

    .content {
      display: flex;
      align-items: start;
      justify-content: start;
    }
  }
</style>
