<!--
  @component Renders the receiver navigation sidebar (i.e., the address book).
-->
<script lang="ts">
  import {onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import AddressBook from '~/app/ui/components/partials/address-book/AddressBook.svelte';
  import type {TabState} from '~/app/ui/components/partials/address-book/types';
  import EditContactModal from '~/app/ui/components/partials/modals/edit-contact-modal/EditContactModal.svelte';
  import TopBar from '~/app/ui/components/partials/receiver-nav/internal/top-bar/TopBar.svelte';
  import type {ReceiverNavProps} from '~/app/ui/components/partials/receiver-nav/props';
  import {receiverListViewModelStoreToReceiverPreviewListPropsStore} from '~/app/ui/components/partials/receiver-nav/transformers';
  import type {
    ContextMenuItemHandlerProps,
    ModalState,
    RemoteReceiverListViewModelStoreValue,
  } from '~/app/ui/components/partials/receiver-nav/types';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {ConnectionState} from '~/common/enum';
  import type {AnyReceiver} from '~/common/model';
  import {DEFAULT_CATEGORY} from '~/common/settings';
  import {ensureError, unreachable} from '~/common/utils/assert';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';

  const {uiLogging, hotkeyManager} = globals.unwrap();
  const log = uiLogging.logger('ui.component.receiver-nav');

  type $$Props = ReceiverNavProps;

  export let services: $$Props['services'];

  const {backend, router} = services;

  let viewModelStore: IQueryableStore<RemoteReceiverListViewModelStoreValue | undefined> =
    new ReadableStore(undefined);

  let modalState: ModalState = {type: 'none'};

  let addressBookComponent: SvelteNullableBinding<
    AddressBook<ContextMenuItemHandlerProps<AnyReceiver>>
  > = null;
  let addressBookTabState: TabState = 'contact';

  function handleHotkeyControlF(): void {
    addressBookComponent?.focusAndSelectSearchBar();
  }

  function handleClickBackButton(): void {
    router.go({nav: ROUTE_DEFINITIONS.nav.conversationList.withoutParams()});
  }

  function handleClickSettingsButton(): void {
    router.goToSettings({category: DEFAULT_CATEGORY});
  }

  function handleClickAdd(): void {
    // If the connection is currently inactive, don't allow entering the contact creation wizard.
    if (backend.connectionState.get() !== ConnectionState.CONNECTED) {
      toast.addSimpleFailure(
        i18n
          .get()
          .t(
            'contacts.error--add-contact',
            'Unable to add contact. Please check your Internet connection.',
          ),
      );
      return;
    }

    router.go({nav: ROUTE_DEFINITIONS.nav.contactAdd.withParams({identity: undefined})});
  }

  function handleClickEditItem(event: CustomEvent<ContextMenuItemHandlerProps<AnyReceiver>>): void {
    const {receiver} = event.detail.viewModelBundle.viewModelStore.get();
    if (receiver.type !== 'contact') {
      return;
    }

    modalState = {
      type: 'edit-contact',
      props: {
        receiver: {
          ...receiver,
          edit: async (update) => {
            await event.detail.viewModelBundle.viewModelController.edit(update);
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

  function handleClickReceiverListItem(lookup: DbReceiverLookup, active?: boolean): void {
    if (active === true) {
      router.goToWelcome();
    } else {
      router.goToConversation({receiverLookup: lookup});
    }
  }

  // Current list items.
  $: receiverPreviewListPropsStore = receiverListViewModelStoreToReceiverPreviewListPropsStore(
    viewModelStore,
    addressBookTabState,
  );

  onMount(async () => {
    await backend.viewModel
      .receiverList()
      .then((viewModelBundle) => {
        // Replace `viewModelBundle`.
        viewModelStore = viewModelBundle.viewModelStore;
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
</script>

<div class="container">
  <div class="top-bar">
    <TopBar
      on:clickbackbutton={handleClickBackButton}
      on:clicksettingsbutton={handleClickSettingsButton}
    />
  </div>

  <div class="content">
    <AddressBook
      bind:this={addressBookComponent}
      bind:tabState={addressBookTabState}
      items={$receiverPreviewListPropsStore}
      {services}
      on:clickadd={handleClickAdd}
      on:clickedititem={handleClickEditItem}
      on:clickitem={(event) =>
        handleClickReceiverListItem(event.detail.lookup, event.detail.active)}
    />
  </div>
</div>

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'edit-contact'}
  <EditContactModal {...modalState.props} on:close={handleCloseModal} />
{:else}
  {unreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    overflow: hidden;
    background-color: var(--t-nav-background-color);

    grid-template:
      'top-bar' min-content
      'content' 1fr
      / 100%;

    .top-bar {
      grid-area: top-bar;
    }

    .content {
      grid-area: content;

      overflow: hidden;
    }
  }
</style>
