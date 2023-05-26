<script lang="ts">
  import TitleAndClose from '#3sc/components/blocks/ModalDialog/Header/TitleAndClose.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import DeprecatedReceiver from '~/app/ui/generic/receiver/DeprecatedReceiver.svelte';
  import ProcessedText from '~/app/ui/generic/receiver/ProcessedText.svelte';
  import SearchInput from '~/app/ui/generic/search/SearchInput.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type ContactTab} from '~/app/ui/nav/index';
  import {
    filterContacts,
    getStores,
    showFullNameAndNickname,
    transformContact,
  } from '~/app/ui/nav/receiver';
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
          {#await services.backend.model.contacts.getAll() then contacts}
            {#await filterContacts(contacts.get(), filter, activeTab === 'work-contacts' ? WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED : undefined) then filtered}
              {#each filtered.get() as contact (contact.id)}
                {#await transformContact(backend.model.settings, contact.get()) then transformedContact}
                  {#await getStores(contact.get()) then stores}
                    <div class="recipient">
                      <DeprecatedReceiver
                        on:click={() =>
                          forwardMessage({
                            type: contact.type,
                            uid: contact.ctx,
                          })}
                        {filter}
                        profilePicture={{
                          alt: $i18n.t(
                            'dialog--forward-message.hint--profile-picture',
                            'Profile picture of {name}',
                            {
                              name: transformedContact.displayName,
                            },
                          ),
                          profilePicture: stores.profilePicture.get().view,
                          initials: transformedContact.initials,
                          unread: 0,
                          badge: transformedContact.badge,
                        }}
                        title={{
                          title: showFullNameAndNickname(transformedContact)
                            ? transformedContact.fullName
                            : transformedContact.displayName,
                          subtitle: {
                            text: showFullNameAndNickname(transformedContact)
                              ? transformedContact.nickname
                              : undefined,
                          },
                          isInactive: transformedContact.activityState === 'inactive',
                        }}
                      >
                        <div class="verification-dots" slot="additional-top">
                          <VerificationDots
                            colors={transformedContact.verificationLevelColors}
                            verificationLevel={transformedContact.verificationLevel}
                          />
                        </div>
                        <div class="identity" slot="additional-bottom">
                          <ProcessedText text={transformedContact.identity} highlights={filter} />
                        </div>
                      </DeprecatedReceiver>
                    </div>
                  {/await}
                {/await}
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

  $-temp-vars: (--cc-t-background-color);

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

      .recipient {
        @include def-var($-temp-vars, --cc-t-background-color, var(--t-main-background-color));
        @include def-var(
          $--cc-profile-picture-overlay-background-color: var($-temp-vars, --cc-t-background-color)
        );
        background-color: var($-temp-vars, --cc-t-background-color);

        .verification-dots {
          @include def-var(--c-verification-dots-size, rem(6px));
        }

        .identity {
          @extend %font-small-400;
          color: var(--t-text-e2-color);
        }

        &:hover {
          @include def-var(
            $-temp-vars,
            --cc-t-background-color,
            var(--cc-conversation-preview-background-color--hover)
          );
        }
      }
    }
  }
</style>
