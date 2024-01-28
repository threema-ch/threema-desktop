<!--
  @component
  Renders a list of preview cards for the given conversations.
-->
<script lang="ts">
  import {getFragmentForRoute} from '~/app/routing/router';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import type {ConversationRouteParams} from '~/app/ui/components/partials/conversation/types';
  import ReceiverCard from '~/app/ui/components/partials/receiver-card/ReceiverCard.svelte';
  import {
    getReceiverCardBottomLeftItemOptions,
    getReceiverCardTopRightItemOptions,
  } from '~/app/ui/components/partials/receiver-preview-list/helpers';
  import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';
  import {i18n} from '~/app/ui/i18n';
  import {reactive} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';

  type $$Props = ReceiverPreviewListProps;

  export let items: $$Props['items'] = [];
  export let services: $$Props['services'];

  const {router} = services;

  let routeParams: ConversationRouteParams | undefined = undefined;

  function handleChangeRouterState(): void {
    const routerState = router.get();

    if (routerState.main.id === 'conversation') {
      routeParams = routerState.main.params;
    } else {
      // If we are not in a conversation, reset `routeParams` to `undefined` to clear the view.
      routeParams = undefined;
    }
  }

  function handleClickItem(lookup: DbReceiverLookup, active?: boolean): void {
    if (active === true) {
      // Close conversation if it was already open.
      router.goToWelcome();
    } else {
      router.openConversationAndDetailsForReceiver(lookup);
    }
  }

  function getItemUrl(lookup: DbReceiverLookup): string {
    const route = ROUTE_DEFINITIONS.main.conversation.withTypedParams({
      receiverLookup: lookup,
    });

    return `#${getFragmentForRoute(route) ?? ''}`;
  }

  $: reactive(handleChangeRouterState, [$router]);
</script>

<ul class="container">
  {#each items as item (`${item.receiver.lookup.type}.${item.receiver.lookup.uid}`)}
    {@const {receiver} = item}
    {@const active =
      routeParams?.receiverLookup.type === receiver.lookup.type &&
      routeParams.receiverLookup.uid === receiver.lookup.uid}

    <li>
      <a
        href={getItemUrl(receiver.lookup)}
        class="item"
        class:active
        on:click|preventDefault={() => handleClickItem(receiver.lookup, active)}
      >
        <ReceiverCard
          content={{
            topLeft: [
              {
                type: 'receiver-name',
                receiver: item.receiver,
              },
            ],
            topRight: getReceiverCardTopRightItemOptions(receiver, $i18n),
            bottomLeft: getReceiverCardBottomLeftItemOptions(receiver),
            bottomRight:
              receiver.type === 'contact'
                ? [
                    {
                      type: 'text',
                      text: receiver.identity,
                    },
                  ]
                : undefined,
          }}
          options={{
            isClickable: true,
          }}
          {receiver}
          {services}
          size="md"
        />
      </a>
    </li>
  {/each}
</ul>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;

    list-style-type: none;
    margin: 0;
    padding: 0;
    max-width: 100%;

    li {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: start;

      .item {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: start;

        padding: rem(10px) rem(16px);
        text-decoration: inherit;
        color: inherit;

        &:hover {
          cursor: pointer;
          background-color: var(--cc-conversation-preview-background-color--hover);
        }

        &:focus-visible {
          box-shadow: inset 0em 0em 0em em(1px) var(--c-icon-button-naked-outer-border-color--focus);
          outline: none;
        }

        &.active {
          background-color: var(--cc-conversation-preview-background-color--active);
        }
      }
    }
  }
</style>
