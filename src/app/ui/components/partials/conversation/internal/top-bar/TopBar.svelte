<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import {getReceiverCardBottomLeftItemOptions} from '~/app/ui/components/partials/conversation/internal/top-bar/helpers';
  import type {TopBarProps} from '~/app/ui/components/partials/conversation/internal/top-bar/props';
  import type {ModalState} from '~/app/ui/components/partials/conversation/internal/top-bar/types';
  import ClearConversationModal from '~/app/ui/components/partials/modals/clear-conversation-modal/ClearConversationModal.svelte';
  import DeleteConversationModal from '~/app/ui/components/partials/modals/delete-conversation-modal/DeleteConversationModal.svelte';
  import ProfilePictureButton from '~/app/ui/components/partials/profile-picture-button/ProfilePictureButton.svelte';
  import ReceiverCard from '~/app/ui/components/partials/receiver-card/ReceiverCard.svelte';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {AnchorPoint, Offset} from '~/app/ui/generic/popover/types';
  import {i18n} from '~/app/ui/i18n';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {display} from '~/common/dom/ui/state';
  import {GroupCallPolicy} from '~/common/enum';
  import {unreachable} from '~/common/utils/assert';

  const log = globals.unwrap().uiLogging.logger('ui.component.conversation.top-bar');

  type $$Props = TopBarProps;

  export let call: $$Props['call'] = undefined;
  export let conversation: $$Props['conversation'];
  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];

  const {
    router,
    settings: {calls: callsSettings},
  } = services;

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

  const dispatch = createEventDispatcher<{
    clickjoincall: {readonly event: MouseEvent; readonly intent: 'join' | 'join-or-create'};
  }>();

  function handleClickBack(): void {
    router.goToWelcome();
  }

  function handleClickReceiverCard(): void {
    router.go({aside: ROUTE_DEFINITIONS.aside.receiverDetails.withParams(receiver.lookup)});
  }

  function handleclickjoincall(event: MouseEvent, intent: 'join' | 'join-or-create'): void {
    dispatch('clickjoincall', {event, intent});
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

  function handleClickPinUnpinConversation(): void {
    if (conversation.isPinned) {
      conversation.unpin().catch((error: unknown) => log.warn(`Failed to unpin: ${error}`));
    } else {
      conversation.pin().catch((error: unknown) => log.warn(`Failed to pin: ${error}`));
    }
  }

  function handleClickArchiveUnarchiveConversation(): void {
    if (conversation.isArchived) {
      conversation.unarchive().catch((error: unknown) => log.warn(`Failed to unarchive: ${error}`));
    } else {
      conversation.archive().catch((error: unknown) => log.warn(`Failed to archive: ${error}`));
    }
  }

  function handleClickDeleteConversation(): void {
    modalState = {
      type: 'delete-conversation',
      props: {
        conversation,
        receiver,
      },
    };
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
        bottomLeft: getReceiverCardBottomLeftItemOptions(receiver, $i18n),
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

    {#if $callsSettings.view.groupCallPolicy === GroupCallPolicy.ALLOW_GROUP_CALL}
      {#if receiver.type === 'group' && !receiver.isLeft}
        {#if call === undefined}
          <IconButton
            flavor="naked"
            on:click={(event) => handleclickjoincall(event, 'join-or-create')}
          >
            <MdIcon title={$i18n.t('messaging.label--call-start-long', 'Start call')} theme="Filled"
              >phone_locked</MdIcon
            >
          </IconButton>
        {:else if !call.joined}
          <ProfilePictureButton
            icon="add"
            label={$i18n.t('messaging.label--call-join-long', 'Join call')}
            receivers={call.participants ?? []}
            {services}
            on:click={(event) => handleclickjoincall(event, 'join')}
          />
        {/if}
      {/if}
    {/if}

    <ContextMenuProvider
      bind:popover
      {anchorPoints}
      items={[
        {
          type: 'option',
          disabled: conversation.totalMessagesCount === 0,
          handler: handleClickEmptyChatOption,
          label: $i18n.t('messaging.action--empty-conversation', 'Empty Chat'),
          icon: {
            name: 'delete_sweep',
          },
        },
        {
          type: 'option',
          handler: handleClickPinUnpinConversation,
          label: conversation.isPinned
            ? $i18n.t('messaging.action--conversation-option-unpin', 'Unpin')
            : $i18n.t('messaging.action--conversation-option-pin', 'Pin'),
          icon: {
            name: 'push_pin',
          },
        },
        {
          type: 'option',
          handler: handleClickArchiveUnarchiveConversation,
          label: conversation.isArchived
            ? $i18n.t('messaging.action--conversation-option-unarchive', 'Unarchive')
            : $i18n.t('messaging.action--conversation-option-archive', 'Archive'),
          icon: {
            name: conversation.isArchived ? 'unarchive' : 'archive',
          },
        },
        {
          type: 'option',
          handler: handleClickDeleteConversation,
          label: $i18n.t('messaging.action--conversation-option-delete'),
          icon: {
            name: 'delete_forever',
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
{:else if modalState.type === 'delete-conversation'}
  <DeleteConversationModal {...modalState.props} on:close={handleCloseModal} />
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

    height: rem(64px);
    padding: 0 rem(8px);

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
