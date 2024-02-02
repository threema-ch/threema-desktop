<script lang="ts">
  import {onMount} from 'svelte';

  import {assertRoute} from '~/app/routing';
  import type {AppServices} from '~/app/types';
  import {getProfilePictureAndMemberStores} from '~/app/ui/aside/group-details';
  import HiddenSubmit from '~/app/ui/generic/form/HiddenSubmit.svelte';
  import ProfilePictureEdit from '~/app/ui/generic/profile-picture/ProfilePictureEdit.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import TextInput from '~/app/ui/svelte-components/blocks/Input/Text.svelte';
  import CancelAndConfirm from '~/app/ui/svelte-components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import type {Group, ProfilePicture} from '~/common/model';
  import type {RemoteModelStore} from '~/common/model/utils/model-store';

  export let services: AppServices;

  /**
   * Maximum byte length of a group name
   */
  const GROUP_NAME_MAX_LENGTH = 256;

  const {router, backend} = services;
  const route = assertRoute('modal', $router.modal, ['groupEdit']);
  const groupUid = route.params.groupUid;

  let group: RemoteModelStore<Group> | undefined;
  let profilePicture: RemoteModelStore<ProfilePicture> | undefined;
  let name = '';
  let inputName: TextInput | null | undefined;

  function closeModal(): void {
    router.closeModal();
  }

  async function loadGroupOrCloseModal(): Promise<void> {
    group = await backend.model.groups.getByUid(groupUid);
    if (group === undefined || $group === undefined) {
      closeModal();
      return;
    }

    name = $group.view.name;

    const contacts = await backend.model.contacts.getAll();
    const stores = await getProfilePictureAndMemberStores(group, contacts);
    profilePicture = stores.profilePicture;
  }

  async function saveGroupDetails(): Promise<void> {
    if ($group !== undefined) {
      await $group.controller.name.fromLocal(name);
    }
    closeModal();
  }

  // Autofocus on name input field
  $: inputName?.focus();

  // Validate byte length of group name
  const encoder = new TextEncoder();
  let inputNameError: string | undefined = undefined;
  $: inputNameError = ((): string | undefined => {
    const byteLength = encoder.encode(name.trim()).byteLength;
    if (byteLength === 0) {
      return $i18n.t('dialog--edit-group.error--group-name-empty', 'Should not be empty');
    }
    if (byteLength > GROUP_NAME_MAX_LENGTH) {
      return $i18n.t('dialog--edit-group.error--group-name-too-long', 'Name is too long');
    }
    return undefined;
  })();

  onMount(async () => {
    await loadGroupOrCloseModal();
  });
</script>

<template>
  {#if $group !== undefined && profilePicture !== undefined}
    <ModalWrapper visible={true}>
      <ModalDialog
        visible={true}
        on:confirm={saveGroupDetails}
        on:close={closeModal}
        on:cancel={closeModal}
      >
        <Title
          slot="header"
          title={$i18n.t('dialog--edit-group.label--title', 'Edit {name}', {name})}
        />
        <form
          class="body"
          slot="body"
          on:submit|preventDefault={() => {
            void saveGroupDetails();
          }}
        >
          <HiddenSubmit />
          <div class="profile-picture">
            <ProfilePictureEdit {profilePicture} {name} />
          </div>
          <TextInput
            bind:this={inputName}
            error={inputNameError}
            bind:value={name}
            label={$i18n.t('dialog--edit-group.label--group-name', 'Group Name')}
          />
        </form>
        <CancelAndConfirm
          slot="footer"
          cancelText={$i18n.t('dialog--edit-group.action--cancel', 'Cancel')}
          confirmText={$i18n.t('dialog--edit-group.action--confirm', 'OK')}
          buttonsState={inputNameError !== undefined ? 'confirmDisabled' : 'default'}
          let:modal
          {modal}
        />
      </ModalDialog>
    </ModalWrapper>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    @extend %font-normal-400;

    padding: rem(16px);
    display: grid;
    grid-template:
      'profile-picture' auto
      'name' auto
      / minmax(min-content, #{rem(480px)});
    row-gap: rem(32px);

    .profile-picture {
      justify-self: center;
    }
  }
</style>
