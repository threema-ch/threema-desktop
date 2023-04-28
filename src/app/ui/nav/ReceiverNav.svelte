<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import IconText from '~/app/ui/generic/menu/item/IconText.svelte';
  import SearchInput from '~/app/ui/generic/search/SearchInput.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {type ContactTab} from '~/app/ui/nav';
  import {checkContactCreationAllowed} from '~/app/ui/nav/contact-add';
  import {contactListFilter} from '~/app/ui/nav/receiver';
  import ContactList from '~/app/ui/nav/receiver/ContactList.svelte';
  import ContactNavBar from '~/app/ui/nav/receiver/ContactNavBar.svelte';
  import GroupList from '~/app/ui/nav/receiver/GroupList.svelte';
  import ReceiverTabSwitcher from '~/app/ui/nav/receiver/ReceiverTabSwitcher.svelte';
  import {WorkVerificationLevel} from '~/common/enum';
  import {unreachable} from '~/common/utils/assert';

  export let services: AppServices;
  const {router, backend} = services;

  let searchInput: SearchInput;
  let activeTab: ContactTab = 'private-contacts';

  let searchInputPlaceholder: string;
  let addButtonText: string;

  $: {
    switch (activeTab) {
      case 'work-contacts':
        searchInputPlaceholder = $i18n.t(
          'contacts.label--search-work-contacts',
          'Search Company Contacts',
        );
        break;
      case 'private-contacts':
        searchInputPlaceholder = $i18n.t(
          'contacts.label--search-private-contacts',
          'Search Contacts',
        );
        addButtonText = $i18n.t('contacts.action--add-contact', 'New Contact');
        break;
      case 'groups':
        searchInputPlaceholder = $i18n.t('contacts.label--search-groups', 'Search Groups');
        addButtonText = $i18n.t('contacts.action--add-group', 'New Group');
        break;
      case 'distribution-lists':
        searchInputPlaceholder = $i18n.t(
          'contacts.label--search-distribution-lists',
          'Search Distribution Lists',
        );
        addButtonText = $i18n.t('contacts.action--add-distribution-list', 'New Distribution List');
        break;
      default:
        unreachable(activeTab);
    }

    if (searchInput !== undefined) {
      searchInput.focus();
      searchInput.select();
    }
  }

  function navigateBack(): void {
    router.replaceNav(ROUTE_DEFINITIONS.nav.conversationList.withTypedParams(undefined));
  }

  function handleAdd(): void {
    if (import.meta.env.BUILD_VARIANT === 'work') {
      // For the time being adding contacts is not allowed in the Work variant
      return;
    }

    if (!checkContactCreationAllowed(backend)) {
      return;
    }
    switch (activeTab) {
      case 'distribution-lists':
      case 'work-contacts':
      case 'groups':
        break;
      case 'private-contacts':
        router.replaceNav(ROUTE_DEFINITIONS.nav.contactAdd.withTypedParams({identity: undefined}));
        return;
      default:
        unreachable(activeTab);
    }
  }
</script>

<template>
  <div id="nav-wrapper" data-tab={activeTab} data-variant={import.meta.env.BUILD_VARIANT}>
    <div class="bar">
      <ContactNavBar on:back={navigateBack} />
    </div>
    <div class="context">
      <ReceiverTabSwitcher bind:activeTab />
    </div>
    <div class="search">
      <SearchInput
        bind:this={searchInput}
        placeholder={searchInputPlaceholder}
        bind:value={$contactListFilter}
      />
    </div>

    {#if import.meta.env.BUILD_VARIANT === 'work'}
      <div class="list">
        {#if activeTab === 'private-contacts'}
          {#await services.backend.viewModel.contactListItems() then contacts}
            <ContactList {services} {contacts} workVerificationLevel={WorkVerificationLevel.NONE} />
          {/await}
        {:else if activeTab === 'groups'}
          {#await services.backend.viewModel.groupListItems() then groups}
            <GroupList {services} {groups} />
          {/await}
        {:else}
          {#await services.backend.viewModel.contactListItems() then contacts}
            <ContactList
              {services}
              {contacts}
              workVerificationLevel={WorkVerificationLevel.WORK_SUBSCRIPTION_VERIFIED}
            />
          {/await}
        {/if}
      </div>
    {:else}
      <div class="add">
        <IconText on:click={handleAdd} wip={activeTab !== 'private-contacts'}>
          <div slot="icon" class="icon">
            <MdIcon theme="Filled">add</MdIcon>
          </div>
          <div slot="text">{addButtonText}</div>
        </IconText>
      </div>
      <div class="list">
        {#if activeTab === 'private-contacts'}
          {#await services.backend.viewModel.contactListItems() then contacts}
            <ContactList {services} {contacts} />
          {/await}
        {:else if activeTab === 'groups'}
          {#await services.backend.viewModel.groupListItems() then groups}
            <GroupList {services} {groups} />
          {/await}
        {/if}
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  #nav-wrapper {
    display: grid;
    overflow: hidden;
    padding: rem(12px) 0 0;
    background-color: var(--t-nav-background-color);
    grid-template:
      'bar     ' rem(40px)
      'context ' auto
      'search  ' rem(44px)
      'add     ' rem(48px)
      'list    ' minmax(0, 1fr)
      / 100%;
    gap: rem(8px);

    .bar {
      padding: 0 rem(8px) 0 rem(8px);
      display: grid;
    }

    .context {
      padding: rem(16px);
      display: grid;
    }

    .search {
      padding: rem(4px) rem(16px) 0;
      display: grid;
    }

    .add {
      padding: rem(4px) rem(16px) 0;
      display: grid;

      .icon {
        display: grid;
        place-items: center;
        color: var(--t-color-primary);
      }
    }

    .list {
      display: grid;
    }

    &[data-variant='work'],
    &[data-tab='work-contacts'] {
      grid-template:
        'bar     ' rem(40px)
        'context ' auto
        'search  ' rem(44px)
        'list    ' minmax(0, 1fr)
        / 100%;
    }
    .wip {
      margin: rem(40px) auto;
    }
  }
</style>
