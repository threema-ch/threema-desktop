<script lang="ts">
  import {onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import type {AppServices} from '~/app/types';
  import {contextMenuAction} from '~/app/ui/generic/context-menu';
  import type {VirtualRect} from '~/app/ui/generic/popover';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {SwipeAreaGroup} from '~/app/ui/generic/swipe-area';
  import {conversationListEvent} from '~/app/ui/main/conversation/index';
  import ConversationTopBarContextMenu from '~/app/ui/main/conversation/top-bar/ConversationTopBarContextMenu.svelte';
  import ConversationEmptyConfirmationDialog from '~/app/ui/modal/ConversationEmptyConfirmation.svelte';
  import {conversationPreviewListFilter} from '~/app/ui/nav/conversation';
  import ConversationNavElement from '~/app/ui/nav/conversation/ConversationNavElement.svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {scrollToCenterOfView} from '~/common/dom/utils/element';
  import {ConversationVisibility} from '~/common/enum';
  import {unreachable, unwrap} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import type {SetValue} from '~/common/utils/set';
  import type {IQueryableStoreValue} from '~/common/utils/store';
  import {derive} from '~/common/utils/store/derived-store';
  import type {ConversationPreviewSetStore} from '~/common/viewmodel/conversation-preview';
  import type {SvelteAction} from '~/common/viewmodel/types';

  const log = globals.unwrap().uiLogging.logger('ui.component.conversation-nav-list');

  /**
   * Set store of all conversation previews.
   */
  export let conversationPreviews: Remote<ConversationPreviewSetStore>;
  export let services: AppServices;

  const {router} = services;

  const group = new SwipeAreaGroup();

  let conversationPreviewList: HTMLDivElement;
  // Context menu
  let contextMenuPopover: Popover | null;
  let contextMenuPosition: VirtualRect | undefined;
  let currentPreview: SetValue<IQueryableStoreValue<typeof conversationPreviews>> | undefined;
  $: currentPreviewViewModelStore = currentPreview?.viewModel;
  // Determine whether scroll snapping anchor is active.
  let anchorActive = true;

  // Delete all messages dialogue
  let isConversationEmptyDialogVisible = false;

  // Message count is calculated when needed by delete dialog
  let conversationMessageCount = 0;

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

          // Get text/caption of last conversation message (if there is any)
          let lastMessageText = '';
          if (viewModel.lastMessage !== undefined) {
            const lastMessageModel = getAndSubscribe(viewModel.lastMessage.messageStore);
            switch (lastMessageModel.type) {
              case 'text':
                lastMessageText = lastMessageModel.view.text;
                break;

              case 'file':
              case 'image':
              case 'video':
              case 'audio':
                lastMessageText = lastMessageModel.view.caption ?? '';
                break;

              default:
                unreachable(lastMessageModel);
            }
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

  function confirmEmptyConversationAction(): void {
    contextMenuPopover?.close();
    currentPreview?.conversationStore
      .get()
      .controller.getMessageCount()
      .then((messagesCount) => {
        conversationMessageCount = messagesCount;
      })
      .catch((error) => {
        log.error('Failed to fetch conversation messages', error);

        conversationMessageCount = 0;
      });
    isConversationEmptyDialogVisible = true;
  }

  function deleteAllConversationMessages(): void {
    currentPreview?.conversationStore
      .get()
      .controller.removeAllMessages.fromLocal()
      .catch((error) => log.error('Could not remove messages from conversation', error));
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

  function setConversationVisibility(newVisibility: ConversationVisibility): void {
    currentPreview?.conversationStore
      .get()
      .controller.updateVisibility.fromLocal(newVisibility)
      .catch((error) => log.error('Could not change chat visibility', error));

    contextMenuPopover?.close();
  }
</script>

<template>
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
        <ConversationNavElement active={false} {conversationPreview} {group} {services} />
      </div>
    {/each}
  </div>
  <Popover
    bind:this={contextMenuPopover}
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
    on:clickoutside={() => {
      currentPreview = undefined;
    }}
  >
    <div slot="popover">
      {#if currentPreviewViewModelStore !== undefined}
        {@const currentPreviewModel = $currentPreviewViewModelStore}
        {#if currentPreviewModel !== undefined}
          <ConversationTopBarContextMenu
            isConversationEmptyActionEnabled={currentPreviewModel.lastMessage !== undefined}
            conversationVisibility={currentPreviewModel.visibility}
            on:emptyConversationActionClicked={confirmEmptyConversationAction}
            on:setConversationVisibility={(event) => setConversationVisibility(event.detail)}
          />
        {/if}
      {/if}
    </div>
  </Popover>
  {#if currentPreviewViewModelStore !== undefined}
    {@const currentPreviewModel = $currentPreviewViewModelStore}
    {#if currentPreviewModel !== undefined}
      <ConversationEmptyConfirmationDialog
        bind:visible={isConversationEmptyDialogVisible}
        receiverName={currentPreviewModel.receiver.displayName}
        receiverType={currentPreviewModel.receiver.type}
        {conversationMessageCount}
        on:confirm={deleteAllConversationMessages}
      />
    {/if}
  {/if}
</template>

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
