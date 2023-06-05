<script lang="ts">
  import TitleAndClose from '#3sc/components/blocks/ModalDialog/Header/TitleAndClose.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import SearchInput from '~/app/ui/generic/search/SearchInput.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ForwardRecipient from '~/app/ui/modal/message-forward/ForwardRecipient.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type ContactTab} from '~/app/ui/nav/index';
  import {filterContacts} from '~/app/ui/nav/receiver';
  import ReceiverTabSwitcher from '~/app/ui/nav/receiver/ReceiverTabSwitcher.svelte';
  import {type DbReceiverLookup} from '~/common/db';
  import {WorkVerificationLevel} from '~/common/enum';
  import {type MessageId} from '~/common/network/types';
  import {unreachable} from '~/common/utils/assert';

  export let visible: boolean;

  export let sourceReceiverLookup: DbReceiverLookup;

  export let messageId: MessageId;

  export let services: AppServices;
  const {backend, router} = services;

  let searchInput: SearchInput;
  let activeTab: ContactTab = 'private-contacts';
  let filter = '';

  let searchInputPlaceholder: string;

  function forwardMessage(receiverLookup: DbReceiverLookup): void {
    const forwardedMessage = {
      receiverLookup: sourceReceiverLookup,
      messageId,
    };
    router.replaceMain(
      ROUTE_DEFINITIONS.main.conversation.withTypedParams({
        receiverLookup,
        forwardedMessage,
      }),
    );

    // Hide message forward dialog
    visible = false;
  }

  $: switch (activeTab) {
    case 'work-contacts':
      searchInputPlaceholder = $i18n.t(
        'dialog--forward-message.label--search-work-contacts',
        'Search Company Contacts',
      );
      break;
    case 'private-contacts':
      searchInputPlaceholder = $i18n.t(
        'dialog--forward-message.label--search-private-contacts',
        'Search Contacts',
      );
      break;
    case 'groups':
      searchInputPlaceholder = $i18n.t(
        'dialog--forward-message.label--search-groups',
        'Search Groups',
      );
      break;
    case 'distribution-lists':
      searchInputPlaceholder = $i18n.t(
        'dialog--forward-message.label--search-distribution-lists',
        'Search Distribution Lists',
      );
      break;
    default:
      unreachable(activeTab);
  }

  // Autofocus on search input
  $: if (visible && searchInput !== null && searchInput !== undefined) {
    searchInput.focus();
  }

  // TODO(DESK-830)
  // Rewrite current message forwarding flow with new viewmodel data fetch
</script>

<template>
  <ModalWrapper {visible}>
    <ModalDialog
      bind:visible
      on:confirm
      on:close={() => (visible = false)}
      on:cancel={() => (visible = false)}
    >
      <TitleAndClose
        let:modal
        {modal}
        slot="header"
        title={$i18n.t('dialog--forward-message.label--title', 'Select Recipient')}
      />
      <div class="body" slot="body">
        <div class="switch">
          <ReceiverTabSwitcher bind:activeTab tmpShowGroup={false} />
        </div>
        <div class="search">
          <SearchInput
            bind:this={searchInput}
            placeholder={searchInputPlaceholder}
            bind:value={filter}
          />
        </div>
        <div class="recipients">
          {#await backend.model.contacts.getAll() then contacts}
            {#await filterContacts(contacts.get(), filter, activeTab === 'work-contacts' ? WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED : undefined) then filtered}
              {#each filtered.get() as contact (contact.id)}
                <ForwardRecipient
                  {contact}
                  {filter}
                  on:click={() =>
                    forwardMessage({
                      type: contact.type,
                      uid: contact.ctx,
                    })}
                />
              {/each}
            {/await}
          {/await}
        </div>
      </div>
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    padding-top: rem(10px);
    width: rem(480px);
    height: 80vh;

    display: grid;
    grid-template:
      'switch   ' min-content
      'search ' min-content
      'recipients ' 1fr;

    .switch {
      grid-area: switch;
      padding: 0 rem(16px);
      margin-bottom: rem(16px);
    }
    .search {
      grid-area: search;
      padding: 0 rem(16px);
      margin-bottom: rem(16px);
    }
    .recipients {
      grid-area: recipients;
      display: grid;
      overflow-y: auto;
      align-content: start;
    }
  }
</style>
