<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ThreemaIcon from '#3sc/components/blocks/Icon/ThreemaIcon.svelte';
  import {getFragmentForRoute, type Router} from '~/app/routing/router';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import Time from '~/app/ui/generic/form/Time.svelte';
  import BlockedIcon from '~/app/ui/generic/icon/BlockedIcon.svelte';
  import DeprecatedReceiver from '~/app/ui/generic/receiver/DeprecatedReceiver.svelte';
  import {type SwipeAreaGroup} from '~/app/ui/generic/swipe-area';
  import SwipeArea from '~/app/ui/generic/swipe-area/SwipeArea.svelte';
  import SwipeAreaButton from '~/app/ui/generic/swipe-area/SwipeAreaButton.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {conversationDrafts} from '~/app/ui/main/conversation';
  import MessageStatus from '~/app/ui/main/conversation/conversation-messages/MessageStatus.svelte';
  import {
    type ConversationPreviewData,
    conversationPreviewListFilter,
    isInactiveGroup,
    transformConversation,
    transformReceiver,
  } from '~/app/ui/nav/conversation';
  import {
    ConversationCategory,
    ConversationVisibility,
    MessageDirection,
    ReceiverType,
  } from '~/common/enum';
  import {statusFromView} from '~/common/model/message';
  import {unreachable} from '~/common/utils/assert';
  import {type Remote} from '~/common/utils/endpoint';
  import {derive} from '~/common/utils/store/derived-store';
  import {type ConversationPreview} from '~/common/viewmodel/conversation-preview';

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
  $: isReceiverBlockedStore = derive(
    conversationPreview.viewModel,
    (viewModel) => viewModel.receiver.type === 'contact' && viewModel.receiver.isBlocked,
  );

  /**
   * Profile Picture
   */
  const profilePicture = conversationPreview.profilePicture;

  /**
   * Conversation preview Viewmodel
   */
  const viewModel = conversationPreview.viewModel;

  /**
   * Store containing the conversation's last message
   */
  $: lastConversationMessage = $viewModel.lastMessage;
  $: lastMessageStore = lastConversationMessage?.messageStore;
  $: lastMessageViewModelStore = lastConversationMessage?.viewModel;
  $: lastMessagePreviewText = $viewModel.lastMessagePreview;

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

  const conversationType = $conversation.view.type;
  const isGroupConversation = conversationType === ReceiverType.GROUP;

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

  function getConversationFragment(): string {
    const route = ROUTE_DEFINITIONS.main.conversation.withTypedParams({
      receiverLookup: receiver$.lookup,
    });
    return `#${getFragmentForRoute(route) ?? ''}`;
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

  // TODO(DESK-1073): Add default preview text for message types other than `text` or `file`.
  let previewText = '';
  $: {
    // Use default preview if conversation is protected.
    if (conversation$.category === ConversationCategory.PROTECTED) {
      previewText = $i18n.t('messaging.label--protected-conversation', 'Private');
      break $;
    }

    // Use draft as preview if there is any.
    if (conversationDraft !== undefined) {
      previewText = conversationDraft;
      break $;
    }

    // Use last message as preview text.
    if (lastMessagePreviewText !== undefined) {
      if (isGroupConversation) {
        const sender = $lastMessageViewModelStore?.body.sender;

        switch (sender?.type) {
          case 'self':
            previewText = $i18n.t('messaging.label--default-sender-self', 'Me: {text}', {
              text: lastMessagePreviewText,
            });
            break;
          case 'contact':
            previewText = `${sender.name}: ${lastMessagePreviewText}`;
            break;
          case undefined:
            previewText = '';
            break;
          default:
            unreachable(sender);
        }
      } else {
        previewText = lastMessagePreviewText;
      }

      break $;
    }

    previewText = '';
  }
</script>

<template>
  <div class="container" class:active>
    <SwipeArea {group}>
      <a
        href={getConversationFragment()}
        slot="main"
        class="conversation"
        on:click|preventDefault={() => switchToConversation(receiver$)}
      >
        {#if conversation$ !== undefined && receiver$ !== undefined && $profilePicture !== undefined}
          <DeprecatedReceiver
            profilePicture={{
              alt: $i18n.t('contacts.hint--profile-picture', {name: receiver$.name}),
              profilePicture: $profilePicture.view,
              initials: $viewModel.receiver.initials,
              unread: conversation$.unread,
              badge: receiver$.badge,
            }}
            title={{
              title: receiver$.name,
              titleLineThrough: isInactiveGroup($receiver),
              subtitle: {
                text: previewText,
                mentions: $lastMessageViewModelStore?.mentions,
              },
              isArchived: conversation$.visibility === ConversationVisibility.ARCHIVED,
              // Note: "$message?.draft" will be set once DESK-306 is implemented. So far, it does nothing.
              isDraft: conversationDraft !== undefined,
            }}
            filter={$conversationPreviewListFilter}
          >
            <div class="properties" slot="additional-top">
              {#if $isReceiverBlockedStore}
                <span class="property" data-property="blocked">
                  <BlockedIcon />
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
              {#if $lastMessageStore !== undefined && receiver !== undefined}
                <Time date={$lastMessageStore?.view.createdAt} />
                <span class="icon">
                  {#if isGroupConversation}
                    <MdIcon theme="Filled">group</MdIcon>
                  {:else if $lastMessageStore !== undefined}
                    <MessageStatus
                      direction={$lastMessageStore.view.direction}
                      status={$lastMessageStore.view.direction === MessageDirection.OUTBOUND
                        ? statusFromView($lastMessageStore.view)[0]
                        : 'delivered'}
                      reaction={$lastMessageStore.view.lastReaction?.type}
                      outgoingReactionDisplay="arrow"
                      receiverType={receiver.type}
                    />
                  {/if}
                </span>
              {/if}
            </div>
          </DeprecatedReceiver>
        {/if}
      </a>

      <aside slot="right" class="buttons">
        <SwipeAreaButton>
          <div slot="icon">
            <ThreemaIcon theme="Outlined">unpin</ThreemaIcon>
          </div>
          <div slot="name">{$i18n.t('messaging.action--conversation-option-unpin', 'Unpin')}</div>
        </SwipeAreaButton>
        <SwipeAreaButton>
          <div slot="icon">
            <MdIcon theme="Outlined">archive</MdIcon>
          </div>
          <div slot="name">
            {$i18n.t('messaging.action--conversation-option-archive', 'Archive')}
          </div>
        </SwipeAreaButton>
        <SwipeAreaButton>
          <div slot="icon">
            <MdIcon theme="Outlined">more_vert</MdIcon>
          </div>
          <div slot="name">{$i18n.t('messaging.action--conversation-option-more', 'More')}</div>
        </SwipeAreaButton>
      </aside>
    </SwipeArea>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--cc-t-background-color);
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
    @include clicktarget-link-rect;

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
