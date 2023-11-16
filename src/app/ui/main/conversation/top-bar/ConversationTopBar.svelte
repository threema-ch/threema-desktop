<script lang="ts">
  import {onDestroy} from 'svelte';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ProfilePictureComponent from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import type {AppServices} from '~/app/types';
  import BlockedIcon from '~/app/ui/generic/icon/BlockedIcon.svelte';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import ProfilePictureOverlay from '~/app/ui/generic/profile-picture/ProfilePictureOverlay.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {ConversationData} from '~/app/ui/main/conversation';
  import type {ConversationTopBarMode} from '~/app/ui/main/conversation/top-bar';
  import ConversationTopBarContextMenu from '~/app/ui/main/conversation/top-bar/ConversationTopBarContextMenu.svelte';
  import TopBarMode from '~/app/ui/main/conversation/top-bar/TopBarMode.svelte';
  import TopBarSearch from '~/app/ui/main/conversation/top-bar/TopBarSearch.svelte';
  import ConversationEmptyConfirmationDialog from '~/app/ui/modal/ConversationEmptyConfirmation.svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import type {ProfilePictureBlobStore} from '~/common/dom/ui/profile-picture';
  import {display} from '~/common/dom/ui/state';
  import {ReceiverType, type ConversationVisibility} from '~/common/enum';
  import type {Conversation} from '~/common/model';
  import type {RemoteModelStore} from '~/common/model/utils/model-store';
  import {unreachable} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import {eternalPromise} from '~/common/utils/promise';
  import {ReadableStore} from '~/common/utils/store';
  import type {ConversationViewModel} from '~/common/viewmodel/conversation';

  const log = globals.unwrap().uiLogging.logger('ui.component.conversation-top-bar');

  /**
   * Current display mode.
   */
  export let mode: ConversationTopBarMode = 'conversation-detail';

  /**
   * Receiver data.
   */
  export let receiver: ConversationData['receiver'];

  /**
   * Receiver lookup data.
   */
  export let receiverLookup: DbReceiverLookup;

  /**
   * The conversation model store.
   */
  export let conversation: RemoteModelStore<Conversation>;

  /**
   * Conversation view model
   */
  export let conversationViewModel: Remote<ConversationViewModel>;

  /**
   * Placeholder of the search field.
   */
  export let searchPlaceholder = 'Search';

  /**
   * Search string of the search field.
   */
  export let search = '';

  /**
   * App services.
   */
  export let services: AppServices;
  const {router} = services;

  /**
   * Whether to display this receiver as disabled (strikethrough).
   */
  export let isDisabled: boolean;

  /**
   * Whether to display this receiver as inactive.
   */
  export let isInactive: boolean;

  /**
   * Determine if this is a blocked contact.
   */
  export let isReceiverBlocked: boolean;

  let topBarContextMenuPopover: Popover | null;

  /**
   * Reset the top bar state.
   */
  function reset(): void {
    search = '';
    mode = 'conversation-detail';
  }

  onDestroy((): void => {
    topBarContextMenuPopover?.close();
  });

  function openAside(): void {
    switch (receiverLookup.type) {
      case ReceiverType.CONTACT:
        router.replaceAside(
          ROUTE_DEFINITIONS.aside.contactDetails.withTypedParams({contactUid: receiverLookup.uid}),
        );
        break;

      case ReceiverType.GROUP:
        router.replaceAside(
          ROUTE_DEFINITIONS.aside.groupDetails.withTypedParams({groupUid: receiverLookup.uid}),
        );
        break;

      case ReceiverType.DISTRIBUTION_LIST:
        // TODO(DESK-771): Open distribution list detail route
        break;
      default:
        unreachable(receiverLookup, new Error('Unhandled receiverLookup type'));
    }
  }

  function closeConversation(): void {
    router.replaceMain(ROUTE_DEFINITIONS.main.welcome.withoutParams());
  }

  function confirmEmptyConversationAction(): void {
    topBarContextMenuPopover?.close();
    $conversation.controller
      .getMessageCount()
      .then((messagesCount) => {
        conversationMessageCount = messagesCount;
      })
      .catch((error) => {
        log.error('Failed to fetch conversation messages', error);

        conversationMessageCount = 0;
      });
    isConversationEmptyDialogVisible = true;
  }

  function deleteAllConversationMessages(): void {
    $conversation.controller.removeAllMessages
      .fromLocal()
      .catch((error) => log.error('Could not remove messages from conversation', error));
  }

  function setConversationVisibility(newVisibility: ConversationVisibility): void {
    $conversation.controller.updateVisibility
      .fromLocal(newVisibility)
      .catch((error) => log.error('Could not change chat visibility', error));

    topBarContextMenuPopover?.close();
  }

  let isConversationEmptyDialogVisible = false;
  let conversationMessageCount = 0;
  let profilePictureStore: ProfilePictureBlobStore = new ReadableStore(undefined);

  $: innerConversationViewModel = conversationViewModel.viewModel;
  // Update profile picture store
  $: {
    services.profilePicture
      .getProfilePictureForReceiver(receiverLookup)
      .then((store) => {
        profilePictureStore = store ?? new ReadableStore(undefined);
      })
      .catch((error) => log.error(`Fetching profile picture for receiver failed: ${error}`));
  }
</script>

