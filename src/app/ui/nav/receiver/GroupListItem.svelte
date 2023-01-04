<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {type Router} from '~/app/routing/router';
  import {type GroupReceiver} from '~/app/ui/generic/receiver';
  import Receiver from '~/app/ui/generic/receiver/Receiver.svelte';
  import {type SwipeAreaGroup} from '~/app/ui/generic/swipe-area';
  import SwipeArea from '~/app/ui/generic/swipe-area/SwipeArea.svelte';
  import SwipeAreaButton from '~/app/ui/generic/swipe-area/SwipeAreaButton.svelte';
  import {type DbGroupUid} from '~/common/db';
  import {GroupUserState, ReceiverType} from '~/common/enum';
  import {type ProfilePicture} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type Remote} from '~/common/utils/endpoint';
  import {
    type GroupListItemViewModel,
    type GroupListItemViewModelStore,
  } from '~/common/viewmodel/group-list-item';

  import {contactListFilter} from '.';

  /**
   * Contact list item view model store.
   */
  export let group: Remote<GroupListItemViewModelStore>;
  /**
   * Router
   */
  export let router: Router;
  /**
   * Swipe area group of the associated list.
   */
  export let swipeGroup: SwipeAreaGroup;
  /**
   * Determine whether this group is the current active group.
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
  $: profilePicture = group.get().profilePicture;

  function switchToConversation(groupUid: DbGroupUid): void {
    router.openConversationAndDetailsForReceiver({
      type: ReceiverType.GROUP,
      uid: groupUid,
    });
  }

  function handleClick(): void {
    if (selectable) {
      selected = !selected;
    } else if (conversationActive) {
      router.goToWelcome();
    } else {
      switchToConversation(group.get().uid);
    }
  }

  function transformReceiver(viewModel: Remote<GroupListItemViewModel>): GroupReceiver {
    return {
      type: 'group',
      profilePicture: {
        profilePicture: $profilePicture,
        alt: `Profile picture of ${viewModel.displayName}`,
        initials: viewModel.initials,
        unread: 0,
      },
      title: {
        text: viewModel.displayName,
        lineThrough: viewModel.userState !== GroupUserState.MEMBER,
      },
      subtitle: {
        text: viewModel.memberNames.join(', '),
      },
      membersCount: viewModel.totalMembersCount,
    };
  }

  let conversationActive = false;
  $: {
    const routeReceiverLookup = $router.main.params?.receiverLookup;
    conversationActive =
      routeReceiverLookup?.type === ReceiverType.GROUP &&
      routeReceiverLookup.uid === group.get().uid;
  }
</script>

<template>
  <div class="container" class:active class:conversation-active={conversationActive}>
    <SwipeArea group={swipeGroup}>
      <section slot="main" class:selectable on:click={handleClick}>
        <Receiver
          {selectable}
          {selected}
          filter={$contactListFilter}
          receiver={transformReceiver($group)}
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
  $-profile-picture-size: rem(68px);
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
