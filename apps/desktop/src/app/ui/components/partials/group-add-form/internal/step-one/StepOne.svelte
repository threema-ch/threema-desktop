<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import SearchBar from '~/app/ui/components/molecules/search-bar/SearchBar.svelte';
  import type {StepOneProps} from '~/app/ui/components/partials/group-add-form/internal/step-one/props';
  import TopBar from '~/app/ui/components/partials/group-add-form/internal/top-bar/TopBar.svelte';
  import ReceiverPreviewList from '~/app/ui/components/partials/receiver-preview-list/ReceiverPreviewList.svelte';
  import {buildFilteredAndSummaryItems} from '~/app/ui/components/partials/receiver-preview-list/helpers';
  import type {InteractionEvent} from '~/app/ui/components/partials/receiver-preview-list/types';
  import HiddenSubmit from '~/app/ui/generic/form/HiddenSubmit.svelte';
  import {i18n} from '~/app/ui/i18n';
  import WizardButton from '~/app/ui/svelte-components/blocks/Button/WizardButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {isContactReceiverData} from '~/common/viewmodel/utils/receiver';

  const {
    contacts,
    onclickcancel,
    onformcontinue,
    onformcancel,
    onselectitem,
    selectedContacts,
    services,
  }: StepOneProps = $props();

  const log = globals.unwrap().uiLogging.logger('ui.component.group-add-form');

  let searchTerm: string | undefined = $state(undefined);

  function handleInteraction(event: InteractionEvent): void {
    if (event.type !== 'select') {
      return;
    }

    const {receiver, selected} = event;
    if (!isContactReceiverData(receiver)) {
      log.debug('GroupAddForm receiver list should only contain contacts');
      return;
    }

    onselectitem(selected, receiver);
  }

  const {filteredSelectableContacts, summaryContacts} = $derived(
    buildFilteredAndSummaryItems(contacts, selectedContacts, searchTerm),
  );
</script>

<form
  class="container"
  onsubmit={(event) => {
    event.preventDefault();

    onformcontinue();
  }}
>
  <HiddenSubmit />
  <div class="bar">
    <TopBar {onclickcancel} />
  </div>
  <div class="search">
    <SearchBar
      bind:term={searchTerm}
      placeholder={$i18n.t('contacts.label--search-private-contacts', 'Search Contacts')}
      onclear={() => {}}
    />
  </div>

  <div class="content">
    {#if filteredSelectableContacts.length > 0 || summaryContacts.length > 0}
      <div class="list">
        <ReceiverPreviewList
          highlights={searchTerm}
          items={filteredSelectableContacts}
          summaryItems={summaryContacts}
          oninteraction={handleInteraction}
          {services}
        />
      </div>
    {:else}
      <div class="notice">
        <div class="icon"><MdIcon theme="Outlined">info</MdIcon></div>
        <div class="text">
          <Text text={$i18n.t('contacts.hint--no-contacts', 'Your contact list is empty.')} wrap
          ></Text>
        </div>
      </div>
    {/if}
  </div>

  <div class="footer">
    <WizardButton onclick={onformcancel}>
      {$i18n.t('common.action--cancel', 'Cancel')}
    </WizardButton>

    <WizardButton onclick={onformcontinue}>
      {$i18n.t('common.action--next', 'Next')}
    </WizardButton>
  </div>
</form>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    background-color: var(--t-nav-background-color);
    grid-template:
      'bar' rem(64px)
      '.' rem(8px)
      'search' auto
      'content' auto
      '.' 1fr
      'footer' rem(64px);
    align-content: start;
    overflow: hidden;
    height: 100%;

    .bar {
      grid-area: bar;
      padding: rem(12px) rem(8px);
    }

    .search {
      grid-area: search;
      padding: 0 rem(16px) rem(12px);
    }

    .content {
      grid-area: content;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: start;
      gap: rem(8px);

      .list {
        grid-area: list;
        overflow-y: auto;
      }

      .notice {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--t-text-e2-color);
        margin-top: rem(16px);
        padding: rem(16px);
        user-select: none;

        .text {
          @extend %font-small-400;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: rem(8px);
          font-size: rem(16px);
        }
      }
    }

    .footer {
      grid-area: footer;

      display: flex;
      align-self: stretch;
      align-items: center;
      justify-content: space-between;

      background-color: var(--t-color-primary);
      padding: 0 rem(8px);
    }
  }
</style>
