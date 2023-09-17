<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import type {Router} from '~/app/routing/router';
  import type {ContactReceiver} from '~/app/ui/generic/receiver';
  import Receiver from '~/app/ui/generic/receiver/Receiver.svelte';
  import type {SwipeAreaGroup} from '~/app/ui/generic/swipe-area';
  import SwipeArea from '~/app/ui/generic/swipe-area/SwipeArea.svelte';
  import SwipeAreaButton from '~/app/ui/generic/swipe-area/SwipeAreaButton.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {contactListFilter, showFullNameAndNickname} from '~/app/ui/nav/receiver';
  import type {DbContactUid} from '~/common/db';
  import {ActivityState, ReceiverType} from '~/common/enum';
  import type {ProfilePicture} from '~/common/model';
  import type {RemoteModelStore} from '~/common/model/utils/model-store';
  import type {Remote} from '~/common/utils/endpoint';
  import type {
    ContactListItemViewModel,
    ContactListItemViewModelStore,
  } from '~/common/viewmodel/contact-list-item';

  /**
   * Contact list item view model store.
   */
  export let contact: Remote<ContactListItemViewModelStore>;
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

  // Reactive profile picture store
  let profilePicture: RemoteModelStore<ProfilePicture>;
  $: profilePicture = $contact.profilePicture;

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

  function transformReceiver(viewModel: Remote<ContactListItemViewModel>): ContactReceiver {
    // Determine title and subtitle
    let title = viewModel.displayName;
    let subtitle = undefined;
    if (showFullNameAndNickname(viewModel)) {
      title = viewModel.fullName;
      subtitle = viewModel.nickname;
    }

    return {
      type: 'contact',
      profilePicture: {
        profilePicture: $profilePicture.view,
        alt: $i18n.t('contacts.hint--profile-picture', {name: viewModel.displayName}),
        initials: viewModel.initials,
        badge: viewModel.badge,
        unread: 0,
      },
      title: {
        text: title,
        isDisabled: viewModel.activityState === ActivityState.INVALID,
      },
      subtitle: {
        text: subtitle,
        badges: {
          isInactive: viewModel.activityState === ActivityState.INACTIVE,
          isInvalid: viewModel.activityState === ActivityState.INVALID,
        },
      },
      verificationDot: {
        color: viewModel.verificationLevelColors,
        level: viewModel.verificationLevel,
      },
      identity: viewModel.identity,
      isBlocked: viewModel.isBlocked,
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
    <SwipeArea enabled={false} group={swipeGroup}>
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
          <div slot="name">{$i18n.t('contacts.action--edit')}</div>
        </SwipeAreaButton>
        <SwipeAreaButton>
          <div slot="icon">
            <MdIcon theme="Outlined">delete</MdIcon>
          </div>
          <div slot="name">{$i18n.t('contacts.action--delete')}</div>
        </SwipeAreaButton>
      </aside>
    </SwipeArea>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--cc-t-background-color);
  $-checkbox-size: rem(40px);
  $-fade-width: rem(48px);

  .container {
    @include def-var(
      $-temp-vars,
      --cc-t-background-color,
      var(--cc-conversation-preview-background-color)
    );
    @include def-var(
      $--ic-swipe-area-right-size: 66%,
      $--cc-profile-picture-overlay-background-color: var($-temp-vars, --cc-t-background-color)
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
