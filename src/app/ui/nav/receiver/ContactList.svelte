<script lang="ts">
  import {onDestroy} from 'svelte';

  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import {contextMenuAction} from '~/app/ui/generic/context-menu';
  import {type VirtualRect} from '~/app/ui/generic/popover';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {SwipeAreaGroup} from '~/app/ui/generic/swipe-area';
  import DeleteDialog from '~/app/ui/modal/ContactDelete.svelte';
  import UnableToDeleteDialog from '~/app/ui/modal/ContactUnableToDelete.svelte';
  import {contactListFilter, matchesContactSearchFilter} from '~/app/ui/nav/receiver';
  import ContactListContextMenu from '~/app/ui/nav/receiver/ContactListContextMenu.svelte';
  import ContactListItem from '~/app/ui/nav/receiver/ContactListItem.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {type DbContactUid} from '~/common/db';
  import {scrollToCenterOfView} from '~/common/dom/utils/element';
  import {ReceiverType} from '~/common/enum';
  import {type Remote} from '~/common/utils/endpoint';
  import {type SetValue} from '~/common/utils/set';
  import {type IQueryableStoreValue} from '~/common/utils/store';
  import {derive} from '~/common/utils/store/derived-store';
  import {localeSort} from '~/common/utils/string';
  import {type ContactListItemSetStore} from '~/common/viewmodel/contact-list-item';

  const log = globals.unwrap().uiLogging.logger('ui.component.contact-list');

  /**
   * App Services.
   */
  export let services: AppServices;
  /**
   * Set of all contact view models.
   */
  export let contacts: Remote<ContactListItemSetStore>;

  const {router} = services;

  const swipeGroup = new SwipeAreaGroup();

  // Context menu
  let contextMenuPopover: Popover;
  let contextGroup: HTMLElement;
  let contextMenuPosition: VirtualRect | undefined;
  let currentContact: SetValue<IQueryableStoreValue<typeof contacts>> | undefined;

  // "Delete contact" modal dialog
  let deleteContactDialogVisible = false;
  let unableToDeleteContactDialogVisible = false;
  let displayName: string;

  // Filter and sort all contacts
  const sortedFilteredContacts = derive(contacts, (contactSet, getAndSubscribe) =>
    [...contactSet]
      // Filter: Only include direct contacts matching the search filter
      .filter((contact) => {
        const viewModel = getAndSubscribe(contact.viewModelStore);
        const filterText = getAndSubscribe(contactListFilter);
        return viewModel.showInContactList && matchesContactSearchFilter(filterText, viewModel);
      })
      // Sort: By display name
      .sort((a, b) =>
        localeSort(
          getAndSubscribe(a.viewModelStore).displayName,
          getAndSubscribe(b.viewModelStore).displayName,
        ),
      ),
  );

  onDestroy((): void => {
    contextMenuPopover.close();
  });

  function handleClickedOnEditContact(): void {
    contextMenuPopover.close();
    if (currentContact === undefined) {
      return;
    }
    router.replaceModal(
      ROUTE_DEFINITIONS.modal.contactEdit.withTypedParams({
        contactUid: currentContact.contactUid,
      }),
    );
    currentContact = undefined;
  }

  async function handleClickedOnDeleteContact(): Promise<void> {
    contextMenuPopover.close();
    if (currentContact === undefined) {
      return;
    }
    const currentContactViewModel = currentContact.viewModelStore.get();
    displayName = currentContactViewModel.displayName;
    if (await currentContact.contactModelStore.get().controller.isRemovable()) {
      deleteContactDialogVisible = true;
    } else {
      unableToDeleteContactDialogVisible = true;
      // eslint-disable-next-line require-atomic-updates
      currentContact = undefined;
    }
  }

  function scrollIntoViewIfConversationDisplayed(
    node: HTMLElement,
    contactUid: DbContactUid,
  ): void {
    if (currentlyDisplayedConversationContactUid === contactUid) {
      scrollToCenterOfView(node);
    }
  }

  function deleteContact(): void {
    if (currentContact === undefined) {
      return;
    }

    // Redirect to welcome if current route is a conversation route with contact to delete
    const currentRoute = $router.main;
    if (currentRoute.id === 'conversation') {
      if (
        currentRoute.params.receiverLookup.type === ReceiverType.CONTACT &&
        currentRoute.params.receiverLookup.uid === currentContact.contactUid
      ) {
        router.go(
          $router.nav,
          ROUTE_DEFINITIONS.main.welcome.withTypedParams(undefined),
          undefined,
          undefined,
        );
      }
    }

    displayName = currentContact.viewModelStore.get().displayName;
    currentContact.contactModelStore
      .get()
      .controller.remove.fromLocal()
      .then(() => {
        toast.addSimpleSuccess(`Successfully removed contact "${displayName}"`);
      })
      .catch(() => {
        const message = 'Could not delete contact';

        log.error(message);
        toast.addSimpleFailure(`${message} "${displayName}"`);
      });

    // TODO (routing): Move route to (?) if current contact is current active chat
    currentContact = undefined;
    deleteContactDialogVisible = false;
  }

  let currentlyDisplayedConversationContactUid: DbContactUid | undefined;
  $: {
    const routeReceiverLookup = $router.main.params?.receiverLookup;
    currentlyDisplayedConversationContactUid =
      routeReceiverLookup?.type === ReceiverType.CONTACT ? routeReceiverLookup.uid : undefined;
  }
</script>

<template>
  <div class="contact-preview-list" bind:this={contextGroup}>
    {#each $sortedFilteredContacts as contact (contact.contactUid)}
      <div
        class="contact-preview"
        use:contextMenuAction={(event) => {
          event.preventDefault();
          currentContact = contact;
          contextMenuPosition = {
            left: event.clientX,
            right: 0,
            top: event.clientY,
            bottom: 0,
            width: 0,
            height: 0,
          };
          contextMenuPopover.open(event);
        }}
        use:scrollIntoViewIfConversationDisplayed={contact.contactUid}
      >
        <ContactListItem
          contact={contact.viewModelStore}
          {router}
          {swipeGroup}
          active={currentContact === contact}
          selectable={false}
        />
      </div>
    {/each}
  </div>

  <Popover
    bind:this={contextMenuPopover}
    container={contextGroup}
    reference={contextMenuPosition}
    anchorPoints={{
      reference: {
        horizontal: 'left',
        vertical: 'bottom',
      },
      popover: {
        horizontal: 'left',
        vertical: 'top',
      },
    }}
    on:clickoutside={() => {
      currentContact = undefined;
    }}
  >
    <ContactListContextMenu
      slot="popover"
      on:edit={handleClickedOnEditContact}
      on:delete={handleClickedOnDeleteContact}
    />
  </Popover>

  <DeleteDialog
    bind:visible={deleteContactDialogVisible}
    {displayName}
    on:confirm={deleteContact}
  />

  <UnableToDeleteDialog bind:visible={unableToDeleteContactDialogVisible} {displayName} />
</template>

<style lang="scss">
  @use 'component' as *;

  .contact-preview-list {
    overflow-y: auto;
    overflow-x: hidden;
    scroll-snap-type: y mandatory;

    .contact-preview {
      scroll-snap-align: start;
    }
  }
</style>
