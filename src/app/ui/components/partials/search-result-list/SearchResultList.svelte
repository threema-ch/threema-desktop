<!--
  @component
  Renders search results (conversations, messages, and receivers) for a given search term.
-->
<script lang="ts">
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
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
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
      conversations: 5,
      messages: 5,
      receivers: 5,
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
          $i18n,
          searchParams.limits.conversations === undefined
            ? undefined
            : searchParams.limits.conversations - 1,
        );

  $: messageSearchResults = $viewModelStore?.messageSearchResults;
  $: messagePreviewListProps =
    messageSearchResults === undefined
      ? undefined
      : messageSearchResultSetStoreToMessagePreviewListPropsStore(
          messageSearchResults,
          $i18n,
          searchParams.limits.messages === undefined ? undefined : searchParams.limits.messages - 1,
        );

  $: receiverSearchResults = $viewModelStore?.receiverSearchResults;
  $: receiverPreviewListProps =
    receiverSearchResults === undefined
      ? undefined
      : receiverSearchResultSetStoreToReceiverPreviewListPropsStore(
          receiverSearchResults,
          searchParams.limits.receivers === undefined
            ? undefined
            : searchParams.limits.receivers - 1,
        );

  $: isEmpty =
    $conversationPreviewListProps?.items.length === 0 &&
    $messagePreviewListProps?.items.length === 0 &&
    $receiverPreviewListProps?.items.length === 0;

  $: handleChangeSearchTerm(searchTerm);
  $: void handleChangeSearchParams(searchParams);
</script>

<div class="container">
  {#if isEmpty}
    <p class="empty">
      {$i18n.t('search.prose--no-results', 'No results found.')}
    </p>
  {:else}
    {#if $conversationPreviewListProps !== undefined && $conversationPreviewListProps.items.length > 0}
      <div class="section conversations">
        <p class="heading">
          {$i18n.t('search.label--title-conversations', 'Chats')}
        </p>

        <ConversationPreviewList
          {...$conversationPreviewListProps}
          highlights={searchParams.term}
          {services}
        />

        {#if ($conversationSearchResults?.size ?? 0) >= (searchParams.limits.conversations ?? DEFAULT_SEARCH_PARAMS.limits.conversations)}
          <button class="expand" on:click={handleClickSearchMoreConversationsButton}>
            {$i18n.t('search.action--search-more', 'Find more')}

            <span class="icon">
              <MdIcon theme="Outlined">expand_more</MdIcon>
            </span>
          </button>
        {/if}
      </div>
    {/if}

    {#if $messagePreviewListProps !== undefined && $messagePreviewListProps.items.length > 0}
      <div class="section messages">
        <p class="heading">
          {$i18n.t('search.label--title-messages', 'Messages')}
        </p>

        <div class="list">
          <MessagePreviewList
            {...$messagePreviewListProps}
            highlights={searchParams.term}
            {services}
          />
        </div>

        {#if ($messageSearchResults?.size ?? 0) >= (searchParams.limits.messages ?? DEFAULT_SEARCH_PARAMS.limits.messages)}
          <button class="expand" on:click={handleClickSearchMoreMessagesButton}>
            {$i18n.t('search.action--search-more')}

            <span class="icon">
              <MdIcon theme="Outlined">expand_more</MdIcon>
            </span>
          </button>
        {/if}
      </div>
    {/if}

    {#if $receiverPreviewListProps !== undefined && $receiverPreviewListProps.items.length > 0}
      <div class="section receivers">
        <p class="heading">
          {$i18n.t('search.label--title-receivers', 'Contacts & Groups')}
        </p>

        <ReceiverPreviewList
          {...$receiverPreviewListProps}
          highlights={searchParams.term}
          {services}
        />

        {#if ($receiverSearchResults?.size ?? 0) >= (searchParams.limits.receivers ?? DEFAULT_SEARCH_PARAMS.limits.receivers)}
          <button class="expand" on:click={handleClickSearchMoreReceiversButton}>
            {$i18n.t('search.action--search-more')}

            <span class="icon">
              <MdIcon theme="Outlined">expand_more</MdIcon>
            </span>
          </button>
        {/if}
      </div>
    {/if}
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

    .empty {
      color: var(--t-text-e2-color);
      margin: rem(8px) 0 0 0;
      padding: rem(12px) rem(6px) rem(12px) rem(16px);
    }

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
