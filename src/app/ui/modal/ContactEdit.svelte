<script lang="ts">
  import {onMount} from 'svelte';

  import TextInput from '#3sc/components/blocks/Input/Text.svelte';
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import AvatarEdit from '~/app/components/avatar/AvatarEdit.svelte';
  import {getStores} from '~/app/components/contact';
  import HiddenSubmit from '~/app/components/form/HiddenSubmit.svelte';
  import Wrapper from '~/app/components/modal-dialog/Wrapper.svelte';
  import {assertRoute} from '~/app/routing';
  import {type AppServices} from '~/app/types';
  import {type Avatar, type Contact} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';

  export let services: AppServices;

  const {router, backend} = services;
  const route = assertRoute('modal', $router.modal, ['contactEdit']);
  const contactUid = route.params.contactUid;

  let contact: RemoteModelStore<Contact> | undefined;
  let avatar: RemoteModelStore<Avatar> | undefined;
  let firstName = '';
  let lastName = '';
  let displayName = '';
  let inputFirstName: TextInput;

  function closeModal(): void {
    router.closeModal();
  }

  function loadContactOrCloseModal(): void {
    backend.model.contacts
      .getByUid(contactUid)
      .then((maybeContact) => {
        if (maybeContact === undefined) {
          closeModal();
          return;
        }

        contact = maybeContact;

        if ($contact === undefined) {
          closeModal();
          return;
        }

        firstName = $contact.view.firstName;
        lastName = $contact.view.lastName;
        displayName = $contact.view.displayName;

        getStores($contact)
          .then((stores) => {
            avatar = stores.avatar;
          })
          .catch(closeModal);
      })
      .catch(closeModal);
  }

  async function saveContactDetails(): Promise<void> {
    if ($contact !== undefined) {
      await $contact.controller.update.fromLocal({
        firstName,
        lastName,
      });
    }
    closeModal();
  }

  $: if (inputFirstName !== undefined && inputFirstName !== null) {
    inputFirstName.focus();
  }

  onMount(loadContactOrCloseModal);
</script>

<template>
  {#if $contact !== undefined && avatar !== undefined}
    <Wrapper>
      <ModalDialog
        visible={true}
        on:confirm={saveContactDetails}
        on:close={closeModal}
        on:cancel={closeModal}
      >
        <Title slot="header" title="Edit Name" />
        <form
          class="body"
          slot="body"
          on:submit|preventDefault={() => {
            void saveContactDetails();
          }}
        >
          <HiddenSubmit />
          <div class="avatar">
            <AvatarEdit {avatar} name={displayName} />
          </div>
          <TextInput bind:this={inputFirstName} bind:value={firstName} label="First Name" />
          <TextInput bind:value={lastName} label="Last Name" />
        </form>
        <CancelAndConfirm slot="footer" let:modal {modal} />
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
      'firstName' auto
      'lastName' auto
      / minmax(min-content, #{rem(480px)});
    row-gap: rem(32px);

    .avatar {
      justify-self: center;
    }
  }
</style>
