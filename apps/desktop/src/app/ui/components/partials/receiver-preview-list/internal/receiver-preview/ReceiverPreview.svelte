<!--
  @component Renders a preview card for the given conversation.
-->
<script lang="ts">
  import {contextmenu} from '~/app/ui/actions/contextmenu';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import ReceiverCard from '~/app/ui/components/partials/receiver-card/ReceiverCard.svelte';
  import {getTextContentItemOptionsFromTextAndHighlights} from '~/app/ui/components/partials/receiver-card/internal/content-item/helpers';
  import {
    getReceiverCardBottomLeftItemOptions,
    getReceiverCardTopRightItemOptions,
  } from '~/app/ui/components/partials/receiver-preview-list/helpers';
  import type {ReceiverPreviewProps} from '~/app/ui/components/partials/receiver-preview-list/internal/receiver-preview/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {VirtualRect} from '~/app/ui/generic/popover/types';
  import {i18n} from '~/app/ui/i18n';
  import Checkbox from '~/app/ui/svelte-components/blocks/Checkbox/Checkbox.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {unreachable} from '~/common/utils/assert';

  const {
    active,
    contextMenuOptions = {items: []},
    highlights,
    interaction = {mode: 'none'},
    options = {},
    services,
    store,
    oninteraction,
  }: ReceiverPreviewProps = $props();

  const {receiver} = $derived($store);

  let checkboxComponent = $state<SvelteNullableBinding<Checkbox>>(null);
  let popoverComponent = $state<SvelteNullableBinding<Popover>>(null);

  let contextMenuPosition = $state<VirtualRect | undefined>();
  let isContextMenuOpen = $state<boolean>(false);

  const highlightWhenActive = $derived(options.highlightWhenActive ?? interaction.mode === 'click');

  function handleClick(event: MouseEvent): void {
    event.preventDefault();

    if (isContextMenuOpen) {
      return;
    }

    event.stopPropagation();

    switch (interaction.mode) {
      case 'click':
        oninteraction?.({type: 'click', receiver, active});
        break;

      case 'none':
        // Do nothing.
        break;

      case 'select':
        // Clicking anywhere in the container should also trigger a selection in `"select"` mode.
        checkboxComponent?.check();
        break;

      default:
        unreachable(interaction);
    }
  }

  function handleSelect(selected: boolean): void {
    if (interaction.mode === 'select') {
      oninteraction?.({type: 'select', receiver, selected});
    }
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

    if (popoverComponent !== null && popoverComponent !== undefined) {
      popoverComponent.open(event);
      isContextMenuOpen = true;
    }
  }

  function handleClickContextMenuItem(): void {
    if (popoverComponent !== null && popoverComponent !== undefined) {
      popoverComponent.close();
      isContextMenuOpen = false;
    }
  }

  function handleContextMenuHasClosed(): void {
    isContextMenuOpen = false;
  }
</script>

<li
  use:contextmenu={handleAlternativeClick}
  class="container"
  data-interaction-mode={interaction.mode}
  data-receiver={receiver.type === 'self'
    ? 'self'
    : `${receiver.lookup.type}.${receiver.lookup.uid}`}
>
  <ContextMenuProvider
    bind:popover={popoverComponent}
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
    onafterclose={handleContextMenuHasClosed}
    onclickitem={handleClickContextMenuItem}
    reference={contextMenuPosition}
    triggerBehavior="none"
    {...contextMenuOptions}
  >
    {#if receiver.type === 'self'}
      <span class="item self" data-testid="contact-preview">
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
      <button
        class="item"
        class:active={active && highlightWhenActive}
        disabled={interaction.mode === 'none'}
        tabindex={interaction.mode === 'click' ? 0 : -1}
        onclick={handleClick}
        data-testid="contact-preview"
      >
        {#if interaction.mode === 'select'}
          <span class="checkbox">
            <Checkbox
              bind:this={checkboxComponent}
              checked={interaction.isSelected}
              oncheck={handleSelect}
            />
          </span>
        {/if}
        <span class="receiver">
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
                      getTextContentItemOptionsFromTextAndHighlights(receiver.identity, highlights),
                    ]
                  : undefined,
            }}
            options={{
              isClickable: true,
              isFocusable: false,
            }}
            {receiver}
            {services}
            size="md"
          />
        </span>
      </button>
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
    overflow-x: clip;

    .item {
      @extend %neutral-input;

      width: 100%;

      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: stretch;

      padding: rem(10px) rem(16px);

      .receiver {
        & {
          flex: 1 1 auto;

          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: start;

          min-width: 0;
          max-width: 100%;
        }
      }
    }

    &[data-interaction-mode='click'],
    &[data-interaction-mode='select'] {
      .item:not(.self) {
        &:hover {
          cursor: pointer;
          background-color: var(--cc-conversation-preview-background-color--hover);
        }

        &.active {
          background-color: var(--cc-conversation-preview-background-color--active);
        }
      }
    }

    &[data-interaction-mode='click'] {
      .item:not(.self) {
        padding: 0;

        .receiver {
          padding: rem(10px) rem(16px);

          &:focus-visible {
            box-shadow: inset 0em 0em 0em em(1px)
              var(--c-icon-button-naked-outer-border-color--focus);
            outline: none;
          }
        }
      }
    }

    &[data-interaction-mode='select'] {
      .item:not(.self) {
        gap: rem(8px);

        padding: rem(10px) rem(16px) rem(10px) rem(12px);
      }
    }
  }
</style>
