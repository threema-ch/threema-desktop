<script lang="ts">
  import {onMount} from 'svelte';

  import TextInput from '#3sc/components/blocks/Input/Text.svelte';
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import AvatarEdit from '~/app/components/avatar/AvatarEdit.svelte';
  import HiddenSubmit from '~/app/components/form/HiddenSubmit.svelte';
  import {getAvatarAndMemberStores} from '~/app/components/group';
  import Wrapper from '~/app/components/modal-dialog/Wrapper.svelte';
  import {assertRoute} from '~/app/routing';
  import {type AppServices} from '~/app/types';
  import {type Avatar, type Group} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';

  export let services: AppServices;

  /**
   * Maximum byte length of a group name
   */
  const GROUP_NAME_MAX_LENGTH = 256;

  const {router, backend} = services;
  const route = assertRoute('modal', $router.modal, ['groupEdit']);
  const groupUid = route.params.groupUid;

  let group: RemoteModelStore<Group> | undefined;
  let avatar: RemoteModelStore<Avatar> | undefined;
  let name = '';
  let inputName: TextInput;

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
    const stores = await getAvatarAndMemberStores(group, contacts);
    avatar = stores.avatar;
  }

  async function saveGroupDetails(): Promise<void> {
    if ($group !== undefined) {
      await $group.controller.name.fromLocal(name);
    }
    closeModal();
  }

  // Autofocus on name input field
  $: if (inputName !== undefined && inputName !== null) {
    inputName.focus();
  }

  // Validate byte length of group name
  const encoder = new TextEncoder();
  let inputNameError: string | undefined = undefined;
  $: inputNameError = ((): string | undefined => {
    const byteLength = encoder.encode(name.trim()).byteLength;
    if (byteLength === 0) {
      return 'Should not be empty';
    }
    if (byteLength > GROUP_NAME_MAX_LENGTH) {
      return 'Name is too long';
    }
    return undefined;
  })();

  onMount(async () => {
    await loadGroupOrCloseModal();
  });
</script>

<template>
  {#if $group !== undefined && avatar !== undefined}
    <Wrapper>
      <ModalDialog
        visible={true}
        on:confirm={saveGroupDetails}
        on:close={closeModal}
        on:cancel={closeModal}
      >
        <Title slot="header" title="Edit Name" />
        <form
          class="body"
          slot="body"
          on:submit|preventDefault={() => {
            void saveGroupDetails();
          }}
        >
          <HiddenSubmit />
          <div class="avatar">
            <AvatarEdit {avatar} {name} />
          </div>
          <TextInput
            bind:this={inputName}
            error={inputNameError}
            bind:value={name}
            label="Group Name"
          />
        </form>
        <CancelAndConfirm
          confirmDisabled={inputNameError !== undefined}
          slot="footer"
          let:modal
          {modal}
        />
      </ModalDialog>
    </Wrapper>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    @extend %font-normal-400;

    padding: rem(16px);
    display: grid;
    grid-template:
      'avatar' auto
      'name' auto
      / minmax(min-content, #{rem(480px)});
    row-gap: rem(32px);

    .avatar {
      justify-self: center;
    }
  }
</style>
