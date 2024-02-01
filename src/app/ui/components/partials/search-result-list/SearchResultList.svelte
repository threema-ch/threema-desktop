<!--
  @component
  Renders search results (conversations, messages, and receivers) for a given search term.
-->
<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {globals} from '~/app/globals';
  import ConversationPreviewList from '~/app/ui/components/partials/conversation-preview-list/ConversationPreviewList.svelte';
  import MessagePreviewList from '~/app/ui/components/partials/message-preview-list/MessagePreviewList.svelte';
  import ReceiverPreviewList from '~/app/ui/components/partials/receiver-preview-list/ReceiverPreviewList.svelte';
  import type {SearchResultListProps} from '~/app/ui/components/partials/search-result-list/props';
  import {
    conversationSearchResultSetStoreToConversationPreviewListPropsStore,
    messageSearchResultSetStoreToMessagePreviewListPropsStore,
    receiverSearchResultSetStoreToReceiverPreviewListPropsStore,
  } from '~/app/ui/components/partials/search-result-list/transformers';
  import {i18n} from '~/app/ui/i18n';
  import type {Remote} from '~/common/utils/endpoint';
  import {type IQueryableStore, ReadableStore} from '~/common/utils/store';
  import type {SearchViewModelBundle} from '~/common/viewmodel/search/nav';
  import type {SearchParams} from '~/common/viewmodel/search/nav/controller';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.search-result-list');

  type $$Props = SearchResultListProps;

  export let searchTerm: $$Props['searchTerm'] = undefined;
  export let services: $$Props['services'];

  const {
    backend: {viewModel},
  } = services;

  const DEFAULT_SEARCH_PARAMS = {
    term: undefined,
    limits: {
      conversations: 4,
      messages: 4,
      receivers: 4,
    },
  };

  // Contents of `SearchViewModelBundle`.
  let viewModelController: Remote<SearchViewModelBundle>['viewModelController'] | undefined =
    undefined;
  let viewModelStore: IQueryableStore<
    ReturnType<Remote<SearchViewModelBundle>['viewModelStore']['get']> | undefined
  > = new ReadableStore(undefined);

  let searchParams: SearchParams = DEFAULT_SEARCH_PARAMS;

  viewModel
    .search()
    .then((loadedViewModelBundle) => {
      viewModelController = loadedViewModelBundle.viewModelController;
      viewModelStore = loadedViewModelBundle.viewModelStore;
    })
    .catch((error) => {
      log.error('Loading search view model bundle failed', error);
    });

  /**
   * Refresh search results.
   */
  export function refresh(): void {
    void viewModelController?.refresh();
  }

  function handleClickSearchMoreConversationsButton(): void {
    searchParams = {
      ...searchParams,
      limits: {
        ...searchParams.limits,
        conversations:
          (searchParams.limits.conversations ?? DEFAULT_SEARCH_PARAMS.limits.conversations) + 10,
      },
    };
  }

  function handleClickSearchMoreMessagesButton(): void {
    searchParams = {
      ...searchParams,
      limits: {
        ...searchParams.limits,
        messages: (searchParams.limits.messages ?? DEFAULT_SEARCH_PARAMS.limits.messages) + 10,
      },
    };
  }

  function handleClickSearchMoreReceiversButton(): void {
    searchParams = {
      ...searchParams,
      limits: {
        ...searchParams.limits,
        receivers: (searchParams.limits.receivers ?? DEFAULT_SEARCH_PARAMS.limits.receivers) + 10,
      },
    };
  }

  function handleChangeSearchTerm(currentSearchTerm: string | undefined): void {
    if (currentSearchTerm === undefined || currentSearchTerm === '') {
      // Search was cleared, so we set the params back to the default.
      searchParams = DEFAULT_SEARCH_PARAMS;
    } else {
      searchParams = {
        ...searchParams,
        term: currentSearchTerm,
      };
    }
  }

  async function handleChangeSearchParams(
    currentSearchParams: SearchParams | undefined,
  ): Promise<void> {
    if (currentSearchParams === undefined) {
      // Reset search back to defaults to clear the search.
      await viewModelController?.setSearchParams(DEFAULT_SEARCH_PARAMS);
    } else {
      await viewModelController?.setSearchParams(currentSearchParams);
    }
  }

  // Current search results.
  $: conversationSearchResults = $viewModelStore?.conversationSearchResults;
  $: conversationPreviewListProps =
    conversationSearchResults === undefined
      ? undefined
      : conversationSearchResultSetStoreToConversationPreviewListPropsStore(
          conversationSearchResults,
        );

  $: messageSearchResults = $viewModelStore?.messageSearchResults;
  $: messagePreviewListProps =
    messageSearchResults === undefined
      ? undefined
      : messageSearchResultSetStoreToMessagePreviewListPropsStore(messageSearchResults);

  $: receiverSearchResults = $viewModelStore?.receiverSearchResults;
  $: receiverPreviewListProps =
    receiverSearchResults === undefined
      ? undefined
      : receiverSearchResultSetStoreToReceiverPreviewListPropsStore(receiverSearchResults);

  $: handleChangeSearchTerm(searchTerm);
  $: void handleChangeSearchParams(searchParams);
