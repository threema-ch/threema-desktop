<!--
  @component Renders the receiver navigation sidebar (i.e., the address book).
-->
<script lang="ts">
  import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
  import {ensureError} from '@threema/ts-utils/meta/ensure-error';
  import {onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import NavPanelHeader from '~/app/ui/components/organisms/nav-panel-header/NavPanelHeader.svelte';
  import AddressBook from '~/app/ui/components/partials/address-book/AddressBook.svelte';
  import type {AddressBookState} from '~/app/ui/components/partials/address-book/types';
  import EditContactModal from '~/app/ui/components/partials/modals/edit-contact-modal/EditContactModal.svelte';
  import {receiverListToGroupedAddressBookItems} from '~/app/ui/components/partials/receiver-nav/helpers';
  import type {ReceiverNavProps} from '~/app/ui/components/partials/receiver-nav/props';
  import {receiverListViewModelStoreToReceiverPreviewListItemsStore} from '~/app/ui/components/partials/receiver-nav/transformers';
  import type {
    ContextMenuItemHandlerProps,
    ModalState,
    RemoteReceiverListViewModelStoreValue,
  } from '~/app/ui/components/partials/receiver-nav/types';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {reactive, svelteUnreachable, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbContactUid, DbGroupUid} from '~/common/db';
  import type {AnyReceiver, ContactInit, GroupInit} from '~/common/model';
  import type {IdentityString} from '~/common/network/types';
  import type {Remote} from '~/common/utils/endpoint';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';
  import type {ReceiverListViewModelBundle} from '~/common/viewmodel/receiver/list';
  import type {ContactLookupResult} from '~/common/viewmodel/receiver/list/controller';
  import {
    isContactReceiverData,
    isGroupReceiverData,
    type AnyReceiverDataOrSelf,
  } from '~/common/viewmodel/utils/receiver';

  const {uiLogging, hotkeyManager} = globals.unwrap();
  const log = uiLogging.logger('ui.component.receiver-nav');

  const {services}: ReceiverNavProps = $props();

  const {
    backend,
    router,
    settings: {
      views: {appearance},
    },
  } = services;

  let viewModelStore = $state<IQueryableStore<RemoteReceiverListViewModelStoreValue | undefined>>(
    new ReadableStore(undefined),
  );
  let viewModelController: Remote<ReceiverListViewModelBundle>['viewModelController'] | undefined =
    undefined;

  let modalState = $state<ModalState>({type: 'none'});

  let addressBookComponent = $state<SvelteNullableBinding<AddressBook>>(null);
  let addressBookState = $state<AddressBookState | undefined>(undefined);

  function handleHotkeyControlF(): void {
    addressBookComponent?.focusAndSelectSearchBar();
  }

  function handleClickEditItem(item: ContextMenuItemHandlerProps<AnyReceiver>): void {
    const {receiver} = item.viewModelBundle.viewModelStore.get();
    if (receiver.type !== 'contact') {
      return;
    }

    modalState = {
      type: 'edit-contact',
      props: {
        receiver: {
          ...receiver,
          edit: async (update) => {
            await item.viewModelBundle.viewModelController.edit(update);
          },
        },
        services,
      },
    };
  }

  function handleCloseModal(): void {
    modalState = {
      type: 'none',
    };
  }

  function handleClickReceiverListItem(receiver: AnyReceiverDataOrSelf, active: boolean): void {
    if (!isContactReceiverData(receiver) && !isGroupReceiverData(receiver)) {
      return;
    }
    if (active) {
      router.goToWelcome();
    } else {
      router.goToConversation({receiverLookup: receiver.lookup});
    }
  }

  async function updateContactAcquaintanceLevelAndName(
    uid: DbContactUid,
    nameUpdate: {readonly firstName: string; readonly lastName: string},
  ): Promise<void> {
    if (viewModelController === undefined) {
      throw new Error('Error updating contact: The ReceiverListViewModelController was undefined');
    }
    await viewModelController.updateAcquaintanceLevelAndName(uid, nameUpdate);
  }

  async function createContact(contactInit: ContactInit): Promise<DbContactUid | 'race'> {
    if (viewModelController === undefined) {
      throw new Error('Error creating contact: The ReceiverListViewModelController was undefined');
    }
    return await viewModelController.createContact(contactInit);
  }

  async function lookupContact(
    identityString: Set<IdentityString>,
  ): Promise<ContactLookupResult[]> {
    if (viewModelController === undefined) {
      throw new Error(
        'Error looking up contact: The ReceiverListViewModelController was undefined',
      );
    }
    return await viewModelController.lookupContact(identityString);
  }

  async function createGroup(
    groupInit: Pick<GroupInit, 'name'>,
    members: ReadonlySet<DbContactUid>,
    profilePictureBytes: ReadonlyUint8Array | undefined,
  ): Promise<DbGroupUid | undefined> {
    if (viewModelController === undefined) {
      throw new Error('Error creating group: The ReceiverListViewModelController was undefined');
    }
    return await viewModelController.createGroup(groupInit, members, profilePictureBytes);
  }

  function handleChangeRouterState(): void {
    const routerState = $router;

    if (routerState.nav.id === 'receiverList') {
      addressBookState = routerState.nav.params.addressBookState;
    }
  }

  // Current list items.
  const receiverPreviewListItemsStore = $derived(
    receiverListViewModelStoreToReceiverPreviewListItemsStore(viewModelStore),
  );

  const groupedAddressBookItems = $derived(
    receiverListToGroupedAddressBookItems($receiverPreviewListItemsStore, $appearance, log),
  );

  onMount(async () => {
    await backend.viewModel
      .receiverList()
      .then((viewModelBundle) => {
        // Replace `viewModelBundle`.
        viewModelStore = viewModelBundle.viewModelStore;
        viewModelController = viewModelBundle.viewModelController;
      })
      .catch((error: unknown) => {
        log.error(`Failed to load ReceiverListViewModelBundle: ${ensureError(error)}`);

        toast.addSimpleFailure(
          i18n.get().t('contacts.error--contact-list-load', 'Contacts could not be loaded'),
        );
      });
  });

  onMount(() => {
    hotkeyManager.registerHotkey({control: true, code: 'KeyF'}, handleHotkeyControlF);

    return () => {
      hotkeyManager.unregisterHotkey(handleHotkeyControlF);
    };
  });

  $effect(() => {
    reactive(handleChangeRouterState, [$router]);
  });
</script>

<div class="container">
  <AddressBook
    bind:this={addressBookComponent}
    actions={{
      createContact,
      createGroup,
      lookupContact,
      updateContactAcquaintanceLevelAndName,
    }}
    componentState={addressBookState}
    items={groupedAddressBookItems}
    onclickedititem={handleClickEditItem}
    onclickitem={handleClickReceiverListItem}
    {services}
  >
    {#snippet snippetTopbar()}
      <NavPanelHeader {services} />
    {/snippet}
  </AddressBook>
</div>

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'edit-contact'}
  <EditContactModal {...modalState.props} onclose={handleCloseModal} />
{:else}
  {svelteUnreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    overflow: hidden;
    background-color: var(--t-nav-background-color);
  }
</style>
