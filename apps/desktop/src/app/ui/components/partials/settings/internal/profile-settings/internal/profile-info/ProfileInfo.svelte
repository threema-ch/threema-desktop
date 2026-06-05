<!--
  @component Renders details about the user's own profile.
-->
<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import EditPictureModal from '~/app/ui/components/partials/modals/edit-picture-modal/EditPictureModal.svelte';
  import type {ProfileInfoProps} from '~/app/ui/components/partials/settings/internal/profile-settings/internal/profile-info/props';
  import type {ModalState} from '~/app/ui/components/partials/settings/internal/profile-settings/types';
  import {i18n} from '~/app/ui/i18n';
  import UserProfilePicture from '~/app/ui/svelte-components/threema/ProfilePicture/ProfilePicture.svelte';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import {unreachable} from '~/common/utils/assert';

  const {
    color,
    displayName,
    initials,
    pictureBytes,
    onclickprofilepicture,
    updateProfilePicture,
  }: ProfileInfoProps = $props();

  let modalState = $state<ModalState>({type: 'none'});
</script>

<div class="profile-info">
  <button class="profile-picture" onclick={onclickprofilepicture}>
    <UserProfilePicture
      alt={$i18n.t('settings.hint--own-profile-picture', 'My profile picture')}
      {color}
      {initials}
      img={transformProfilePicture(pictureBytes)}
      shape="circle"
    />
  </button>

  <div class="nickname">
    <div class="label">{$i18n.t('settings.label--nickname', 'Nickname')}</div>
    <div class="value">{displayName}</div>
  </div>

  <!-- 
    As long as we don't support MDM params, we disable profile picture edit for work and onprem
  -->
  {#if import.meta.env.BUILD_VARIANT === 'consumer' || import.meta.env.BUILD_ENVIRONMENT === 'sandbox'}
    <button
      class="edit"
      onclick={() => {
        modalState = {
          type: 'picture',
          props: {
            title: $i18n.t('dialog--edit-profile-picture.label--title', 'Edit Profile Photo'),
            blob: transformProfilePicture(pictureBytes),
            color,
            placeholder: {type: 'initials', initials},
            onsubmit: async (img) => {
              await updateProfilePicture(img);
            },
            onclose: () => {
              modalState = {type: 'none'};
            },
          },
        };
      }}
    >
      <Text
        color="inherit"
        family="secondary"
        size="body-small"
        text={$i18n.t('common.action--edit', 'Edit')}
      />
    </button>
  {/if}

  {#if modalState.type === 'none'}
    <!-- No modal is displayed in this state. -->
  {:else if modalState.type === 'picture'}
    <EditPictureModal {...modalState.props}></EditPictureModal>
  {:else}
    {unreachable(modalState)}
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .profile-info {
    display: grid;
    grid-template-columns: fit-content(50%) 1fr;
    align-items: center;
    justify-items: start;
    column-gap: rem(16px);

    .profile-picture {
      @extend %neutral-input;
      --c-profile-picture-size: #{rem(60px)};
      cursor: pointer;
    }

    .nickname {
      display: flex;
      flex-direction: column;

      .label {
        @extend %font-small-400;
        color: var(--t-text-e2-color);
      }

      .value {
        user-select: all;
      }
    }

    .edit {
      @extend %neutral-input;
      justify-self: center;
      color: var(--t-color-primary);
      cursor: pointer;
    }
  }
</style>
