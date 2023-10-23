<!--
  @component 
  Renders a modal to forward a message to another recipient.
-->
<script lang="ts">
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import {getSearchInputPlaceholderForTab} from '~/app/ui/components/partials/chat-view/internal/message-forward-modal/helpers';
  import type {MessageForwardModalProps} from '~/app/ui/components/partials/chat-view/internal/message-forward-modal/props';
  import SearchInput from '~/app/ui/generic/search/SearchInput.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ForwardRecipient from '~/app/ui/modal/message-forward/ForwardRecipient.svelte';
  import type {ContactTab} from '~/app/ui/nav';
  import {filterContacts} from '~/app/ui/nav/receiver';
  import ReceiverTabSwitcher from '~/app/ui/nav/receiver/ReceiverTabSwitcher.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {WorkVerificationLevel} from '~/common/enum';

  type $$Props = MessageForwardModalProps;

  export let id: $$Props['id'];
  export let receiverLookup: $$Props['receiverLookup'];
  export let services: $$Props['services'];

  const {backend, router} = services;

  let modalComponent: SvelteNullableBinding<Modal> = null;

  let activeTab: ContactTab = 'private-contacts';
  let searchTerm = '';

  function forwardMessage({
    messageId,
    fromReceiver,
    toReceiver,
    appRouter,
  }: {
    messageId: typeof id;
    fromReceiver: typeof receiverLookup;
    toReceiver: DbReceiverLookup;
    appRouter: typeof router;
  }): void {
    const messageToForward = {
      receiverLookup: fromReceiver,
      messageId,
    };

    appRouter.replaceMain(
      ROUTE_DEFINITIONS.main.conversation.withTypedParams({
        receiverLookup: toReceiver,
        forwardedMessage: messageToForward,
      }),
    );

    modalComponent?.close();
  }
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
  }}
  on:close
>
  <div class="content">
    <div class="switch">
      <ReceiverTabSwitcher bind:activeTab tmpShowGroup={false} />
    </div>

    <div class="search">
      <SearchInput
        bind:value={searchTerm}
        autofocus
        placeholder={getSearchInputPlaceholderForTab(activeTab, $i18n.t)}
      />
    </div>

    <div class="recipients">
      {#await backend.model.contacts.getAll() then contacts}
        {#await filterContacts(contacts.get(), searchTerm, activeTab === 'work-contacts' ? WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED : undefined) then filtered}
          {#each filtered.get() as contact (contact.id)}
            <ForwardRecipient
              {services}
              {contact}
              filter={searchTerm}
              on:click={() =>
                forwardMessage({
                  messageId: id,
                  fromReceiver: receiverLookup,
                  toReceiver: {
                    type: contact.type,
                    uid: contact.ctx,
                  },
                  appRouter: router,
                })}
            />
          {/each}
        {/await}
      {/await}
    </div>
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
    overflow: auto;

    .switch {
      flex: none;
      padding: 0 rem(16px);
      margin-bottom: rem(16px);
    }

    .search {
      flex: none;
      padding: 0 rem(16px);
      margin-bottom: rem(8px);
    }

    .recipients {
      flex: 1;
      display: grid;
      overflow-y: auto;
      align-content: start;
    }
  }
</style>
