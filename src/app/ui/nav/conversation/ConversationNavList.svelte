<script lang="ts">
  import {onMount} from 'svelte';

  import {type Router} from '~/app/routing/router';
  import {SwipeAreaGroup} from '~/app/ui/generic/swipe-area';
  import {conversationListEvent} from '~/app/ui/main/conversation/index';
  import {conversationPreviewListFilter} from '~/app/ui/nav/conversation';
  import ConversationNavElement from '~/app/ui/nav/conversation/ConversationNavElement.svelte';
  import {type DbReceiverLookup} from '~/common/db';
  import {scrollToCenterOfView} from '~/common/dom/utils/element';
  import {type Settings} from '~/common/model';
  import {unreachable, unwrap} from '~/common/utils/assert';
  import {type Remote} from '~/common/utils/endpoint';
  import {derive} from '~/common/utils/store/derived-store';
  import {type ConversationPreviewSetStore} from '~/common/viewmodel/conversation-preview';
  import {type SvelteAction} from '~/common/viewmodel/types';

  /**
   * App settings.
   */
  export let settings: Remote<Settings>;

  /**
   * Set store of all conversation previews.
   */
  export let conversationPreviews: Remote<ConversationPreviewSetStore>;

  /**
   * Router.
   */
  export let router: Router;

  const group = new SwipeAreaGroup();

  let conversationPreviewList: HTMLDivElement;

  // Determine wheter scroll snapping anchor is active.
  let anchorActive = true;

  /**
   * Detect and switch if the scroll snapping anchor should be active based on element visibility.
   */
  function scrollSnap(node: HTMLElement): SvelteAction {
    // Make sure that the scoll anchor is initially visible if active
    if (anchorActive) {
      scrollToCenterOfView(node);
    }

    // Activate scroll anchor if it is visible in the viewport and vice versa
    const observer = new IntersectionObserver(([entry]) => {
      anchorActive = entry.isIntersecting;
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
        .filter(
          (conversationPreviewModel) =>
            getAndSubscribe(conversationPreviewModel.viewModel).lastUpdate !== undefined,
        )
        .filter((conversationPreviewModel) => {
          const filterText = getAndSubscribe(conversationPreviewListFilter);

          if (filterText === '') {
            return true;
          }

          const viewModel = getAndSubscribe(conversationPreviewModel.viewModel);
          const lastMessage = getAndSubscribe(viewModel.lastMessage);
          const receiver = viewModel.receiver;

          return [receiver.displayName, lastMessage?.text ?? '']
            .join(' ')
            .toLowerCase()
            .includes(filterText.trim().toLowerCase());
        })
        .sort((a, b) => {
          // Unwrap is okay as we filter out entries without lastUpdate
          const aTime = unwrap(getAndSubscribe(a.viewModel).lastUpdate).getTime();
          const bTime = unwrap(getAndSubscribe(b.viewModel).lastUpdate).getTime();
          if (aTime > bTime) {
            return -1;
          }
          if (aTime < bTime) {
            return 1;
          }
          return 0;
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

    const receiverLookup = $router.main.params?.receiverLookup;
    if (receiverLookup !== undefined) {
      conversationListEvent.post({action: 'scroll-to-receiver', receiverLookup});
    }

    return () => conversationListEvent.detach();
  });

  const nodesByReceiverLookup: Record<
    `${DbReceiverLookup['type']}:${DbReceiverLookup['uid']}`,
    HTMLElement
  > = {};

  function rememberNodeForReceiver(node: HTMLElement, receiverLookup: DbReceiverLookup): void {
    nodesByReceiverLookup[`${receiverLookup.type}:${receiverLookup.uid}`] = node;
  }

  function scrollConversationPreviewIntoView(receiverLookup: DbReceiverLookup): void {
    const conversationPreviewNode =
      nodesByReceiverLookup[`${receiverLookup.type}:${receiverLookup.uid}`];
    if (conversationPreviewNode !== undefined) {
      // TODO(WEBMD-800): Once the ConversationPreview uses the viewModel and nothing is loaded
      // asynchronously the setTimeout below can be removed. In fact, probably the whole
      // rememberNodeForReceiver mechanism can be avoided and scrollConversationPreviewIntoView can
      // be directly `use:`ed in the `div.conversation-preview`, similarly to how it is done
      // in {@link ContactList} and {@link GroupList}.
      setTimeout(() => scrollToCenterOfView(conversationPreviewNode), 100);
    }
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
      >
        <ConversationNavElement {conversationPreview} {settings} {router} {group} active={false} />
      </div>
    {/each}
  </div>
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
