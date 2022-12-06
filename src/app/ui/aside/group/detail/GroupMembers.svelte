<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import LinkElement from '~/app/ui/nav/contact/detail/LinkElement.svelte';
  import GroupMember from '~/app/ui/aside/group/detail/GroupMembers/GroupMember.svelte';
  import DeprecatedReceiver from '~/app/ui/generic/receiver/DeprecatedReceiver.svelte';
  import {type Router} from '~/app/routing/router';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type DbContactUid} from '~/common/db';
  import {type BackendController} from '~/common/dom/backend/controller';
  import {ReceiverType} from '~/common/enum';
  import {type Contact, type Settings} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type IdentityString} from '~/common/network/types';
  import {type u53} from '~/common/types';
  import {type Remote} from '~/common/utils/endpoint';
  import {type IQueryableStore} from '~/common/utils/store';

  import {sortGroupMembers} from '.';

  export let router: Router;

  export let backend: BackendController;

  /**
   * The members list does never include the current user, regardless if they are the group creator or not.
   */
  export let members: IQueryableStore<ReadonlySet<RemoteModelStore<Contact>>>;

  export let creator: IdentityString;

  export let isInactiveGroup: boolean;

  /**
   * Since the members list does never include the current user, regardless if they are the group
   * creator or not, here we use "participants" as either the group creator, a regular group member
   * or the current user.
   */
  const VISIBLE_PARTICIPANTS_LIMIT_WHEN_COLLAPSED = 4;

  const settings: Remote<Settings> = backend.model.settings;

  let isCurrentUserGroupCreator: boolean;
  let numberOfParticipants: u53;
  let isExpandCollapseButtonNeeded: boolean;
  let sortedMembersExcludingCurrentContact: readonly RemoteModelStore<Contact>[];

  $: {
    isCurrentUserGroupCreator = backend.user.identity === creator;
    numberOfParticipants = $members.size;
    if (isCurrentUserGroupCreator || !isInactiveGroup) {
      // Include the current user in the participant count
      numberOfParticipants += 1;
    }
    isExpandCollapseButtonNeeded = numberOfParticipants > VISIBLE_PARTICIPANTS_LIMIT_WHEN_COLLAPSED;
    sortedMembersExcludingCurrentContact = sortGroupMembers($members, creator);
  }

  let isParticipantsListExpanded = false;

  function toggleParticipantsListExpanded(): void {
    isParticipantsListExpanded = !isParticipantsListExpanded;
  }

  function getVisibleMembers(
    sortedMembers: readonly RemoteModelStore<Contact>[],
    showAll: boolean,
  ): readonly RemoteModelStore<Contact>[] {
    if (showAll) {
      return sortedMembers;
    }
    const count = VISIBLE_PARTICIPANTS_LIMIT_WHEN_COLLAPSED - 1;
    return sortedMembers.slice(0, count);
  }

  function navigateToContactConversation(uid: DbContactUid): void {
    router.go(
      router.get().nav,
      ROUTE_DEFINITIONS.main.conversation.withTypedParams({
        receiverLookup: {
          type: ReceiverType.CONTACT,
          uid,
        },
      }),
      ROUTE_DEFINITIONS.aside.contactDetails.withTypedParams({contactUid: uid}),
      undefined,
    );
  }
</script>

<template>
  <div class="group-members">
    <div class="label">
      {numberOfParticipants} Group Member{numberOfParticipants === 1 ? '' : 's'}
    </div>
    <div class="members">
      {#if isCurrentUserGroupCreator}
        <DeprecatedReceiver
          clickable={false}
          avatar={{
            alt: `My Avatar`,
            avatar: backend.user.avatar.get(),
            initials: 'ME',
            unread: 0,
          }}
          title={{
            title: 'Me',
            isCreator: true,
          }}
        >
          <div class="identity" slot="additional-bottom">{backend.user.identity}</div>
        </DeprecatedReceiver>
      {/if}
      {#each getVisibleMembers(sortedMembersExcludingCurrentContact, isParticipantsListExpanded) as member (member.id)}
        <GroupMember
          {member}
          {settings}
          {creator}
          on:click={() => navigateToContactConversation(member.ctx)}
        />
      {/each}
      {#if !isCurrentUserGroupCreator && !isInactiveGroup}
        <DeprecatedReceiver
          clickable={false}
          avatar={{
            alt: `My Avatar`,
            avatar: backend.user.avatar.get(),
            initials: 'ME',
            unread: 0,
          }}
          title={{title: 'Me'}}
        >
          <div class="identity" slot="additional-bottom">{backend.user.identity}</div>
        </DeprecatedReceiver>
      {/if}
    </div>
    {#if isExpandCollapseButtonNeeded}
      {#if isParticipantsListExpanded}
        <LinkElement on:click={toggleParticipantsListExpanded} label={'Show less'}>
          <span class="expand" slot="icon-left">
            <MdIcon theme="Outlined">expand_less</MdIcon>
          </span>
        </LinkElement>
      {:else}
        <LinkElement on:click={toggleParticipantsListExpanded} label={'Show all'}>
          <span class="expand" slot="icon-left">
            <MdIcon theme="Outlined">expand_more</MdIcon>
          </span>
        </LinkElement>
      {/if}
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .group-members {
    display: grid;
    grid-template:
      'label' auto
      'members' auto
      / auto;

    .label {
      @extend %font-small-400;
      color: var(--t-text-e2-color);
      grid-area: label;
      padding: rem(10px) rem(16px);
    }

    .members {
      grid-area: members;
      user-select: none;
    }

    .expand {
      display: grid;
      color: var(--t-color-primary);
    }
  }
</style>
