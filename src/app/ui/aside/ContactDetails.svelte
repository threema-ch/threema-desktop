<script lang="ts">
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ProfilePictureComponent from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import {type RouterState} from '~/app/routing/router';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import DeleteDialog from '~/app/ui/modal/ContactDelete.svelte';
  import IdenitityInformationDialog from '~/app/ui/modal/ContactIdenitityInformation.svelte';
  import ProfilePictureDialog from '~/app/ui/modal/ContactProfilePicture.svelte';
  import UnableToDeleteDialog from '~/app/ui/modal/ContactUnableToDelete.svelte';
  import VerificationLevelsDialog from '~/app/ui/modal/ContactVerificationLevels.svelte';
  import Divider from '~/app/ui/nav/receiver/detail/Divider.svelte';
  import LinkElement from '~/app/ui/nav/receiver/detail/LinkElement.svelte';
  import ListElement from '~/app/ui/nav/receiver/detail/ListElement.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import {ReceiverType} from '~/common/enum';
  import {
    type ContactController,
    type ProfilePicture,
    type RemoteModelController,
  } from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type Remote} from '~/common/utils/endpoint';
  import {type LocalStore} from '~/common/utils/store';
  import {type ContactListItemViewModel} from '~/common/viewmodel/contact-list-item';

  /**
   * App Services
   */
  export let services: AppServices;

  // Unpack services
  const {router, backend} = services;

  let contactViewModel: Remote<LocalStore<ContactListItemViewModel>> | undefined;
  let contactController: RemoteModelController<ContactController> | undefined;
  let profilePicture: RemoteModelStore<ProfilePicture> | undefined;

  /**
   * Fetch contact viewmodel and profile picture store.
   */
  async function fetchContact(routerState: RouterState): Promise<void> {
    const contactStore =
      routerState.aside?.id === 'contactDetails'
        ? await backend.viewModel.contactListItem(routerState.aside.params.contactUid)
        : undefined;
    if (contactStore === undefined) {
      closeAside();
      return;
    }
    const contactInfo = contactStore.get();
    contactViewModel = contactInfo.viewModelStore;
    contactController = contactInfo.contactModelStore.get().controller;
    profilePicture = contactInfo.viewModelStore.get().profilePicture;
  }

  $: void fetchContact($router);

  function closeAside(): void {
    router.closeAside();
  }

  // Switch different modal dialogs
  let deleteContactDialogVisible = false;
  let unableToDeleteContactDialogVisible = false;
  let contactProfilePictureDialogVisible = false;
  let verificationLevelsDialogVisible = false;
  let identityInformationDialogVisible = false;

  let displayName: string;

  function openContactEditDialog(): void {
    if (contactViewModel !== undefined) {
      router.replaceModal(
        ROUTE_DEFINITIONS.modal.contactEdit.withTypedParams({
          contactUid: contactViewModel.get().uid,
        }),
      );
    }
  }

  async function handleClickedOnDeleteContact(): Promise<void> {
    if ($contactViewModel === undefined || contactController === undefined) {
      return;
    }
    displayName = $contactViewModel.displayName;
    if (await contactController.isRemovable()) {
      deleteContactDialogVisible = true;
    } else {
      unableToDeleteContactDialogVisible = true;
    }
  }

  function deleteContact(): void {
    if (contactViewModel === undefined || contactController === undefined) {
      return;
    }
    const contact = contactViewModel.get();

    // Redirect to welcome if current route is a conversation route with contact to delete
    const route = $router.main;
    if (
      route.id === 'conversation' &&
      route.params.receiverLookup.type === ReceiverType.CONTACT &&
      route.params.receiverLookup.uid === contact.uid
    ) {
      router.go(
        $router.nav,
        ROUTE_DEFINITIONS.main.welcome.withTypedParams(undefined),
        undefined,
        undefined,
      );
    }

    displayName = contact.displayName;
    contactController.remove
      .fromLocal()
      .then(() => {
        toast.addSimpleSuccess(`Successfully removed contact "${displayName}"`);
      })
      .catch(() => {
        toast.addSimpleFailure(`Could not delete contact "${displayName}"`);
      });

    deleteContactDialogVisible = false;
    closeAside();
  }
</script>

