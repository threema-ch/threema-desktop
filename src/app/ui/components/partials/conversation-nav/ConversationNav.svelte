<!--
  @component Renders the conversation navigation sidebar.
-->
<script lang="ts">
  import {onMount, tick} from 'svelte';

  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import SearchBar from '~/app/ui/components/molecules/search-bar/SearchBar.svelte';
  import {
    conversationListEvent,
    getContextMenuItems,
  } from '~/app/ui/components/partials/conversation-nav/helpers';
  import TopBar from '~/app/ui/components/partials/conversation-nav/internal/top-bar/TopBar.svelte';
  import type {ConversationNavProps} from '~/app/ui/components/partials/conversation-nav/props';
  import {conversationListItemSetStoreToConversationPreviewListPropsStore} from '~/app/ui/components/partials/conversation-nav/transformers';
  import type {
    ModalState,
    ContextMenuItemHandlerProps,
    RemoteConversationListViewModelStoreValue,
    RemoteProfileViewModelStoreValue,
  } from '~/app/ui/components/partials/conversation-nav/types';
  import ConversationPreviewList from '~/app/ui/components/partials/conversation-preview-list/ConversationPreviewList.svelte';
  import type {ConversationPreviewListItem} from '~/app/ui/components/partials/conversation-preview-list/props';
  import ClearConversationModal from '~/app/ui/components/partials/modals/clear-conversation-modal/ClearConversationModal.svelte';
  import DeleteConversationModal from '~/app/ui/components/partials/modals/delete-conversation-modal/DeleteConversationModal.svelte';
  import SearchResultList from '~/app/ui/components/partials/search-result-list/SearchResultList.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {scrollIntoViewIfNeededAsync} from '~/app/ui/utils/scroll';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {extractErrorMessage} from '~/common/error';
  import {DEFAULT_CATEGORY} from '~/common/settings';
  import {ensureError, unreachable} from '~/common/utils/assert';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';

  const {uiLogging, hotkeyManager} = globals.unwrap();
  const log = uiLogging.logger('ui.component.conversation-nav');

  type $$Props = ConversationNavProps;

  export let services: $$Props['services'];

  const {backend, router} = services;

  // ViewModelBundle of the current conversation.
  let viewModelStore: IQueryableStore<RemoteConversationListViewModelStoreValue | undefined> =
    new ReadableStore(undefined);

  let profileViewModelStore: IQueryableStore<RemoteProfileViewModelStoreValue | undefined> =
    new ReadableStore(undefined);

  let modalState: ModalState = {type: 'none'};

  let searchBarComponent: SvelteNullableBinding<SearchBar> = null;
  let searchTerm: string | undefined = undefined;

  let conversationPreviewListComponent: SvelteNullableBinding<
    ConversationPreviewList<ContextMenuItemHandlerProps>
  > = null;
  let searchResultListComponent: SvelteNullableBinding<SearchResultList> = null;

  let listElement: SvelteNullableBinding<HTMLElement> = null;

  function handleHotkeyControlF(): void {
    searchBarComponent?.focusAndSelect();
  }

  function handleClickContactListButton(): void {
    router.go({nav: ROUTE_DEFINITIONS.nav.contactList.withoutParams()});
  }

  function handleClickProfilePicture(): void {
    router.goToSettings({category: DEFAULT_CATEGORY});
  }

  function handleClickSettingsButton(): void {
    router.goToSettings({category: DEFAULT_CATEGORY});
  }

  async function handleClearSearchBar(): Promise<void> {
    /*
     * Wait for any pending state changes to be applied before scrolling to the active conversation,
     * because it might not be rendered before that (e.g., if a filter has been applied).
     */
    await tick();
    await scrollToActiveItem();
  }

  function handleRequestRefreshSearchResults(): void {
    searchResultListComponent?.refresh();
  }

  function handleCloseModal(): void {
    modalState = {
      type: 'none',
    };
  }

  function handleOpenClearModal(
    item: ConversationPreviewListItem<ContextMenuItemHandlerProps>,
    props: ContextMenuItemHandlerProps,
  ): void {
    modalState = {
      type: 'clear-conversation',
      props: {
        conversation: {
          clear: async () => {
            await props.viewModelBundle.viewModelController.clear().catch((error: unknown) => {
              log.error(
                `Clearing conversation failed: ${extractErrorMessage(ensureError(error), 'short')}`,
              );
            });
          },
          totalMessagesCount: item.totalMessageCount,
        },
        receiver: item.receiver,
      },
    };
  }

  function handleOpenDeleteModal(
    item: ConversationPreviewListItem<ContextMenuItemHandlerProps>,
    props: ContextMenuItemHandlerProps,
  ): void {
    modalState = {
      type: 'delete-conversation',
      props: {
        conversation: {
          delete: async () => {
            await props.viewModelBundle.viewModelController.delete().catch((error: unknown) => {
              log.error(
                `Deleting conversation failed: ${extractErrorMessage(ensureError(error), 'short')}`,
              );
            });

            // In case the conversation is open, we need to route back to welcome.
            if (
              $router.main.id === 'conversation' &&
              $router.main.params.receiverLookup.type === item.receiver.lookup.type &&
              $router.main.params.receiverLookup.uid === item.receiver.lookup.uid
            ) {
              router.goToWelcome();
            }
          },
        },
        receiver: item.receiver,
      },
    };
  }

  function scrollToTop(): void {
    listElement?.scrollTo({
      behavior: 'instant',
      top: 0,
    });
  }

  async function scrollToItem(lookup: DbReceiverLookup): Promise<void> {
    await scrollIntoViewIfNeededAsync({
      container: listElement,
      element: listElement?.querySelector(`ul > li[data-receiver="${lookup.type}.${lookup.uid}"]`),
      options: {
        behavior: 'instant',
        block: 'start',
      },
      timeoutMs: 100,
    }).catch((error: unknown) => {
      log.info(`Scroll to conversation was not performed: ${error}`);
    });
  }

  async function scrollToActiveItem(): Promise<void> {
    const routerState = router.get();

    if (routerState.main.id === 'conversation') {
      await scrollToItem(routerState.main.params.receiverLookup);
    }
  }

  // Current search results.
  $: conversationSearchResults = $viewModelStore?.listItemSetStore;
  $: conversationPreviewListProps =
    conversationSearchResults === undefined
      ? undefined
      : conversationListItemSetStoreToConversationPreviewListPropsStore(
          conversationSearchResults,
          $i18n,
        );

  onMount(async () => {
    await backend.viewModel
      .conversationList()
      .then((viewModelBundle) => {
        // Replace `viewModelBundle`.
        viewModelStore = viewModelBundle.viewModelStore;
      })
      .catch((error: unknown) => {
        log.error(`Failed to load ConversationListViewModelBundle: ${ensureError(error)}`);

        toast.addSimpleFailure(
          i18n.get().t('messaging.error--conversation-list-load', 'Chats could not be loaded'),
        );
      });

    await backend.viewModel
      .profile()
      .then((store) => {
        // Replace `profileViewModelStore`.
        profileViewModelStore = store;
      })
      .catch((error: unknown) => {
        log.error(`Failed to load ProfileViewModel: ${ensureError(error)}`);
      });

    await scrollToActiveItem();
  });

  onMount(() => {
    hotkeyManager.registerHotkey({control: true, code: 'KeyF'}, handleHotkeyControlF);

    return () => {
      hotkeyManager.unregisterHotkey(handleHotkeyControlF);
    };
  });

  onMount(() => {
    // Process conversation nav events.
    conversationListEvent.attach((eventType) => {
      switch (eventType.action) {
        case 'scroll-to-top':
          scrollToTop();
          break;

        default:
          unreachable(eventType.action);
      }
    });

    return () => conversationListEvent.detach();
  });
