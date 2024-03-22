<!--
  @component Renders a list of preview cards for the given conversations.
-->
<script lang="ts" generics="THandlerProps = never">
  import type {ConversationRouteParams} from '~/app/ui/components/partials/conversation/types';
  import ConversationPreview from '~/app/ui/components/partials/conversation-preview-list/internal/conversation-preview/ConversationPreview.svelte';
  import type {ConversationPreviewListProps} from '~/app/ui/components/partials/conversation-preview-list/props';
  import {transformContextMenuItemsToContextMenuOptions} from '~/app/ui/components/partials/conversation-preview-list/transformers';
  import {scrollIntoViewIfNeededAsync} from '~/app/ui/utils/scroll';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';

  // Generic parameters are not yet recognized by the linter.
  // See https://github.com/sveltejs/eslint-plugin-svelte/issues/521
  // and https://github.com/sveltejs/svelte-eslint-parser/issues/306
  // eslint-disable-next-line no-undef
  type $$Props = ConversationPreviewListProps<THandlerProps>;

  export let contextMenuItems: $$Props['contextMenuItems'] = undefined;
  export let highlights: $$Props['highlights'] = undefined;
  export let items: $$Props['items'] = [];
  export let services: $$Props['services'];

  const {router} = services;

  let routeParams: ConversationRouteParams | undefined = undefined;

  let containerElement: SvelteNullableBinding<HTMLElement> = null;

  /**
   * Scroll to the first item in the list.
   */
  export function scrollToTop(): void {
    containerElement?.scrollTo({
      behavior: 'instant',
      top: 0,
    });
  }

  /**
   * Scroll list to bring the conversation of the given receiver into view.
   */
  export async function scrollToConversation(lookup: DbReceiverLookup): Promise<void> {
    await scrollIntoViewIfNeededAsync({
      container: containerElement,
      element: containerElement?.querySelector(
        `li[data-receiver="${`${lookup.type}.${lookup.uid}`}"]`,
      ),
      options: {
        behavior: 'instant',
        block: 'start',
      },
      timeoutMs: 100,
    });
  }

  /**
   * Scroll list to bring the current active conversation into view.
   */
  export async function scrollToActiveConversation(): Promise<void> {
    const lookup = routeParams?.receiverLookup;
    if (lookup === undefined) {
      return;
    }

    await scrollToConversation(lookup);
  }

  function handleChangeRouterState(): void {
    const routerState = router.get();

    if (routerState.main.id === 'conversation') {
      routeParams = routerState.main.params;
    } else {
      // If we are not in a conversation, reset `routeParams` to `undefined` to clear the view.
      routeParams = undefined;
    }
  }

  function handleClickItem(event: MouseEvent, lookup: DbReceiverLookup, active?: boolean): void {
    event.preventDefault();

    if (active === true) {
      // Close conversation if it was already open.
      router.goToWelcome();
    } else {
      router.openConversationAndDetailsForReceiver(lookup);
    }
  }

  $: reactive(handleChangeRouterState, [$router]);
</script>

<ul bind:this={containerElement} class="container">
  {#each items as item (`${item.receiver.lookup.type}.${item.receiver.lookup.uid}`)}
    {@const {lastMessage, receiver, totalMessageCount, unreadMessageCount} = item}
    {@const active =
      routeParams?.receiverLookup.type === receiver.lookup.type &&
      routeParams.receiverLookup.uid === receiver.lookup.uid}

    <ConversationPreview
      {active}
      contextMenuOptions={contextMenuItems === undefined
        ? undefined
        : {
            container: containerElement,
            ...transformContextMenuItemsToContextMenuOptions(item, contextMenuItems),
          }}
      {highlights}
      isArchived={item.isArchived}
      isPinned={item.isPinned}
      isPrivate={item.isPrivate}
      {lastMessage}
      {receiver}
      {services}
      {totalMessageCount}
      {unreadMessageCount}
      on:click={(event) => handleClickItem(event.detail, receiver.lookup, active)}
    />
  {/each}
</ul>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;
    overflow-x: hidden;
    overflow-y: scroll;

    list-style-type: none;
    margin: 0;
    padding: 0;
    max-width: 100%;
  }
</style>
