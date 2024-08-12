<!--
  @component Renders a preview card for the given conversation.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {getFragmentForRoute} from '~/app/routing/router';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {contextmenu} from '~/app/ui/actions/contextmenu';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import {
    conversationDrafts,
    type ConversationDraftStore,
    type Draft,
  } from '~/app/ui/components/partials/conversation/drafts';
  import {getReceiverCardBottomLeftItemOptions} from '~/app/ui/components/partials/conversation-preview-list/helpers';
  import type {ConversationPreviewProps} from '~/app/ui/components/partials/conversation-preview-list/internal/conversation-preview/props';
  import ReceiverCard from '~/app/ui/components/partials/receiver-card/ReceiverCard.svelte';
  import type {VirtualRect} from '~/app/ui/generic/popover/types';
  import {i18n} from '~/app/ui/i18n';
  import {reactive} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {WritableStore} from '~/common/utils/store';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  type $$Props = ConversationPreviewProps;

  export let active: $$Props['active'];
  export let call: $$Props['call'] = undefined;
  export let contextMenuOptions: NonNullable<$$Props['contextMenuOptions']> = {items: []};
  export let highlights: $$Props['highlights'] = undefined;
  export let isArchived: $$Props['isArchived'];
  export let isPinned: $$Props['isPinned'];
  export let isTyping: $$Props['isTyping'] = false;
  export let isPrivate: $$Props['isPrivate'];
  export let lastMessage: $$Props['lastMessage'] = undefined;
  export let popover: $$Props['popover'] = undefined;
  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];
  export let totalMessageCount: $$Props['totalMessageCount'];
  export let unreadMessageCount: NonNullable<$$Props['unreadMessageCount']> = 0;

  unusedProp(totalMessageCount);

  const {router} = services;

  const dispatch = createEventDispatcher<{
    click: MouseEvent;
  }>();

  let contextMenuPosition: VirtualRect | undefined;
  let isContextMenuOpen: boolean = false;

  // TODO(DESK-306): Properly implement drafts.
  let draftStore: ConversationDraftStore = new WritableStore<Draft | undefined>(undefined);

  function handleClick(event: MouseEvent): void {
    if (isContextMenuOpen) {
      event.preventDefault();
      return;
    }

    dispatch('click', event);
  }

  function handleAlternativeClick(event: MouseEvent): void {
    event.preventDefault();

    contextMenuPosition = {
      left: event.clientX,
      right: 0,
      top: event.clientY,
      bottom: 0,
      width: 0,
      height: 0,
    };

    if (popover !== null && popover !== undefined) {
      popover.open(event);
      isContextMenuOpen = true;
    }
  }

  function handleClickContextMenuItem(): void {
    if (popover !== null && popover !== undefined) {
      popover.close();
      isContextMenuOpen = false;
    }
  }

  function handleContextMenuHasClosed(): void {
    isContextMenuOpen = false;
  }

  function handleChangeRouterState(): void {
    const routerState = router.get();

    if (routerState.main.id === 'conversation') {
      draftStore = active
        ? new WritableStore<Draft | undefined>(undefined)
        : conversationDrafts.getOrCreateStore(receiver.lookup);
    } else if (routerState.nav.id === 'conversationList') {
      // Small window size.
      draftStore = conversationDrafts.getOrCreateStore(receiver.lookup);
    }
  }

  function getItemUrl(receiverLookup: DbReceiverLookup): string {
    const route = ROUTE_DEFINITIONS.main.conversation.withParams({receiverLookup});
    return `#${getFragmentForRoute(route) ?? ''}`;
  }

  $: reactive(handleChangeRouterState, [$router]);
</script>

<li
  class="container"
  data-receiver={`${receiver.lookup.type}.${receiver.lookup.uid}`}
  use:contextmenu={handleAlternativeClick}
  class:active
>
  <ContextMenuProvider
    bind:popover
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
    closeOnClickOutside={true}
    reference={contextMenuPosition}
    triggerBehavior="none"
    {...contextMenuOptions}
    on:clickitem={handleClickContextMenuItem}
    on:hasclosed={handleContextMenuHasClosed}
  >
    <a href={getItemUrl(receiver.lookup)} class="item" class:active on:click={handleClick}>
      <ReceiverCard
        content={{
          topLeft: [
            {
              type: 'receiver-name',
              receiver,
              highlights,
            },
          ],
          topRight: [
            {
              type: 'charms',
              call,
              isBlocked: receiver.type === 'contact' && receiver.isBlocked,
              isPinned,
              isTyping,
              isPrivate,
              notificationPolicy: receiver.notificationPolicy,
            },
          ],
          bottomLeft: getReceiverCardBottomLeftItemOptions(
            $draftStore,
            $i18n,
            isArchived,
            isPrivate,
            lastMessage,
            receiver,
          ),
          bottomRight:
            lastMessage === undefined || lastMessage.status.deleted !== undefined
              ? undefined
              : [
                  {
                    type: 'relative-timestamp',
                    date: lastMessage.status.created.at,
                    format: 'auto',
                    services,
                  },
                  {
                    type: 'status-icon',
                    conversation: {
                      receiver,
                    },
                    reactions: lastMessage.reactions,
                    status: lastMessage.status,
                  },
                ],
        }}
        options={{
          isClickable: true,
          isFocusable: false,
        }}
        {receiver}
        {services}
        size="md"
        {unreadMessageCount}
        on:clickjoincall
      />
    </a>
  </ContextMenuProvider>
</li>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;

    &:hover {
      cursor: pointer;
      background-color: var(--cc-conversation-preview-background-color--hover);
    }

    &.active {
      background-color: var(--cc-conversation-preview-background-color--active);
    }

    .item {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: start;

      padding: rem(10px) rem(16px);
      text-decoration: inherit;
      color: inherit;

      &:focus-visible {
        box-shadow: inset 0em 0em 0em em(1px) var(--c-icon-button-naked-outer-border-color--focus);
        outline: none;

        &:not(.active) {
          background-color: var(--cc-conversation-preview-background-color--hover);
        }
      }

      :global(.draft) {
        color: var(--cc-conversation-preview-draft-text-color);
      }
    }
  }
</style>
