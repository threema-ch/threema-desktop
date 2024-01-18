<script lang="ts">
  import {onMount} from 'svelte';

  import type {AppServices} from '~/app/types';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import ClearConversationModal from '~/app/ui/components/partials/modals/clear-conversation-modal/ClearConversationModal.svelte';
  import type {ClearConversationModalProps} from '~/app/ui/components/partials/modals/clear-conversation-modal/props';
  import {contextMenuAction} from '~/app/ui/generic/context-menu';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {VirtualRect} from '~/app/ui/generic/popover/types';
  import {SwipeAreaGroup} from '~/app/ui/generic/swipe-area';
  import {i18n} from '~/app/ui/i18n';
  import {conversationListEvent, conversationPreviewListFilter} from '~/app/ui/nav/conversation';
  import ConversationNavElement from '~/app/ui/nav/conversation/ConversationNavElement.svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {scrollToCenterOfView} from '~/common/dom/utils/element';
  import {ConversationVisibility} from '~/common/enum';
  import type {Conversation, RemoteModelFor} from '~/common/model';
  import type {u53} from '~/common/types';
  import {unreachable, unwrap} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import type {SetValue} from '~/common/utils/set';
  import type {IQueryableStoreValue} from '~/common/utils/store';
  import {derive} from '~/common/utils/store/derived-store';
  import type {
    ConversationPreviewItem,
    ConversationPreviewSetStore,
  } from '~/common/viewmodel/conversation-preview';
  import type {SvelteAction} from '~/common/viewmodel/types';

  /**
   * Set store of all conversation previews.
   */
  export let conversationPreviews: Remote<ConversationPreviewSetStore>;
  export let services: AppServices;

  const {backend, router} = services;

  type ModalState = NoneModalState | ClearConversationModalState;

  interface NoneModalState {
    readonly type: 'none';
  }

  interface ClearConversationModalState {
    readonly type: 'clear-conversation';
    readonly props: ClearConversationModalProps;
  }

  const group = new SwipeAreaGroup();

  let conversationPreviewList: HTMLDivElement;

  // Context menu
  let contextMenuPopover: Popover | null;
  let contextMenuPosition: VirtualRect | undefined;
  let currentPreview: SetValue<IQueryableStoreValue<typeof conversationPreviews>> | undefined;
  $: currentPreviewViewModelStore = currentPreview?.viewModel;
  let currentPreviewConversationModel: RemoteModelFor<Conversation> | undefined;
  $: void updateCurrentPreviewConversationModel($currentPreviewViewModelStore);
  let currentPreviewTotalMessageCount: u53 = 0;
  $: void updateCurrentPreviewTotalMessageCount(currentPreviewConversationModel);

  let modalState: ModalState = {type: 'none'};

  // Determine whether scroll snapping anchor is active.
  let anchorActive = true;

  function handleClickItem(): void {
    contextMenuPopover?.close();
  }

  function handleCloseModal(): void {
    modalState = {
      type: 'none',
    };
  }

  async function updateCurrentPreviewConversationModel(
    currentPreviewItem?: Remote<ConversationPreviewItem>,
  ): Promise<void> {
    const currentReceiverLookup = currentPreviewItem?.receiverLookup;
    if (currentReceiverLookup === undefined) {
      currentPreviewConversationModel = undefined;
      return;
    }

    const conversationModelStore =
      await backend.model.conversations.getForReceiver(currentReceiverLookup);
    if (conversationModelStore === undefined) {
      currentPreviewConversationModel = undefined;
      return;
    }

    currentPreviewConversationModel = conversationModelStore.get();
  }

  async function updateCurrentPreviewTotalMessageCount(
    previewConversationModel: typeof currentPreviewConversationModel,
  ): Promise<void> {
    currentPreviewTotalMessageCount =
      (await previewConversationModel?.controller.getMessageCount()) ?? 0;
  }

  function handleClickEmptyChatOption(): void {
    if ($currentPreviewViewModelStore === undefined) {
      return;
    }
    if (currentPreviewConversationModel === undefined) {
      return;
    }

    modalState = {
      type: 'clear-conversation',
      props: {
        conversation: {
          clear: async () => {
            await currentPreviewConversationModel?.controller.removeAllMessages.fromLocal();
          },
          totalMessagesCount: currentPreviewTotalMessageCount,
        },
        receiver: {
          type: $currentPreviewViewModelStore.receiver.type,
          name: $currentPreviewViewModelStore.receiver.displayName,
        },
      },
    };
  }

  async function handleClickPinOrUnpinOption(): Promise<void> {
    if (currentPreviewConversationModel === undefined) {
      return;
    }

    if (currentPreviewConversationModel.view.visibility === ConversationVisibility.PINNED) {
      await currentPreviewConversationModel.controller.updateVisibility.fromLocal(
        ConversationVisibility.SHOW,
      );
    } else {
      await currentPreviewConversationModel.controller.updateVisibility.fromLocal(
        ConversationVisibility.PINNED,
      );
    }
  }

  async function handleClickArchiveOrUnarchiveOption(): Promise<void> {
    if (currentPreviewConversationModel === undefined) {
      return;
    }

    if (currentPreviewConversationModel.view.visibility === ConversationVisibility.ARCHIVED) {
      await currentPreviewConversationModel.controller.updateVisibility.fromLocal(
        ConversationVisibility.SHOW,
      );
    } else {
      await currentPreviewConversationModel.controller.updateVisibility.fromLocal(
        ConversationVisibility.ARCHIVED,
      );
    }
  }

  /**
   * Detect and switch if the scroll snapping anchor should be active based on element visibility.
   */
  function scrollSnap(node: HTMLElement): SvelteAction {
    // Make sure that the scroll anchor is initially visible if active
    if (anchorActive) {
      scrollToCenterOfView(node);
    }

    // Activate scroll anchor if it is visible in the viewport and vice versa
    const observer = new IntersectionObserver(([entry]) => {
      anchorActive = unwrap(entry).isIntersecting;
    });
    observer.observe(node);

    return {
      destroy: () => {
        observer.disconnect();
      },
    };
  }

  // Filter and sort all conversation preview models
  const conversationPreviewListStore = derive(
    conversationPreviews,
    (conversationsSet, getAndSubscribe) => {
      const sortedConversations = [...conversationsSet]
        .filter((conversationPreviewModel) => {
          const {lastUpdate} = getAndSubscribe(conversationPreviewModel.viewModel);
          return lastUpdate !== undefined;
        })
        .filter((conversationPreviewModel) => {
          const filterText = getAndSubscribe(conversationPreviewListFilter).trim().toLowerCase();

          if (filterText === '') {
            return true;
          }

          const viewModel = getAndSubscribe(conversationPreviewModel.viewModel);
          const receiver = viewModel.receiver;

          // Get text/caption of last conversation message (if there is any).
          let lastMessageText = '';
          if (viewModel.lastMessage !== undefined) {
            const lastMessageModel = getAndSubscribe(viewModel.lastMessage.viewModelStore);
            lastMessageText = lastMessageModel.text?.raw ?? lastMessageText;
          }

          return [receiver.displayName, lastMessageText].some((text) =>
            text.toLowerCase().includes(filterText),
          );
        })
        .sort((a, b) => {
          // Unwrap is okay as we filter out entries without lastUpdate
          const aViewModel = getAndSubscribe(a.viewModel);
          const bViewModel = getAndSubscribe(b.viewModel);

          // Move pinned conversation to top
          const aIsPinned = aViewModel.visibility === ConversationVisibility.PINNED;
          const bIsPinned = bViewModel.visibility === ConversationVisibility.PINNED;
          if (aIsPinned && !bIsPinned) {
            return -1;
          }
          if (!aIsPinned && bIsPinned) {
            return 1;
          }

          // Move archived conversation to bottom
          const aIsArchived = aViewModel.visibility === ConversationVisibility.ARCHIVED;
          const bIsArchived = bViewModel.visibility === ConversationVisibility.ARCHIVED;
          if (aIsArchived && !bIsArchived) {
            return 1;
          }
          if (!aIsArchived && bIsArchived) {
            return -1;
          }

          // Sort by lastUpdate
          const aTime = unwrap(aViewModel.lastUpdate).getTime();
          const bTime = unwrap(bViewModel.lastUpdate).getTime();
          return bTime - aTime;
        });

      return sortedConversations;
    },
  );

  onMount(() => {
    // Process conversation list events
    conversationListEvent.attach((eventType) => {
      switch (eventType.action) {
        case 'scroll-to-top':
          conversationPreviewList.scrollTop = 0;
          break;
        case 'scroll-to-receiver':
          scrollConversationPreviewIntoView(eventType.receiverLookup);
          break;
        default:
          unreachable(eventType);
      }
    });

    scrollToActiveConversation();

    return () => conversationListEvent.detach();
  });

  const nodesByReceiverLookup: Record<
    `${DbReceiverLookup['type']}:${DbReceiverLookup['uid']}`,
    HTMLElement
  > = {};

  /**
   * Scroll list to bring the currently active conversation into view.
   */
  export function scrollToActiveConversation(): void {
    if ($router.main.id === 'conversation') {
      const receiverLookup = $router.main.params.receiverLookup;
      conversationListEvent.post({action: 'scroll-to-receiver', receiverLookup});
    }
  }

  function rememberNodeForReceiver(node: HTMLElement, receiverLookup: DbReceiverLookup): void {
    nodesByReceiverLookup[`${receiverLookup.type}:${receiverLookup.uid}`] = node;
  }

  function scrollConversationPreviewIntoView(receiverLookup: DbReceiverLookup): void {
    const conversationPreviewNode =
      nodesByReceiverLookup[`${receiverLookup.type}:${receiverLookup.uid}`];
    if (conversationPreviewNode !== undefined) {
      // TODO(DESK-800): Once the ConversationPreview uses the viewModel and nothing is loaded
      // asynchronously the setTimeout below can be removed. In fact, probably the whole
      // rememberNodeForReceiver mechanism can be avoided and scrollConversationPreviewIntoView can
      // be directly `use:`ed in the `div.conversation-preview`, similarly to how it is done
      // in {@link ContactList} and {@link GroupList}.
      setTimeout(() => scrollToCenterOfView(conversationPreviewNode), 100);
    }
  }
