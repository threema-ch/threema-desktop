<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ThreemaIcon from '#3sc/components/blocks/Icon/ThreemaIcon.svelte';
  import {type Router} from '~/app/routing/router';
  import Time from '~/app/ui/generic/form/Time.svelte';
  import DeprecatedReceiver from '~/app/ui/generic/receiver/DeprecatedReceiver.svelte';
  import {type SwipeAreaGroup} from '~/app/ui/generic/swipe-area';
  import SwipeArea from '~/app/ui/generic/swipe-area/SwipeArea.svelte';
  import SwipeAreaButton from '~/app/ui/generic/swipe-area/SwipeAreaButton.svelte';
  import {conversationDrafts} from '~/app/ui/main/conversation';
  import MessageStatus from '~/app/ui/main/conversation/conversation-messages/MessageStatus.svelte';
  import {conversationPreviewListFilter, isInactiveGroup} from '~/app/ui/nav/conversation';
  import {
    ConversationCategory,
    ConversationVisibility,
    MessageDirection,
    ReceiverType,
  } from '~/common/enum';
  import {type Remote} from '~/common/utils/endpoint';
  import {type ConversationPreview} from '~/common/viewmodel/conversation-preview';

  import {type ConversationPreviewData, transformConversation, transformReceiver} from '.';

  /**
   * ConversationPreview
   */
  export let conversationPreview: Remote<ConversationPreview>;

  /**
   * Conversation data store.
   */
  const conversation = conversationPreview.conversationStore;

  /**
   * Receiver
   */
  const receiver = conversationPreview.receiver;

  /**
   * Profile Picture
   */
  const profilePicture = conversationPreview.profilePicture;

  /**
   * Conversation preview Viewmodel
   */
  const viewModel = conversationPreview.viewModel;

  /**
   * Last Message in Conversation
   */
  const lastMessage = $viewModel.lastMessage;

  /**
   * Router
   */
  export let router: Router;
  /**
   * Swipe area group of the associated list.
   */
  export let group: SwipeAreaGroup;
  /**
   * Whether the conversation is currently being displayed.
   */
  export let active = false;

  // Transform conversation data and set store instances
  $: conversation$ = transformConversation($conversation);

  // Transform receiver data
  $: receiver$ = transformReceiver($receiver);

  /**
   * Switch the currently open conversation.
   */
  function switchToConversation(target: ConversationPreviewData['receiver'] | undefined): void {
    if (target === undefined) {
      return;
    }

    if (active) {
      // Close conversation
      router.goToWelcome();
    } else {
      router.openConversationAndDetailsForReceiver(target.lookup);
    }
  }

  // Temporary draft mechanism. TODO(DESK-306) full implementation.
  let conversationDraft: string | undefined;

  $: {
    if (receiver$ !== undefined) {
      const routeReceiverLookup = $router.main.params?.receiverLookup;
      active =
        routeReceiverLookup?.type === receiver$.lookup.type &&
        routeReceiverLookup?.uid === receiver$.lookup.uid;
      const conversationDraftStore = conversationDrafts.getOrCreateStore(receiver$.lookup);
      conversationDraft = active ? undefined : conversationDraftStore.get();
    }
  }

  const conversationType = $conversation.view.type;
  const isGroupConversation = conversationType === ReceiverType.GROUP;
</script>

