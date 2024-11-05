<!--
  @component Renders a modal to forward a message to another recipient.
-->
<script lang="ts">
  import {onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import AddressBook from '~/app/ui/components/partials/address-book/AddressBook.svelte';
  import type {TabState} from '~/app/ui/components/partials/address-book/types';
  import type {MessageForwardModalProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-forward-modal/props';
  import {receiverListViewModelStoreToReceiverPreviewListPropsStore} from '~/app/ui/components/partials/receiver-nav/transformers';
  import type {
    ContextMenuItemHandlerProps,
    RemoteReceiverListViewModelStoreValue,
  } from '~/app/ui/components/partials/receiver-nav/types';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import type {AnyReceiver} from '~/common/model';
  import {ensureError} from '~/common/utils/assert';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.message-forward-modal');

  type $$Props = MessageForwardModalProps;

  export let id: $$Props['id'];
  export let receiverLookup: $$Props['receiverLookup'];
  export let services: $$Props['services'];

  const {backend, router} = services;

  // ViewModelBundle containing all receivers.
  let viewModelStore: IQueryableStore<RemoteReceiverListViewModelStoreValue | undefined> =
    new ReadableStore(undefined);

  let modalComponent: SvelteNullableBinding<Modal> = null;

  let addressBookComponent: SvelteNullableBinding<
    AddressBook<ContextMenuItemHandlerProps<AnyReceiver>>
  > = null;
  let addressBookTabState: TabState = 'contact';

  function handleClickItem(event: CustomEvent<{lookup: DbReceiverLookup}>): void {
    const messageToForward = {
      receiverLookup,
      messageId: id,
    };

    router.goToConversation({
      receiverLookup: event.detail.lookup,
      forwardedMessage: messageToForward,
    });

    modalComponent?.close();
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
</script>

<Modal
  bind:this={modalComponent}
  wrapper={{
    type: 'card',
    actions: [
      {
        iconName: 'close',
        onClick: 'close',
      },
    ],
    title: $i18n.t('dialog--forward-message.label--title', 'Select Recipient'),
    maxWidth: 460,
  }}
  on:close
>
  <div class="content">
    <AddressBook
      bind:this={addressBookComponent}
      bind:tabState={addressBookTabState}
      items={$receiverPreviewListPropsStore}
      options={{
        allowReceiverCreation: false,
        allowReceiverEditing: false,
        highlightActiveReceiver: false,
      }}
      {services}
      on:clickitem={handleClickItem}
    />
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;

    height: 75vh;
    overflow: hidden;
  }
</style>
