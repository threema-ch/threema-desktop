<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {type SwipeAreaGroup} from '#3sc/components/blocks/SwipeArea';
  import SwipeArea from '#3sc/components/blocks/SwipeArea/SwipeArea.svelte';
  import SwipeAreaButton from '#3sc/components/threema/SwipeAreaButton/SwipeAreaButton.svelte';
  import {type ContactReceiver} from '~/app/ui/generic/receiver';
  import Receiver from '~/app/ui/generic/receiver/Receiver.svelte';
  import {type Router} from '~/app/routing/router';
  import {type DbContactUid} from '~/common/db';
  import {ActivityState, ReceiverType} from '~/common/enum';
  import {type Avatar} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type RemoteObject} from '~/common/utils/endpoint';
  import {
    type ContactListItemViewModel,
    type ContactListItemViewModelStore,
  } from '~/common/viewmodel/contact-list-item';

  import {contactListFilter, showFullNameAndNickname} from '~/app/ui/nav/contact';

  /**
   * Contact list item view model store.
   */
  export let contact: RemoteObject<ContactListItemViewModelStore>;
  /**
   * Router
   */
  export let router: Router;
  /**
   * Swipe area group of the associated list.
   */
  export let swipeGroup: SwipeAreaGroup;
  /**
   * Determine whether this contact is the current active contact.
   */
  export let active = false;
  /**
   * Determine whether the contact is currently selectable via displayed checkbox.
   */
  export let selectable = false;
  /**
   * Determine whether the contact is currently selected.
   */
  export let selected = false;

  // Reactive avatar store
  let avatar: RemoteModelStore<Avatar>;
  $: avatar = $contact.avatar;

  function switchToConversation(contactUid: DbContactUid): void {
    router.openConversationAndDetailsForReceiver({
      type: ReceiverType.CONTACT,
      uid: contactUid,
    });
  }

  function handleClick(): void {
    if (selectable) {
      selected = !selected;
    } else if (conversationActive) {
      router.goToWelcome();
    } else {
      switchToConversation(contact.get().uid);
    }
  }

  function transformReceiver(viewModel: RemoteObject<ContactListItemViewModel>): ContactReceiver {
    // Determinetitle and subtitle
    let title = viewModel.displayName;
    let subtitle = undefined;
    if (showFullNameAndNickname(viewModel)) {
      title = viewModel.fullName;
      subtitle = viewModel.nickname;
    }

    return {
      type: 'contact',
      avatar: {
        avatar: $avatar,
        alt: `Avatar of ${viewModel.displayName}`,
        initials: viewModel.initials,
        badge: viewModel.badge,
        unread: 0,
      },
      title: {
        text: title,
        lineThrough: viewModel.activityState === ActivityState.INVALID,
      },
      subtitle: {
        text: subtitle,
        badges: {
          isInactive: viewModel.activityState === ActivityState.INACTIVE,
        },
      },
      verificationDot: {
        color: viewModel.verificationLevelColors,
        level: viewModel.verificationLevel,
      },
      identity: viewModel.identity,
    };
  }

  let conversationActive = false;
  $: {
    const routeReceiverLookup = $router.main.params?.receiverLookup;
    conversationActive =
      routeReceiverLookup?.type === ReceiverType.CONTACT &&
      routeReceiverLookup.uid === contact.get().uid;
  }
</script>

<template>
  <div class="container" class:active class:conversation-active={conversationActive}>
    <SwipeArea group={swipeGroup}>
      <section slot="main" class="contact" class:selectable on:click={handleClick}>
        <Receiver
          {selectable}
          {selected}
          filter={$contactListFilter}
          receiver={transformReceiver($contact)}
        />
      </section>

      <aside slot="right" class="buttons">
        <SwipeAreaButton>
          <div slot="icon">
            <MdIcon theme="Outlined">edit</MdIcon>
          </div>
          <div slot="name">Edit</div>
        </SwipeAreaButton>
        <SwipeAreaButton>
          <div slot="icon">
            <MdIcon theme="Outlined">delete</MdIcon>
          </div>
          <div slot="name">Delete</div>
        </SwipeAreaButton>
      </aside>
    </SwipeArea>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--cc-t-background-color);
  $-checkbox-size: rem(40px);
  $-avatar-size: rem(68px);
  $-fade-width: rem(48px);

  .container {
    @include def-var(
      $-temp-vars,
      --cc-t-background-color,
      var(--cc-conversation-preview-background-color)
    );
    @include def-var(
      $--c-swipe-area-right-size: 66%,
      $--cc-avatar-overlay-background-color: var($-temp-vars, --cc-t-background-color)
    );
    background-color: var($-temp-vars, --cc-t-background-color);

    &.active,
    &:hover {
      @include def-var(
        $-temp-vars,
        --cc-t-background-color,
        var(--cc-conversation-preview-background-color--hover)
      );
    }

    &.conversation-active {
      @include def-var(
        $-temp-vars,
        --cc-t-background-color,
        var(--cc-conversation-preview-background-color--active)
      );
    }
  }

  .buttons {
    scroll-snap-align: start;
    height: 100%;
    width: 100%;
    display: grid;
    padding: rem(1px);
    gap: rem(1px);
    grid-template: 'edit delete' / 1fr 1fr;
    background-color: var(--cc-conversation-preview-swipe-area-button-gap);
  }
</style>