<template>
  <div data-mode={mode}>
    {#if mode === 'conversation-detail'}
      <div class="detail" data-type={receiver.type} data-display={$display}>
        <div class="back">
          <IconButton flavor="naked" on:click={closeConversation}>
            <MdIcon theme="Outlined">arrow_back</MdIcon>
          </IconButton>
        </div>
        <div class="profile-picture" on:click={openAside}>
          <div class="inner">
            <ProfilePictureComponent
              img={$profilePictureStore ?? eternalPromise()}
              alt={$i18n.t('contacts.hint--profile-picture', {name: receiver.name})}
              initials={receiver.profilePictureFallback.initials}
              color={receiver.profilePictureFallback.color}
              shape="circle"
            />
            <div class="overlay">
              <ProfilePictureOverlay
                badge={receiver.type === 'contact' ? receiver.badge : undefined}
              />
            </div>
          </div>
        </div>

        <div class="title" class:disabled={isDisabled} class:inactive={isInactive}>
          <span on:click={openAside}>{receiver.name}</span>
        </div>
        <div class="details">
          {#if receiver.type === 'contact'}
            <VerificationDots
              colors={receiver.verificationLevelColors}
              verificationLevel={receiver.verificationLevel}
            />
          {/if}
          {#if receiver.type === 'group'}
            {receiver.memberNames.join(', ')}
          {/if}
          {#if receiver.type === 'distribution-list'}
            TODO
          {/if}
        </div>
        {#if isReceiverBlocked}
          <div class="blocked-icon">
            <BlockedIcon />
          </div>
        {/if}
        <div class="actions">
          {#if receiver.type === 'contact'}
            <!-- <IconButton flavor="naked" class="wip">
              <ThreemaIcon theme="Outlined">secure_calls</ThreemaIcon>
            </IconButton> -->
          {/if}
          <!-- <IconButton on:click={() => (mode = 'title')} flavor="naked" class="wip">
            <MdIcon theme="Outlined">notifications_active</MdIcon>
          </IconButton> -->
          {#if receiver.type !== 'distribution-list'}
            <Popover
              bind:this={topBarContextMenuPopover}
              anchorPoints={{
                reference: {
                  horizontal: 'right',
                  vertical: 'bottom',
                },
                popover: {
                  horizontal: 'right',
                  vertical: 'top',
                },
              }}
              offset={{
                left: 0,
                top: 4,
              }}
            >
              <IconButton slot="trigger" flavor="naked">
                <MdIcon theme="Outlined">more_vert</MdIcon>
              </IconButton>

              <ConversationTopBarContextMenu
                slot="popover"
                isConversationEmptyActionEnabled={$innerConversationViewModel.lastMessage !==
                  undefined}
                conversationVisibility={$conversation.view.visibility}
                on:emptyConversationActionClicked={confirmEmptyConversationAction}
                on:setConversationVisibility={(event) => setConversationVisibility(event.detail)}
              />
            </Popover>
          {/if}
        </div>
      </div>
    {:else if mode === 'search'}
      <TopBarMode on:close={reset}>
        <TopBarSearch placeholder={searchPlaceholder} bind:value={search} on:close={reset} />
      </TopBarMode>
    {:else if mode === 'title'}
      <TopBarMode on:close={() => (mode = 'conversation-detail')}>
        <slot name="title" />
      </TopBarMode>
    {/if}
  </div>

  <ConversationEmptyConfirmationDialog
    bind:visible={isConversationEmptyDialogVisible}
    receiverName={receiver.name}
    receiverType={receiver.type}
    {conversationMessageCount}
    on:confirm={deleteAllConversationMessages}
  />
</template>

<style lang="scss">
  @use 'component' as *;

  [data-mode='conversation-detail'] {
    .detail {
      display: grid;
      grid-template:
        'profile-picture title   spacer blocked-icon actions' #{rem(24px)}
        'profile-picture details spacer blocked-icon actions' #{rem(16px)}
        / #{rem(40px)} auto 1fr auto;
      column-gap: rem(8px);
      padding: rem(12px) rem(8px);

      // In small layout, show back button
      &[data-display='small'] {
        grid-template:
          'back profile-picture title   spacer blocked-icon actions' #{rem(24px)}
          'back profile-picture details spacer blocked-icon actions' #{rem(16px)}
          / #{rem(40px)} #{rem(40px)} auto 1fr auto;

        .back {
          grid-area: back;
          user-select: none;
          cursor: pointer;
        }
      }

      // In non-small layout, don't show back button and increase left padding for profile picture.
      &:not([data-display='small']) {
        padding-left: 16px;
        .back {
          display: none;
        }
      }

      .profile-picture {
        @include def-var(
          $--cc-profile-picture-overlay-background-color: var(--t-main-background-color)
        );

        grid-area: profile-picture;
        user-select: none;
        cursor: pointer;

        .inner {
          position: relative;
          width: 100%;
          aspect-ratio: 1/1;
          object-fit: contain;
          margin: auto;

          .overlay {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
          }
        }
      }

      .title {
        @extend %font-large-400;
        @extend %text-overflow-ellipsis;
        margin-bottom: rem(-4px);
        color: var(--t-text-e1-color);
        grid-area: title;

        &.disabled {
          text-decoration: line-through;
        }

        &.inactive {
          color: var(--t-text-e2-color);
        }

        > span {
          cursor: pointer;
        }
      }

      .details {
        @extend %font-normal-400;
        @extend %text-overflow-ellipsis;
        color: var(--t-text-e2-color);
        grid-area: details;
      }

      .blocked-icon {
        grid-area: blocked-icon;
        display: grid;
        grid-auto-flow: column;
        font-size: rem(24px);
        top: rem(8px);
        position: relative;
      }

      .actions {
        grid-area: actions;
        display: grid;
        grid-auto-flow: column;
      }

      &[data-type='contact'] {
        .title {
          display: grid;
          margin-bottom: rem(-4px);
          padding-top: rem(4px);
        }

        .details {
          @include def-var(--c-verification-dots-size, rem(6px));
          margin-top: -4px;
        }
      }
    }
  }
</style>
