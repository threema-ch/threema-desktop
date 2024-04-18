<!--
  @component Renders a preview card for the given conversation.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {getFragmentForRoute} from '~/app/routing/router';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {contextmenu} from '~/app/ui/actions/contextmenu';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import ReceiverCard from '~/app/ui/components/partials/receiver-card/ReceiverCard.svelte';
  import {
    getReceiverCardBottomLeftItemOptions,
    getReceiverCardTopRightItemOptions,
  } from '~/app/ui/components/partials/receiver-preview-list/helpers';
  import type {ReceiverPreviewProps} from '~/app/ui/components/partials/receiver-preview-list/internal/receiver-preview/props';
  import type {VirtualRect} from '~/app/ui/generic/popover/types';
  import {i18n} from '~/app/ui/i18n';
  import type {DbReceiverLookup} from '~/common/db';

  type $$Props = ReceiverPreviewProps;

  export let active: $$Props['active'];
  export let contextMenuOptions: NonNullable<$$Props['contextMenuOptions']> = {items: []};
  export let highlights: $$Props['highlights'] = undefined;
  export let options: NonNullable<$$Props['options']> = {};
  export let popover: $$Props['popover'] = undefined;
  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];

  const dispatch = createEventDispatcher<{
    click: MouseEvent;
  }>();

  let contextMenuPosition: VirtualRect | undefined;
  let isContextMenuOpen: boolean = false;

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

  function getItemUrl(lookup: DbReceiverLookup): string {
    const route = ROUTE_DEFINITIONS.main.conversation.withTypedParams({
      receiverLookup: lookup,
    });

    return `#${getFragmentForRoute(route) ?? ''}`;
  }
</script>

<li
  class="container"
  data-receiver={receiver.type === 'self'
    ? 'self'
    : `${receiver.lookup.type}.${receiver.lookup.uid}`}
  use:contextmenu={handleAlternativeClick}
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
    {#if receiver.type === 'self'}
      <span class="item self">
        <ReceiverCard
          content={{
            topLeft: [
              {
                type: 'text',
                text: {
                  raw: $i18n.t('contacts.label--own-name'),
                },
              },
            ],
            bottomLeft: getReceiverCardBottomLeftItemOptions(receiver),
          }}
          options={{
            isClickable: false,
          }}
          {receiver}
          {services}
          size="md"
        />
      </span>
    {:else}
      <!-- eslint-disable-next-line @typescript-eslint/no-unsafe-argument --><!-- prettier-ignore -->
      <a href={getItemUrl(receiver.lookup)} class="item" class:active={active && options.highlightWhenActive !== false} on:click={handleClick}>
        <ReceiverCard
          content={{
            topLeft: [
              {
                type: 'receiver-name',
                receiver,
                highlights,
              },
            ],
            topRight: getReceiverCardTopRightItemOptions(receiver, $i18n),
            bottomLeft: getReceiverCardBottomLeftItemOptions(receiver),
            bottomRight:
              receiver.type === 'contact'
                ? [
                    {
                      type: 'blocked-icon',
                      isBlocked: receiver.isBlocked,
                    },
                    {
                      type: 'text',
                      text: {
                        raw: receiver.identity,
                      },
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
    {/if}
  </ContextMenuProvider>
</li>

<style lang="scss">
  @use 'component' as *;

  .container {
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

      &:not(.self):hover {
        cursor: pointer;
        background-color: var(--cc-conversation-preview-background-color--hover);
      }

      &:not(.self):focus-visible {
        box-shadow: inset 0em 0em 0em em(1px) var(--c-icon-button-naked-outer-border-color--focus);
        outline: none;
      }

      &:not(.self).active {
        background-color: var(--cc-conversation-preview-background-color--active);
      }
    }
  }
</style>