<template>
  <div class="container" class:active>
    <SwipeArea {group}>
      <section slot="main" class="conversation" on:click={() => switchToConversation(receiver$)}>
        {#if conversation$ !== undefined && receiver$ !== undefined && $profilePicture !== undefined}
          <DeprecatedReceiver
            profilePicture={{
              alt: `Profile picture of ${receiver$.name}`,
              profilePicture: $profilePicture.view,
              initials: $viewModel.receiver.initials,
              unread: conversation$.unread,
              badge: receiver$.badge,
            }}
            title={{
              title: receiver$.name,
              titleLineThrough: isInactiveGroup($receiver),
              subtitle:
                conversation$.category === ConversationCategory.PROTECTED
                  ? 'Private'
                  : conversationDraft ?? $lastMessage?.text,
              isArchived: conversation$.visibility === ConversationVisibility.ARCHIVED,
              // Note: "$message?.draft" will be set once DESK-306 is implemented. So far, it does nothing.
              isDraft:
                conversationDraft !== undefined ||
                ($lastMessage?.direction === MessageDirection.OUTBOUND && $lastMessage?.draft),
            }}
            filter={$conversationPreviewListFilter}
          >
            <div class="properties" slot="additional-top">
              {#if receiver$.blocked}
                <span class="property" data-property="blocked">
                  <MdIcon theme="Filled">block</MdIcon>
                </span>
              {/if}

              {#if receiver$.notifications !== 'default'}
                <span class="property" data-property="notifications">
                  {#if receiver$.notifications === 'muted'}
                    <MdIcon theme="Filled">notifications_off</MdIcon>
                  {:else if receiver$.notifications === 'mentioned'}
                    <MdIcon theme="Filled">alternate_email</MdIcon>
                  {:else if receiver$.notifications === 'never'}
                    <MdIcon theme="Filled">remove_circle</MdIcon>
                  {/if}
                </span>
              {/if}

              {#if conversation$.category === ConversationCategory.PROTECTED}
                <span class="property" data-property="protected">
                  <ThreemaIcon theme="Filled">incognito</ThreemaIcon>
                </span>
              {/if}

              {#if conversation$.visibility === ConversationVisibility.PINNED}
                <span class="property" data-property="pinned">
                  <MdIcon theme="Filled">push_pin</MdIcon>
                </span>
              {/if}
            </div>

            <div class="status" slot="additional-bottom">
              {#if $lastMessage !== undefined && receiver !== undefined}
                <Time date={$lastMessage.updatedAt} />
                <span class="icon">
                  {#if isGroupConversation}
                    <MdIcon theme="Filled">group</MdIcon>
                  {:else}
                    <MessageStatus
                      direction={$lastMessage.direction}
                      status={$lastMessage.status}
                      reaction={$lastMessage.reaction}
                      outgoingReactionDisplay="arrow"
                      receiverType={receiver.type}
                    />
                  {/if}
                </span>
              {/if}
            </div>
          </DeprecatedReceiver>
        {/if}
      </section>

      <aside slot="right" class="buttons">
        <SwipeAreaButton>
          <div slot="icon">
            <ThreemaIcon theme="Outlined">unpin</ThreemaIcon>
          </div>
          <div slot="name">Unpin</div>
        </SwipeAreaButton>
        <SwipeAreaButton>
          <div slot="icon">
            <MdIcon theme="Outlined">archive</MdIcon>
          </div>
          <div slot="name">Archive</div>
        </SwipeAreaButton>
        <SwipeAreaButton>
          <div slot="icon">
            <MdIcon theme="Outlined">more_vert</MdIcon>
          </div>
          <div slot="name">More</div>
        </SwipeAreaButton>
      </aside>
    </SwipeArea>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--cc-t-background-color);
  $-profile-picture-size: rem(48px);
  $-fade-width: rem(48px);

  .container {
    @include def-var(
      $-temp-vars,
      --cc-t-background-color,
      var(--cc-conversation-preview-background-color)
    );
    @include def-var(
      $--ic-swipe-area-right-size: 75%,
      $--cc-profile-picture-overlay-background-color: var($-temp-vars, --cc-t-background-color)
    );
    background-color: var($-temp-vars, --cc-t-background-color);

    &:hover {
      @include def-var(
        $-temp-vars,
        --cc-t-background-color,
        var(--cc-conversation-preview-background-color--hover)
      );
    }

    &.active {
      @include def-var(
        $-temp-vars,
        --cc-t-background-color,
        var(--cc-conversation-preview-background-color--active)
      );
    }
  }

  .conversation {
    .properties {
      height: rem(20px);
      grid-area: properties;
      justify-self: end;
      padding-left: rem(5px);
      display: flex;
      flex-direction: row-reverse;

      .property {
        width: rem(20px);
        height: rem(20px);
        display: grid;
        place-items: center;
        margin-left: rem(-5px);
        color: var(--cc-conversation-preview-properties-icon-color);
        background-color: var(--cc-conversation-preview-properties-background-color);
        border: rem(1px) solid var($-temp-vars, --cc-t-background-color);
        border-radius: 50%;
        font-size: rem(12px);

        &[data-property='blocked'] {
          order: 4;
        }

        &[data-property='notifications'] {
          order: 3;
        }

        &[data-property='protected'] {
          order: 2;
        }

        &[data-property='pinned'] {
          order: 1;
          color: var(--cc-conversation-preview-properties-icon-pin-color);
        }
      }
    }

    .status {
      @extend %font-small-400;
      grid-area: status;
      justify-self: end;
      display: grid;
      place-items: center end;
      grid-auto-flow: column;
      padding: rem(2px) rem(4px) rem(2px) rem(2px);
      gap: rem(4px);
      width: 100%;
      height: rem(20px);
      color: var(--cc-conversation-preview-status-text-color);

      .icon {
        display: grid;
        align-items: end;
        justify-items: center;
        font-size: rem(12px);
      }
    }
  }

  .buttons {
    scroll-snap-align: start;
    height: 100%;
    width: 100%;
    display: grid;
    padding: rem(1px);
    gap: rem(1px);
    grid-template: 'pin archive more' / 1fr 1fr 1fr;
    background-color: var(--cc-conversation-preview-swipe-area-button-gap);
  }
</style>
