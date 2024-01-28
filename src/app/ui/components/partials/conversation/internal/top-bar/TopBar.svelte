<script lang="ts">
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import {getReceiverCardBottomLeftItemOptions} from '~/app/ui/components/partials/conversation/internal/top-bar/helpers';
  import type {TopBarProps} from '~/app/ui/components/partials/conversation/internal/top-bar/props';
  import type {ModalState} from '~/app/ui/components/partials/conversation/internal/top-bar/types';
  import ClearConversationModal from '~/app/ui/components/partials/modals/clear-conversation-modal/ClearConversationModal.svelte';
  import ReceiverCard from '~/app/ui/components/partials/receiver-card/ReceiverCard.svelte';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {AnchorPoint, Offset} from '~/app/ui/generic/popover/types';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {display} from '~/common/dom/ui/state';
  import {ReceiverType} from '~/common/enum';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = TopBarProps;

  export let conversation: $$Props['conversation'];
  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];

  const {router} = services;

  const anchorPoints: AnchorPoint = {
    reference: {
      horizontal: 'right',
      vertical: 'bottom',
    },
    popover: {
      horizontal: 'right',
      vertical: 'top',
    },
  };

  const offset: Offset = {
    left: 0,
    top: 4,
  };

  let referenceElement: SvelteNullableBinding<HTMLElement> = null;
  let popover: SvelteNullableBinding<Popover> = null;

  let modalState: ModalState = {type: 'none'};

  function handleClickBack(): void {
    router.replaceMain(ROUTE_DEFINITIONS.main.welcome.withoutParams());
  }

  function handleClickReceiverCard(): void {
    switch (receiver.lookup.type) {
      case ReceiverType.CONTACT:
        router.replaceAside(
          ROUTE_DEFINITIONS.aside.contactDetails.withTypedParams({contactUid: receiver.lookup.uid}),
        );
        break;

      case ReceiverType.GROUP:
        router.replaceAside(
          ROUTE_DEFINITIONS.aside.groupDetails.withTypedParams({groupUid: receiver.lookup.uid}),
        );
        break;

      case ReceiverType.DISTRIBUTION_LIST:
        // TODO(DESK-771): Open distribution list detail route
        break;

      default:
        unreachable(receiver.lookup, new Error('Unhandled receiverLookup type'));
    }
  }

  function handleClickEmptyChatOption(): void {
    modalState = {
      type: 'clear-conversation',
      props: {
        conversation,
        receiver,
      },
    };
  }

  function handleClickItem(): void {
    popover?.close();
  }

  function handleCloseModal(): void {
    // Reset modal state.
    modalState = {
      type: 'none',
    };
  }
</script>

<div class="top-bar">
  <div class="left">
    {#if $display === 'small'}
      <IconButton flavor="naked" on:click={handleClickBack}>
        <MdIcon theme="Outlined">arrow_back</MdIcon>
      </IconButton>
    {/if}
  </div>

  <div class="center">
    <ReceiverCard
      content={{
        topLeft: [
          {
            type: 'receiver-name',
            receiver,
          },
        ],
        bottomLeft: getReceiverCardBottomLeftItemOptions(receiver),
      }}
      options={{
        isClickable: true,
      }}
      {receiver}
      {services}
      size="sm"
      on:click={handleClickReceiverCard}
    />
  </div>

  <div class="right">
    {#if receiver.type === 'contact' && receiver.isBlocked}
      <div class="blocked">
        <MdIcon title={$i18n.t('contacts.label--blocked', 'Blocked')} theme="Filled">block</MdIcon>
      </div>
    {/if}

    <ContextMenuProvider
      bind:popover
      {anchorPoints}
      items={[
        {
          disabled: conversation.totalMessagesCount === 0,
          handler: handleClickEmptyChatOption,
          label: $i18n.t('messaging.action--empty-conversation', 'Empty Chat'),
          icon: {
            name: 'delete_sweep',
          },
        },
        {
          handler: conversation.isPinned ? conversation.unpin : conversation.pin,
          label: conversation.isPinned
            ? $i18n.t('messaging.action--conversation-option-unpin', 'Unpin')
            : $i18n.t('messaging.action--conversation-option-pin', 'Pin'),
          icon: {
            name: 'push_pin',
          },
        },
        {
          handler: conversation.isArchived ? conversation.unarchive : conversation.archive,
          label: conversation.isArchived
            ? $i18n.t('messaging.action--conversation-option-unarchive', 'Unarchive')
            : $i18n.t('messaging.action--conversation-option-archive', 'Archive'),
          icon: {
            name: conversation.isArchived ? 'unarchive' : 'archive',
          },
        },
      ]}
      {offset}
      reference={referenceElement}
      triggerBehavior="toggle"
      on:clickitem={handleClickItem}
    >
      <span bind:this={referenceElement} class="icon">
        <IconButton flavor="naked">
          <MdIcon theme="Outlined">more_vert</MdIcon>
        </IconButton>
      </span>
    </ContextMenuProvider>
  </div>
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

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: rem(8px);
    padding: rem(12px) rem(8px) rem(12px) rem(8px);

    .left {
      flex: 0 0 auto;
    }

    .center {
      flex: 1 1 0;
      display: flex;
      align-items: center;
      justify-content: left;
      min-width: 0;
      overflow: hidden;
    }

    .right {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: left;
      gap: rem(8px);

      .blocked {
        position: relative;
        color: red;
        font-size: rem(24px);
        font-weight: 900;
      }
    }
  }
</style>
