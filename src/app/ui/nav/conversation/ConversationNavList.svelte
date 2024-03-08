<script lang="ts">
  import {onMount} from 'svelte';

  import type {AppServices} from '~/app/types';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import ClearConversationModal from '~/app/ui/components/partials/modals/clear-conversation-modal/ClearConversationModal.svelte';
  import type {ClearConversationModalProps} from '~/app/ui/components/partials/modals/clear-conversation-modal/props';
  import DeleteConversationModal from '~/app/ui/components/partials/modals/delete-conversation-modal/DeleteConversationModal.svelte';
  import type {DeleteConversationModalProps} from '~/app/ui/components/partials/modals/delete-conversation-modal/props';
  import {contextMenuAction} from '~/app/ui/generic/context-menu';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {VirtualRect} from '~/app/ui/generic/popover/types';
  import {SwipeAreaGroup} from '~/app/ui/generic/swipe-area';
  import {i18n} from '~/app/ui/i18n';
  import {conversationListEvent, conversationPreviewListFilter} from '~/app/ui/nav/conversation';
  import ConversationNavElement from '~/app/ui/nav/conversation/ConversationNavElement.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {scrollToCenterOfView} from '~/common/dom/utils/element';
  import {ConversationVisibility} from '~/common/enum';
  import type {Conversation, RemoteModelFor} from '~/common/model';
  import {conversationCompareFn} from '~/common/model/utils/conversation';
  import type {u53} from '~/common/types';
  import {assertUnreachable, unreachable, unwrap} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import type {SetValue} from '~/common/utils/set';
  import type {IQueryableStoreValue} from '~/common/utils/store';
  import {derive} from '~/common/utils/store/derived-store';
  import {TIMER} from '~/common/utils/timer';
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

  type ModalState = NoneModalState | ClearConversationModalState | DeleteConversationModalState;

  interface NoneModalState {
    readonly type: 'none';
  }

  interface ClearConversationModalState {
    readonly type: 'clear-conversation';
    readonly props: ClearConversationModalProps;
  }

  interface DeleteConversationModalState {
    readonly type: 'delete-conversation';
    readonly props: DeleteConversationModalProps;
  }

  const group = new SwipeAreaGroup();

  let conversationPreviewList: HTMLDivElement;

  // Context menu
  let contextMenuPopovers: SvelteNullableBinding<Popover>[] = [];

  let contextMenuPosition: VirtualRect | undefined;
  let currentPreview: SetValue<IQueryableStoreValue<typeof conversationPreviews>> | undefined;
  $: currentPreviewViewModelStore = currentPreview?.viewModel;
  let currentPreviewConversationModel: RemoteModelFor<Conversation> | undefined;
  $: updateCurrentPreviewConversationModel($currentPreviewViewModelStore).catch(assertUnreachable);
  let currentPreviewTotalMessageCount: u53 = 0;
  $: updateCurrentPreviewTotalMessageCount(currentPreviewConversationModel).catch(
    assertUnreachable,
  );

  $: contextMenuPopovers = new Array<Popover>($conversationPreviewListStore.length);

  let modalState: ModalState = {type: 'none'};

  // Determine whether scroll snapping anchor is active.
  let anchorActive = true;

  function handleClickItem(index: u53): void {
    contextMenuPopovers[index]?.close();
  }

  function handleCloseModal(): void {
    modalState = {
      type: 'none',
    };
  }

  function handleConversationDeleted(receiverLookup: DbReceiverLookup): void {
    // In case the conversation is open, we need to route away.
    if (
      $router.main.id === 'conversation' &&
      $router.main.params.receiverLookup.type === receiverLookup.type &&
      $router.main.params.receiverLookup.uid === receiverLookup.uid
    ) {
      router.goToWelcome();
    }
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

  function handleClickDeleteChat(): void {
    if ($currentPreviewViewModelStore === undefined) {
      return;
    }
    if (currentPreviewConversationModel === undefined) {
      return;
    }

    modalState = {
      type: 'delete-conversation',
      props: {
        conversation: {
          delete: async () => {
            await backend.model.conversations.softDeleteByUid(
              unwrap(currentPreviewConversationModel).ctx,
            );
          },
        },
        receiver: {
          type: $currentPreviewViewModelStore.receiver.type,
          name: $currentPreviewViewModelStore.receiver.displayName,
          lookup: $currentPreviewViewModelStore.receiverLookup,
        },
      },
    };
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
        .sort((a, b) =>
          conversationCompareFn(getAndSubscribe(a.viewModel), getAndSubscribe(b.viewModel)),
        );

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
      // TODO(DESK-1261): Once the ConversationPreview uses the viewModel and nothing is loaded
      // asynchronously the timeout below can be removed. In fact, probably the whole
      // rememberNodeForReceiver mechanism can be avoided and scrollConversationPreviewIntoView can
      // be directly `use:`ed in the `div.conversation-preview`, similarly to how it is done in
      // {@link ContactList} and {@link GroupList}.
      TIMER.timeout(() => scrollToCenterOfView(conversationPreviewNode), 100);
    }
  }
</script>

<div class="conversation-preview-list" bind:this={conversationPreviewList}>
  <div class="anchor" use:scrollSnap />
  {#key contextMenuPopovers}
    {#each $conversationPreviewListStore as conversationPreview, index (conversationPreview.conversationStore.id)}
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
          contextMenuPopovers[index]?.open(event);
        }}
      >
        <ContextMenuProvider
          bind:popover={contextMenuPopovers[index]}
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
                  currentPreviewConversationModel?.view.visibility ===
                  ConversationVisibility.ARCHIVED
                    ? 'unarchive'
                    : 'archive',
              },
            },
            {
              handler: handleClickDeleteChat,
              label: $i18n.t('messaging.action--conversation-option-delete', 'Delete'),
              icon: {
                name: 'delete_forever',
              },
            },
          ]}
          on:clickitem={() => handleClickItem(index)}
          on:clickoutside={() => {
            currentPreview = undefined;
          }}
        >
          <ConversationNavElement active={false} {conversationPreview} {group} {services} />
        </ContextMenuProvider>
      </div>
    {/each}
  {/key}
</div>

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'clear-conversation'}
  <ClearConversationModal {...modalState.props} on:close={handleCloseModal} />
{:else if modalState.type === 'delete-conversation'}
  <DeleteConversationModal
    {...modalState.props}
    on:close={handleCloseModal}
    on:afterdeleteconversation={(event) => handleConversationDeleted(event.detail)}
  />
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