<template>
  <div class="aside-contact">
    <header>
      <span />
      Contact Detail
      <IconButton flavor="naked" on:click={closeAside}>
        <MdIcon theme="Outlined">close</MdIcon>
      </IconButton>
    </header>

    {#if $contactViewModel !== undefined && $profilePicture !== undefined}
      <div class="profile-picture">
        <span>
          <ProfilePictureComponent
            on:click={() => (contactProfilePictureDialogVisible = true)}
            img={transformProfilePicture($profilePicture.view.picture)}
            alt="Profile picture of {$contactViewModel.displayName}"
            initials={$contactViewModel.initials}
            color={$profilePicture.view.color}
            shape={'circle'}
          />
        </span>
      </div>
      <div class="name">
        {$contactViewModel.displayName}
      </div>
      <div class="edit">
        <span on:click={openContactEditDialog}>Edit</span>
      </div>
      <ListElement on:click={() => (identityInformationDialogVisible = true)} label="Threema ID">
        {$contactViewModel.identity}
        <MdIcon slot="icon" theme="Outlined">info</MdIcon>
      </ListElement>
      <div class="level">
        <ListElement
          on:click={() => (verificationLevelsDialogVisible = true)}
          label="Verification Level"
        >
          <VerificationDots
            colors={$contactViewModel.verificationLevelColors}
            verificationLevel={$contactViewModel.verificationLevel}
          />
          <MdIcon slot="icon" theme="Outlined">info</MdIcon>
        </ListElement>
      </div>
      <ListElement label="Nickname">{$contactViewModel.nickname}</ListElement>
      <Divider />
      <!-- <div class="gallery">
        <LinkElement wip label="Media Gallery">
          <div slot="icon-left" class="icon-photo">
            <MdIcon theme="Outlined">photo</MdIcon>
          </div>
          <MdIcon slot="icon-right" theme="Outlined">navigate_next</MdIcon>
        </LinkElement>
      </div> -->
      <!-- <div class="group-members">
        <LinkElement wip label="Members of these Groups">
          <div slot="icon-left" class="icon-group">
            <MdIcon theme="Outlined">group</MdIcon>
          </div>
          <MdIcon slot="icon-right" theme="Outlined">navigate_next</MdIcon>
        </LinkElement>
      </div> -->
      <!-- <Divider /> -->
      <!-- TODO(WEBMD-418): Add share of contact -->
      <!-- <LinkElement wip label="Share Contact">
        <MdIcon slot="icon-left" theme="Outlined">share</MdIcon>
      </LinkElement> -->
      <!-- TODO(WEBMD-419): Add block of contact -->
      <!-- <LinkElement wip label="Block Contact">
        <MdIcon slot="icon-left" theme="Outlined">block</MdIcon>
      </LinkElement> -->
      <LinkElement on:click={handleClickedOnDeleteContact} label="Delete Contact">
        <MdIcon slot="icon-left" theme="Outlined">delete</MdIcon>
      </LinkElement>

      <DeleteDialog
        bind:visible={deleteContactDialogVisible}
        on:confirm={deleteContact}
        {displayName}
      />

      <UnableToDeleteDialog bind:visible={unableToDeleteContactDialogVisible} {displayName} />

      <ProfilePictureDialog bind:visible={contactProfilePictureDialogVisible}
        ><ProfilePictureComponent
          img={transformProfilePicture($profilePicture.view.picture)}
          alt="Profile picture of {$contactViewModel.fullName}"
          initials={$contactViewModel.initials}
          color={$profilePicture.view.color}
          shape={'square'}
        />
      </ProfilePictureDialog>
    {/if}
  </div>

  {#if $contactViewModel !== undefined}
    <VerificationLevelsDialog
      bind:visible={verificationLevelsDialogVisible}
      verificationLevelColors={$contactViewModel.verificationLevelColors}
    />

    <IdenitityInformationDialog
      publicKey={$contactViewModel.publicKey}
      bind:visible={identityInformationDialogVisible}
    />
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .aside-contact {
    display: grid;
    grid-template:
      'header' #{rem(64px)}
      'profile-picture' min-content
      'name' #{rem(24px)}
      'edit' #{rem(24px)}
      'identity' min-content
      'level' min-content
      'nickname' min-content
      'divider-1' min-content
      'gallery' min-content
      'group-members' min-content
      'divider-2' min-content
      'share-contact' min-content
      'block-contact' min-content
      'delete-contact' min-content
      / 1fr;

    header {
      display: grid;
      padding: #{rem(12px)} #{rem(8px)} #{rem(12px)} #{rem(8px)};
      grid-template:
        'space title cancel' 100%
        / #{rem(40px)} auto #{rem(40px)};
      grid-auto-flow: column;
      place-items: center;
      user-select: none;
    }

    .profile-picture {
      display: grid;
      place-items: center;
      margin: rem(8px) 0;
      --c-profile-picture-size: #{rem(120px)};

      span {
        cursor: pointer;
      }
    }

    .name {
      @extend %font-large-400;
      padding: 0 rem(16px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
    }

    .edit {
      @extend %font-small-400;
      display: grid;
      place-items: center;
      color: var(--t-color-primary);
      text-decoration: none;
      user-select: none;

      span {
        cursor: pointer;
      }
    }

    .level {
      --c-verification-dots-size: #{rem(6px)};
    }

    // .gallery {
    //   .icon-photo {
    //     display: grid;
    //     place-items: center;
    //     color: var(--t-color-primary);
    //   }
    // }

    // .group-members {
    //   .icon-group {
    //     display: grid;
    //     place-items: center;
    //     color: var(--t-color-primary);
    //   }
    // }
  }
</style>
