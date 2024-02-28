<script lang="ts">
  import {onMount} from 'svelte';

  import {assertRoute} from '~/app/routing';
  import type {AppServices} from '~/app/types';
  import HiddenSubmit from '~/app/ui/generic/form/HiddenSubmit.svelte';
  import ProfilePictureEdit from '~/app/ui/generic/profile-picture/ProfilePictureEdit.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {getStores} from '~/app/ui/nav/receiver';
  import TextInput from '~/app/ui/svelte-components/blocks/Input/Text.svelte';
  import CancelAndConfirm from '~/app/ui/svelte-components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import type {Contact, ProfilePicture} from '~/common/model';
  import type {RemoteModelStore} from '~/common/model/utils/model-store';
  import {assertUnreachable} from '~/common/utils/assert';

  export let services: AppServices;

  const {router, backend} = services;
  const route = assertRoute('modal', $router.modal, ['contactEdit']);
  const contactUid = route.params.contactUid;

  let contact: RemoteModelStore<Contact> | undefined;
  let profilePicture: RemoteModelStore<ProfilePicture> | undefined;
  let firstName = '';
  let lastName = '';
  let displayName = '';
  let inputFirstName: TextInput | undefined;

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
            profilePicture = stores.profilePicture;
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

  $: inputFirstName?.focus();

  onMount(loadContactOrCloseModal);
</script>

<template>
  {#if $contact !== undefined && profilePicture !== undefined}
    <ModalWrapper visible={true}>
      <ModalDialog
        visible={true}
        on:confirm={saveContactDetails}
        on:close={closeModal}
        on:cancel={closeModal}
      >
        <Title
          slot="header"
          title={$i18n.t('dialog--edit-contact.label--title', 'Edit {name}', {
            name: displayName,
          })}
        />
        <form
          class="body"
          slot="body"
          on:submit|preventDefault={() => {
            saveContactDetails().catch(assertUnreachable);
          }}
        >
          <HiddenSubmit />
          <div class="profile-picture">
            <ProfilePictureEdit {profilePicture} name={displayName} />
          </div>
          <TextInput
            bind:this={inputFirstName}
            bind:value={firstName}
            label={$i18n.t('dialog--edit-contact.label--first-name', 'First Name')}
          />
          <TextInput
            bind:value={lastName}
            label={$i18n.t('dialog--edit-contact.label--last-name', 'Last Name')}
          />
        </form>
        <CancelAndConfirm
          slot="footer"
          cancelText={$i18n.t('dialog--edit-contact.action--cancel', 'Cancel')}
          confirmText={$i18n.t('dialog--edit-contact.action--confirm', 'OK')}
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
      'firstName' auto
      'lastName' auto
      / minmax(min-content, #{rem(480px)});
    row-gap: rem(32px);

    .profile-picture {
      justify-self: center;
    }
  }
</style>