</script>

<div class="container">
  <div class="top-bar">
    <!-- eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -->
    {#if $profileViewModelStore !== undefined}
      <TopBar
        profilePicture={$profileViewModelStore.profilePicture}
        initials={$profileViewModelStore.initials}
        on:clickcontactlistbutton={handleClickContactListButton}
        on:clickprofilepicture={handleClickProfilePicture}
        on:clicksettingsbutton={handleClickSettingsButton}
      />
    {/if}
  </div>

  <div class="search">
    <SearchBar
      bind:this={searchBarComponent}
      bind:term={searchTerm}
      onRequestRefresh={handleRequestRefreshSearchResults}
      placeholder={$i18n.t('search.label--search-input-placeholder', 'Search...')}
      on:clear={handleClearSearchBar}
    />
  </div>

  <div bind:this={listElement} class="list">
    {#if $conversationPreviewListProps !== undefined && $conversationPreviewListProps.items.length > 0}
      {#if searchTerm === undefined || searchTerm === ''}
        <ConversationPreviewList
          bind:this={conversationPreviewListComponent}
          contextMenuItems={(item) =>
            getContextMenuItems(item, $i18n, log, handleOpenClearModal, handleOpenDeleteModal)}
          {...$conversationPreviewListProps}
          {services}
        />
      {:else}
        <SearchResultList bind:this={searchResultListComponent} {searchTerm} {services} />
      {/if}
    {:else}
      <!-- No chats. -->
    {/if}
  </div>
</div>

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'clear-conversation'}
  <ClearConversationModal {...modalState.props} on:close={handleCloseModal} />
{:else if modalState.type === 'delete-conversation'}
  <DeleteConversationModal {...modalState.props} on:close={handleCloseModal} />
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
      'top-bar' rem(64px)
      'search' rem(52px)
      'list' 1fr
      / 100%;

    .top-bar {
      grid-area: top-bar;

      padding: rem(12px) rem(8px) rem(16px) rem(16px);
    }

    .search {
      grid-area: search;

      padding: 0 rem(16px) rem(12px);
    }

    .list {
      grid-area: list;

      overflow-y: auto;
    }
  }
</style>