</script>

<div class="container">
  {#if $conversationPreviewListProps !== undefined}
    {@const isEmpty = $conversationPreviewListProps.items.length === 0}

    <div class="section conversations">
      <p class="heading">
        {$i18n.t('search.label--title-conversations', 'Chats')}
      </p>

      {#if isEmpty}
        <p class="empty">
          {$i18n.t(
            'search.label--no-results-conversations',
            'No conversations found for term "{term}".',
            {
              term: searchParams.term,
            },
          )}
        </p>
      {:else}
        <ConversationPreviewList
          {...$conversationPreviewListProps}
          highlights={searchParams.term}
          {services}
        />

        {#if $conversationPreviewListProps.items.length >= (searchParams.limits.conversations ?? DEFAULT_SEARCH_PARAMS.limits.conversations)}
          <button class="expand" on:click={handleClickSearchMoreConversationsButton}>
            {$i18n.t('search.action--search-more', 'Find more')}

            <span class="icon">
              <MdIcon theme="Outlined">expand_more</MdIcon>
            </span>
          </button>
        {/if}
      {/if}
    </div>
  {/if}

  {#if $messagePreviewListProps !== undefined}
    {@const isEmpty = $messagePreviewListProps.items.length === 0}

    <div class="section messages">
      <p class="heading">
        {$i18n.t('search.label--title-messages', 'Messages')}
      </p>

      {#if isEmpty}
        <p class="empty">
          {$i18n.t('search.label--no-results-messages', 'No messages found for term "{term}".', {
            term: searchParams.term,
          })}
        </p>
      {:else}
        <div class="list">
          <MessagePreviewList
            {...$messagePreviewListProps}
            highlights={searchParams.term}
            {services}
          />
        </div>

        {#if $messagePreviewListProps.items.reduce((acc, conversation) => acc + conversation.messages.length, 0) >= (searchParams.limits.messages ?? DEFAULT_SEARCH_PARAMS.limits.messages)}
          <button class="expand" on:click={handleClickSearchMoreMessagesButton}>
            {$i18n.t('search.action--search-more')}

            <span class="icon">
              <MdIcon theme="Outlined">expand_more</MdIcon>
            </span>
          </button>
        {/if}
      {/if}
    </div>
  {/if}

  {#if $receiverPreviewListProps !== undefined}
    {@const isEmpty = $receiverPreviewListProps.items.length === 0}

    <div class="section receivers">
      <p class="heading">
        {$i18n.t('search.label--title-receivers', 'Contacts & Groups')}
      </p>

      {#if isEmpty}
        <p class="empty">
          {$i18n.t(
            'search.label--no-results-receivers',
            'No contacts or groups found for term "{term}".',
            {
              term: searchParams.term,
            },
          )}
        </p>
      {:else}
        <ReceiverPreviewList
          {...$receiverPreviewListProps}
          highlights={searchParams.term}
          {services}
        />

        {#if $receiverPreviewListProps.items.length >= (searchParams.limits.receivers ?? DEFAULT_SEARCH_PARAMS.limits.receivers)}
          <button class="expand" on:click={handleClickSearchMoreReceiversButton}>
            {$i18n.t('search.action--search-more')}

            <span class="icon">
              <MdIcon theme="Outlined">expand_more</MdIcon>
            </span>
          </button>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;
    min-width: 0;
    max-width: 100%;
    min-height: 0;
    max-height: 100%;
    overflow-x: hidden;
    overflow-y: scroll;

    .section {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: start;
      padding: rem(16px) 0 rem(12px) 0;

      .heading {
        font-size: rem(16px);
        font-weight: 400;
        margin: 0;
        padding: 0 rem(4px) rem(16px) rem(16px);
      }

      .empty {
        color: var(--t-text-e2-color);
        margin: rem(8px) 0 0 0;
        padding: rem(12px) rem(6px) rem(12px) rem(16px);
      }

      .expand {
        @include clicktarget-button-rect;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: rem(12px);

        color: var(--t-text-e2-color);
        margin: rem(8px) 0 0 0;
        padding: rem(12px) 0;

        .icon {
          --c-icon-font-size: #{rem(24px)};
          display: grid;
          place-items: center;
          color: var(--t-color-primary);
        }

        &:hover {
          background-color: var(--ic-list-element-background-color--hover);
        }
      }

      &:not(:last-child) {
        margin-bottom: rem(8px);
        border-bottom: 1px solid var(--ic-divider-background-color);
      }

      &.messages {
        .heading {
          padding-bottom: rem(4px);
        }

        .list {
          padding: 0 rem(6px) rem(12px) rem(16px);
        }
      }
    }
  }
</style>
