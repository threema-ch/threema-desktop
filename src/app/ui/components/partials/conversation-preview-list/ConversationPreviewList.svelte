<!--
  @component Renders a list of preview cards for the given conversations.
-->
<script lang="ts" generics="THandlerProps = never">
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import type {ConversationRouteParams} from '~/app/ui/components/partials/conversation/types';
  import ConversationPreview from '~/app/ui/components/partials/conversation-preview-list/internal/conversation-preview/ConversationPreview.svelte';
  import type {ConversationPreviewListProps} from '~/app/ui/components/partials/conversation-preview-list/props';
  import {transformContextMenuItemsToContextMenuOptions} from '~/app/ui/components/partials/conversation-preview-list/transformers';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {ReceiverType} from '~/common/enum';

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

  function handleChangeRouterState(): void {
    const routerState = router.get();

    if (routerState.main.id === 'conversation') {
      routeParams = routerState.main.params;
    } else {
      // If we are not in a conversation, reset `routeParams` to `undefined` to clear the view.
      routeParams = undefined;
    }
  }

  function handleClickItem(
    event: MouseEvent,
    receiverLookup: DbReceiverLookup,
    active?: boolean,
  ): void {
    event.preventDefault();

    if (active === true) {
      // Close conversation if it was already open.
      router.goToWelcome();
    } else {
      router.goToConversation({receiverLookup});
    }
  }

  function handleclickjoincall(receiverLookup: DbReceiverLookup): void {
    if (receiverLookup.type !== ReceiverType.GROUP) {
      return;
    }
    router.go({
      activity: ROUTE_DEFINITIONS.activity.call.withParams({receiverLookup, intent: 'join'}),
    });
  }

  $: reactive(handleChangeRouterState, [$router]);
</script>

<ul bind:this={containerElement} class="container">
  {#each items as item (item.receiver.id)}
    {@const active =
      routeParams?.receiverLookup.type === item.receiver.lookup.type &&
      routeParams.receiverLookup.uid === item.receiver.lookup.uid}

    <ConversationPreview
      {active}
      call={item.call}
      contextMenuOptions={contextMenuItems === undefined
        ? undefined
        : {
            container: containerElement,
            ...transformContextMenuItemsToContextMenuOptions(item, contextMenuItems),
          }}
      {highlights}
      isArchived={item.isArchived}
      isPinned={item.isPinned}
      isTyping={item.isTyping}
      isPrivate={item.isPrivate}
      lastMessage={item.lastMessage}
      receiver={item.receiver}
      {services}
      totalMessageCount={item.totalMessageCount}
      unreadMessageCount={item.unreadMessageCount}
      on:click={(event) => handleClickItem(event.detail, item.receiver.lookup, active)}
      on:clickjoincall={() => handleclickjoincall(item.receiver.lookup)}
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
    overflow: hidden;

    list-style-type: none;
    margin: 0;
    padding: 0;
    min-height: 100%;
    max-width: 100%;
  }
</style>
