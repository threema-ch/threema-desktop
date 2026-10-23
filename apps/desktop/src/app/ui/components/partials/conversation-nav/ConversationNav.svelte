<!--
  @component Renders the conversation navigation sidebar.
-->
<script lang="ts">
  import type {u53} from '@threema/ts-utils/integer/u53';
  import {ensureError} from '@threema/ts-utils/meta/ensure-error';
  import {onMount, tick} from 'svelte';

  import {globals} from '~/app/globals';
  import AvailabilityBanner from '~/app/ui/components/atoms/availability-banner/AvailabilityBanner.svelte';
  import SearchBar from '~/app/ui/components/molecules/search-bar/SearchBar.svelte';
  import NavPanelHeader from '~/app/ui/components/organisms/nav-panel-header/NavPanelHeader.svelte';
  import {
    conversationListEvent,
    getContextMenuItems,
  } from '~/app/ui/components/partials/conversation-nav/helpers';
  import type {ConversationNavProps} from '~/app/ui/components/partials/conversation-nav/props';
  import {conversationListItemSetStoreToConversationPreviewListPropsStore} from '~/app/ui/components/partials/conversation-nav/transformers';
  import type {
    ModalState,
    ContextMenuItemHandlerProps,
    RemoteConversationListViewModelStoreValue,
    ConversationPreviewListId,
  } from '~/app/ui/components/partials/conversation-nav/types';
  import ConversationPreviewList from '~/app/ui/components/partials/conversation-preview-list/ConversationPreviewList.svelte';
  import type {ConversationPreviewListItem} from '~/app/ui/components/partials/conversation-preview-list/props';
  import ClearConversationModal from '~/app/ui/components/partials/modals/clear-conversation-modal/ClearConversationModal.svelte';
  import DeleteConversationModal from '~/app/ui/components/partials/modals/delete-conversation-modal/DeleteConversationModal.svelte';
  import DeleteGroupModal from '~/app/ui/components/partials/modals/delete-group-modal/DeleteGroupModal.svelte';
  import SetAvailabilityStatusModal from '~/app/ui/components/partials/modals/set-availability-status-modal/SetAvailabilityStatusModal.svelte';
  import SearchResultList from '~/app/ui/components/partials/search-result-list/SearchResultList.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {MAX_LAZY_CONVERSATION_PREVIEWS} from '~/app/ui/utils/constants';
  import type {ScrollWindow} from '~/app/ui/utils/scroll';
  import {svelteUnreachable, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {WorkAvailabilityStatusCategory} from '~/common/enum';
  import {extractErrorMessage} from '~/common/error';
  import type {WorkAvailabilityStatus} from '~/common/model/types/work-availability-status';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import {hasProperty} from '~/common/utils/object';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';
  import type {ConversationListViewModelBundle} from '~/common/viewmodel/conversation/list';

  const {uiLogging, hotkeyManager} = globals.unwrap();
  const log = uiLogging.logger('ui.component.conversation-nav');

  const {services}: ConversationNavProps = $props();

  let scrollWindow = $state<ScrollWindow>({
    startIndex: 0,
    endIndex: MAX_LAZY_CONVERSATION_PREVIEWS,
  });

  const {backend, router} = services;

  // ViewModelBundle of the current conversation.
  let viewModelStore = $state<
    IQueryableStore<RemoteConversationListViewModelStoreValue | undefined>
  >(new ReadableStore(undefined));
  let viewModelController:
    | Remote<ConversationListViewModelBundle>['viewModelController']
    | undefined = undefined;
  let isViewModelLoaded = $state<boolean>(false);

  let modalState = $state<ModalState>({type: 'none'});

  let searchBarComponent = $state<SvelteNullableBinding<SearchBar>>(null);
  let searchTerm = $state<string | undefined>(undefined);

  let conversationPreviewListComponent =
    $state<SvelteNullableBinding<ConversationPreviewList<ContextMenuItemHandlerProps>>>(null);
  let searchResultListComponent = $state<SvelteNullableBinding<SearchResultList>>(null);

  const workAvailabilityStatusStore = $derived($viewModelStore?.workAvailabilityStatus);
  const workAvailabilityStatus = $derived($workAvailabilityStatusStore);

  function handleHotkeyControlF(): void {
    searchBarComponent?.focusAndSelect();
  }

  async function handleClearSearchBar(): Promise<void> {
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
    // TODO(DESK-1852): Uncomment the following block
    // If this is a left group, deletion means removing it from the database.
    // if (item.receiver.type === 'group' && item.receiver.isLeft) {
    //  modalState = {
    //    type: 'delete-group',
    //    props: {
    //      receiver: {
    //        ...item.receiver,
    //        delete: async () => await props.viewModelBundle.viewModelController.deleteGroup(),
    //      },
    //    },
    //  };
    //  return;
    // }
    //
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

  function handleOpenSetAvailabilityStatusModal(): void {
    // Opening the modal should not be possible if no status is currently set.
    if (workAvailabilityStatus === undefined) {
      return;
    }

    modalState = {
      type: 'set-availability-status',
      props: {
        workAvailabilityStatus,
        onsubmit: async (newWorkAvailabilityStatus: WorkAvailabilityStatus): Promise<void> => {
          await viewModelController?.updateWorkAvailabilityStatus(newWorkAvailabilityStatus);
        },
      },
    };
  }

  function handleItemEntered(id: ConversationPreviewListId): void {
    updateScrollWindow({id});
  }

  function updateScrollWindow(
    anchoredItem:
      | {
          readonly id: ConversationPreviewListId;
        }
      | {
          readonly index: u53;
        },
  ): void {
    let targetIndex: u53 | undefined = undefined;
    if (hasProperty(anchoredItem, 'id')) {
      targetIndex = $conversationPreviewListProps?.items.findIndex(
        (item) => item.get().id === anchoredItem.id,
      );
    } else {
      targetIndex = anchoredItem.index;
    }

    // Do nothing if the index is invalid or the item was not found.
    if (targetIndex === undefined || targetIndex < 0) {
      return;
    }

    // Calculate start and end indices such that `targetIndex` is roughly near the middle of the
    // window.
    const start = Math.max(targetIndex - Math.floor(MAX_LAZY_CONVERSATION_PREVIEWS / 2), 0);
    const end = start + MAX_LAZY_CONVERSATION_PREVIEWS;

    scrollWindow = {
      startIndex: start,
      endIndex: end,
    };
  }

  async function scrollToFirstConversation(): Promise<void> {
    const firstItem = $conversationPreviewListProps?.items.at(0)?.get();
    if (firstItem === undefined) {
      return;
    }

    updateScrollWindow({index: 0});
    try {
      await tick();
      await conversationPreviewListComponent?.scrollToItem(firstItem.id, {
        behavior: 'instant',
        block: 'start',
      });
    } catch (error: unknown) {
      log.error('Error scrolling to top in ConversationNav: ', error);
    }
  }

  async function scrollToConversation(lookup: DbReceiverLookup): Promise<void> {
    let targetItemIndex: u53 | undefined = undefined;
    const targetItem = $conversationPreviewListProps?.items
      .find((item, index) => {
        if (
          item.get().receiver.lookup.type === lookup.type &&
          item.get().receiver.lookup.uid === lookup.uid
        ) {
          targetItemIndex = index;

          return true;
        }

        return false;
      })
      ?.get();
    if (targetItem === undefined || targetItemIndex === undefined) {
      return;
    }

    updateScrollWindow({index: targetItemIndex});
    try {
      await tick();
      await conversationPreviewListComponent?.scrollToItem(targetItem.id, {
        behavior: 'instant',
        block: 'start',
      });
    } catch (error) {
      log.error('ConversationNav: Error scrolling to item: ', error);
    }
  }

  async function scrollToActiveItem(): Promise<void> {
    const routerState = router.get();

    if (routerState.main.id === 'conversation') {
      await scrollToConversation(routerState.main.params.receiverLookup);
    }
  }

  // Current search results.
  const conversationSearchResults = $derived($viewModelStore?.listItemSetStore);
  const conversationPreviewListProps = $derived(
    conversationSearchResults === undefined
      ? undefined
      : conversationListItemSetStoreToConversationPreviewListPropsStore(conversationSearchResults),
  );

  const currentPreviewList = $derived.by(() => {
    if ($conversationPreviewListProps === undefined) {
      return [];
    }
    if ($conversationPreviewListProps.items.length <= MAX_LAZY_CONVERSATION_PREVIEWS) {
      return $conversationPreviewListProps.items;
    }

    return $conversationPreviewListProps.items.slice(
      scrollWindow.startIndex,
      scrollWindow.endIndex,
    );
  });

  onMount(async () => {
    await backend.viewModel
      .conversationList()
      .then((viewModelBundle) => {
        // Replace `viewModelBundle`.
        viewModelStore = viewModelBundle.viewModelStore;
        viewModelController = viewModelBundle.viewModelController;
        isViewModelLoaded = true;
      })
      .catch((error: unknown) => {
        log.error(`Failed to load ConversationListViewModelBundle: ${ensureError(error)}`);

        toast.addSimpleFailure(
          $i18n.t('messaging.error--conversation-list-load', 'Chats could not be loaded'),
        );
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
          scrollToFirstConversation().catch(assertUnreachable);
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
    <NavPanelHeader {services} />
  </div>

  {#if $viewModelStore !== undefined && isViewModelLoaded}
    {#if import.meta.env.BUILD_FLAVOR === 'work-sandbox' || import.meta.env.BUILD_FLAVOR === 'work-live'}
      {#if workAvailabilityStatus !== undefined && workAvailabilityStatus.category !== WorkAvailabilityStatusCategory.NONE}
        <div class="availability">
          <AvailabilityBanner
            align="left"
            description={workAvailabilityStatus.description}
            onEdit={handleOpenSetAvailabilityStatusModal}
            showIcon
            status={workAvailabilityStatus.category}
          ></AvailabilityBanner>
        </div>
      {/if}
    {/if}

    <div class="search">
      <SearchBar
        bind:this={searchBarComponent}
        bind:term={searchTerm}
        onclear={handleClearSearchBar}
        onrequestrefresh={handleRequestRefreshSearchResults}
        placeholder={$i18n.t('search.label--search-input-placeholder', 'Search...')}
      />
    </div>

    <div class="list">
      {#if currentPreviewList.length > 0}
        {#if searchTerm === undefined || searchTerm === ''}
          <ConversationPreviewList
            bind:this={conversationPreviewListComponent}
            contextMenuItems={(item) =>
              getContextMenuItems(item, $i18n, log, handleOpenClearModal, handleOpenDeleteModal)}
            items={currentPreviewList}
            onitementereddebounced={handleItemEntered}
            {services}
          />
        {:else}
          <SearchResultList bind:this={searchResultListComponent} {searchTerm} {services} />
        {/if}
      {:else}
        <!-- No chats. -->
      {/if}
    </div>
  {/if}
</div>

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'clear-conversation'}
  <ClearConversationModal {...modalState.props} onclose={handleCloseModal} />
{:else if modalState.type === 'delete-conversation'}
  <DeleteConversationModal {...modalState.props} onclose={handleCloseModal} />
{:else if modalState.type === 'delete-group'}
  <DeleteGroupModal {...modalState.props} onclose={handleCloseModal} />
{:else if modalState.type === 'set-availability-status'}
  <SetAvailabilityStatusModal {...modalState.props} onclose={handleCloseModal} />
{:else}
  {svelteUnreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    overflow: hidden;
    background-color: var(--t-nav-background-color);
    grid-template:
      'top-bar' min-content
      'search' minmax(rem(64px), min-content)
      'list' 1fr
      / 100%;

    &:has(> .availability) {
      grid-template:
        'top-bar' min-content
        'availability' minmax(rem(64px), min-content)
        '.' rem(8px)
        'search' min-content
        '.' rem(12px)
        'list' 1fr
        / 100%;
    }

    // Logo is present and followed by availability status.
    &:has(> .top-bar:not(:empty) + .availability) {
      grid-template:
        'top-bar' min-content
        '.' rem(8px)
        'availability' min-content
        '.' rem(8px)
        'search' min-content
        '.' rem(12px)
        'list' 1fr
        / 100%;
    }

    // Logo is present and is followed by the search box.
    &:has(> .top-bar:not(:empty) + .search) {
      grid-template:
        'top-bar' min-content
        '.' rem(8px)
        'search' min-content
        '.' rem(12px)
        'list' 1fr
        / 100%;
    }

    .top-bar {
      grid-area: top-bar;
    }

    .availability {
      grid-area: availability;

      display: flex;
      align-items: center;
      justify-content: stretch;
      padding: 0 rem(8px);
    }

    .search {
      grid-area: search;

      display: flex;
      align-items: center;
      justify-content: stretch;
      padding: 0 rem(16px);
    }

    .list {
      grid-area: list;

      overflow-y: auto;
    }
  }
</style>