</script>

<div class="conversation-preview-list" bind:this={conversationPreviewList}>
  <div class="anchor" use:scrollSnap />

  {#each $conversationPreviewListStore as conversationPreview (conversationPreview.conversationStore.id)}
    <div
      class="conversation-preview"
      class:snap={anchorActive}
      use:rememberNodeForReceiver={conversationPreview.viewModel.get().receiverLookup}
      use:contextMenuAction={(event) => {
        event.preventDefault();
        currentPreview = conversationPreview;
        contextMenuPosition = {
          left: event.clientX,
          right: 0,
          top: event.clientY,
          bottom: 0,
          width: 0,
          height: 0,
        };
        contextMenuPopover?.open(event);
      }}
    >
      <ContextMenuProvider
        bind:popover={contextMenuPopover}
        container={conversationPreviewList}
        reference={contextMenuPosition}
        anchorPoints={{
          reference: {
            horizontal: 'left',
            vertical: 'bottom',
          },
          popover: {
            horizontal: 'left',
            vertical: 'top',
          },
        }}
        triggerBehavior="none"
        items={[
          {
            disabled: $currentPreviewViewModelStore?.lastMessage === undefined,
            handler: handleClickEmptyChatOption,
            label: $i18n.t('messaging.action--empty-conversation'),
            icon: {
              name: 'delete_sweep',
            },
          },
          {
            handler: handleClickPinOrUnpinOption,
            label:
              currentPreviewConversationModel?.view.visibility === ConversationVisibility.PINNED
                ? $i18n.t('messaging.action--conversation-option-unpin')
                : $i18n.t('messaging.action--conversation-option-pin'),
            icon: {
              name: 'push_pin',
            },
          },
          {
            handler: handleClickArchiveOrUnarchiveOption,
            label:
              currentPreviewConversationModel?.view.visibility === ConversationVisibility.ARCHIVED
                ? $i18n.t('messaging.action--conversation-option-unarchive')
                : $i18n.t('messaging.action--conversation-option-archive'),
            icon: {
              name:
                currentPreviewConversationModel?.view.visibility === ConversationVisibility.ARCHIVED
                  ? 'unarchive'
                  : 'archive',
            },
          },
        ]}
        on:clickitem={handleClickItem}
        on:clickoutside={() => {
          currentPreview = undefined;
        }}
      >
        <ConversationNavElement active={false} {conversationPreview} {group} {services} />
      </ContextMenuProvider>
    </div>
  {/each}
</div>

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'clear-conversation'}
  <ClearConversationModal {...modalState.props} on:close={handleCloseModal} />
{:else}
  {unreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .conversation-preview-list {
    overflow-y: auto;
    overflow-x: hidden;
    scroll-snap-type: y mandatory;

    .anchor {
      height: 1px;
    }

    .conversation-preview {
      &.snap {
        &:first-child {
          scroll-snap-align: start;
        }
      }
    }
  }
</style>
