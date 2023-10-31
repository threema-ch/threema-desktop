<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import type {Router} from '~/app/routing/router';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {sortGroupMembers} from '~/app/ui/aside/group-details';
  import GroupMember from '~/app/ui/aside/group-details/GroupMember.svelte';
  import DeprecatedReceiver from '~/app/ui/generic/receiver/DeprecatedReceiver.svelte';
  import {i18n} from '~/app/ui/i18n';
  import LinkElement from '~/app/ui/nav/receiver/detail/LinkElement.svelte';
  import type {DbContactUid} from '~/common/db';
  import type {BackendController} from '~/common/dom/backend/controller';
  import {ReceiverType} from '~/common/enum';
  import type {Contact} from '~/common/model';
  import type {RemoteModelStore} from '~/common/model/utils/model-store';
  import type {IdentityString} from '~/common/network/types';
  import type {u53} from '~/common/types';
  import type {IQueryableStore} from '~/common/utils/store';

  export let router: Router;

  export let backend: BackendController;

  /**
   * The members list does never include the current user, regardless if they are the group creator or not.
   */
  export let members: IQueryableStore<ReadonlySet<RemoteModelStore<Contact>>>;

  export let creator: IdentityString;

  export let isInactiveGroup: boolean;

  /**
   * Since the members list never includes the current user, regardless if they are the group
   * creator or not, here we use "participants" as either the group creator, a regular group member
   * or the current user.
   */
  const VISIBLE_PARTICIPANTS_LIMIT_WHEN_COLLAPSED = 4;

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

  const userProfilePicture = backend.user.profilePicture;
</script>

<template>
  <div class="group-members">
    <div class="label">
      {$i18n.t(
        'contacts.label--group-members-count-long',
        '{n, plural, =0 {No Group Members} =1 {1 Group Member} other {# Group Members}}',
        {n: numberOfParticipants},
      )}
    </div>
    <div class="members">
      {#if isCurrentUserGroupCreator}
        <DeprecatedReceiver
          clickable={false}
          profilePicture={{
            alt: $i18n.t('contacts.hint--own-profile-picture', 'My profile picture'),
            profilePicture: $userProfilePicture,
            initials: $i18n.t('contacts.label--own-initials', 'ME'),
            unread: 0,
          }}
          title={{
            title: $i18n.t('contacts.label--own-name', 'Me'),
            isCreator: true,
          }}
        >
          <div class="identity" slot="additional-bottom">{backend.user.identity}</div>
        </DeprecatedReceiver>
      {/if}
      {#each getVisibleMembers(sortedMembersExcludingCurrentContact, isParticipantsListExpanded) as member (member.id)}
        <GroupMember
          {backend}
          {member}
          {creator}
          on:click={() => navigateToContactConversation(member.ctx)}
        />
      {/each}
      {#if !isCurrentUserGroupCreator && !isInactiveGroup}
        <DeprecatedReceiver
          clickable={false}
          profilePicture={{
            alt: $i18n.t('contacts.hint--own-profile-picture', 'My profile picture'),
            profilePicture: $userProfilePicture,
            initials: $i18n.t('contacts.label--own-initials', 'ME'),
            unread: 0,
          }}
          title={{title: $i18n.t('contacts.label--own-name', 'Me')}}
        >
          <div class="identity" slot="additional-bottom">{backend.user.identity}</div>
        </DeprecatedReceiver>
      {/if}
    </div>
    {#if isExpandCollapseButtonNeeded}
      {#if isParticipantsListExpanded}
        <LinkElement
          on:click={toggleParticipantsListExpanded}
          label={$i18n.t('contacts.action--group-members-show-less', 'Show less')}
        >
          <span class="expand" slot="icon-left">
            <MdIcon theme="Outlined">expand_less</MdIcon>
          </span>
        </LinkElement>
      {:else}
        <LinkElement
          on:click={toggleParticipantsListExpanded}
          label={$i18n.t('contacts.action--group-members-show-all', 'Show all')}
        >
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

  $-temp-vars: (--cc-t-background-color);

  .group-members {
    @include def-var($-temp-vars, --cc-t-background-color, var(--t-main-background-color));
    @include def-var(
      $--ic-swipe-area-right-size: 75%,
      $--cc-profile-picture-overlay-background-color: var($-temp-vars, --cc-t-background-color)
    );

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
