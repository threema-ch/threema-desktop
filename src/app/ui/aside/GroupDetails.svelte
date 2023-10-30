<script lang="ts">
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ProfilePicture from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import {globals} from '~/app/globals';
  import type {RouterState} from '~/app/routing/router';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import type {AppServices} from '~/app/types';
  import {
    getProfilePictureAndMemberStores,
    type GroupPreviewStores,
    type TransformedGroup,
    transformGroup,
  } from '~/app/ui/aside/group-details';
  import GroupMembers from '~/app/ui/aside/group-details/GroupMembers.svelte';
  import {i18n} from '~/app/ui/i18n';
  import DeleteDialog from '~/app/ui/modal/ContactDelete.svelte';
  import ProfilePictureDialog from '~/app/ui/modal/ContactProfilePicture.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import {display} from '~/common/dom/ui/state';
  import {ReceiverType} from '~/common/enum';
  import type {Contact, Group} from '~/common/model';
  import type {RemoteModelStore} from '~/common/model/utils/model-store';
  import {ensureIdentityString} from '~/common/network/types';
  import type {IQueryableStore} from '~/common/utils/store';

  const log = globals.unwrap().uiLogging.logger('ui.component.group-details');

  /**
   * App Services
   */
  export let services: AppServices;

  // Unpack services
  const {router, backend} = services;

  let group: RemoteModelStore<Group> | undefined;
  let profilePicture: GroupPreviewStores['profilePicture'] | undefined;
  let group$: TransformedGroup | undefined;

  async function fetchGroup(routerState: RouterState): Promise<void> {
    group =
      routerState.aside?.id === 'groupDetails'
        ? await backend.model.groups.getByUid(routerState.aside.params.groupUid)
        : undefined;

    if (group === undefined) {
      closeAside();
    }
  }

  async function setGroupAndProfilePictureStore(
    groupParam: RemoteModelStore<Group>,
  ): Promise<void> {
    const allContactsStore = await backend.model.contacts.getAll();
    const stores = await getProfilePictureAndMemberStores(groupParam, allContactsStore);
    group$ = transformGroup(groupParam.get());
    ({profilePicture, members} = stores);
  }

  $: void fetchGroup($router);

  let members: IQueryableStore<ReadonlySet<RemoteModelStore<Contact>>>;

  $: if (group !== undefined) {
    void setGroupAndProfilePictureStore(group);
  }

  function closeAside(): void {
    router.closeAside();
  }

  // Switch different modal dialogs
  let deleteGroupDialogVisible = false;
  let groupProfilePictureDialogVisible = false;

  // @ts-expect-error TODO(DESK-653): Implement this
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function openGroupEditDialog(): void {
    if (group !== undefined) {
      router.replaceModal(ROUTE_DEFINITIONS.modal.groupEdit.withTypedParams({groupUid: group.ctx}));
    }
  }

  function deleteGroup(): void {
    if ($group === undefined) {
      return;
    }

    // Redirect to welcome if current route is a conversation route with contact to delete
    const route = $router.main;
    if (
      route.id === 'conversation' &&
      route.params.receiverLookup.type === ReceiverType.GROUP &&
      route.params.receiverLookup.uid === $group.ctx
    ) {
      router.go($router.nav, ROUTE_DEFINITIONS.main.welcome.withoutParams(), undefined, undefined);
    }

    const groupName = $group.view.name;
    $group.controller.remove
      .fromLocal()
      .then(() => {
        toast.addSimpleSuccess(
          $i18n.t('contacts.success--delete-group', 'Successfully removed group "{name}"', {
            name: groupName,
          }),
        );
      })
      .catch(() => {
        log.error('Could not delete group');
        toast.addSimpleFailure(
          $i18n.t('contacts.error--delete-group', 'Could not delete group "{name}"', {
            name: groupName,
          }),
        );
      });

    deleteGroupDialogVisible = false;
    closeAside();
  }
</script>

<template>
  <div class="aside-group">
    <header data-display={$display}>
      <div class="back">
        <IconButton flavor="naked" on:click={closeAside}>
          <MdIcon theme="Outlined">arrow_back</MdIcon>
        </IconButton>
      </div>
      {$i18n.t('contacts.label--group-detail', 'Group Detail')}
      <div class="close">
        <IconButton flavor="naked" on:click={closeAside}>
          <MdIcon theme="Outlined">close</MdIcon>
        </IconButton>
      </div>
    </header>

    {#if group$ !== undefined && $profilePicture !== undefined}
      <div class="profile-picture">
        <button on:click={() => (groupProfilePictureDialogVisible = true)}>
          <ProfilePicture
            img={transformProfilePicture($profilePicture.view.picture)}
            alt={$i18n.t('contacts.hint--profile-picture', {
              name: group$.displayName,
            })}
            initials={group$.displayName.slice(0, 2)}
            color={$profilePicture.view.color}
            shape="circle"
          />
        </button>
      </div>
      <div class="name" class:inactive={group$.isInactive}>
        {group$.name}
      </div>
      <div class="edit">
        <!--<span on:click={openGroupEditDialog}>Edit</span>-->
        <span class="wip">{$i18n.t('contacts.action--edit')}</span>
      </div>

      <GroupMembers
        {backend}
        {members}
        creator={ensureIdentityString(group$.creator)}
        {router}
        isInactiveGroup={group$.isInactive}
      />

      <!-- TODO(DESK-165): FE: Add members to groups -->
      <!-- <LinkElement wip label="Add Members">
        <span class="icon-primary add" slot="icon-left">
          <MdIcon theme="Outlined">add</MdIcon>
        </span>
      </LinkElement> -->
      <!-- TODO(DESK-517): FE: Remove members from groups -->
      <!-- <LinkElement wip label="Remove Members">
        <span class="icon-primary remove" slot="icon-left">
          <MdIcon theme="Outlined">delete</MdIcon>
        </span>
      </LinkElement> -->
      <!-- TODO(DESK-512): FE: Sync groups manually -->
      <!-- <LinkElement wip label="Sync Group">
        <span class="icon-primary sync" slot="icon-left">
          <MdIcon theme="Outlined">sync</MdIcon>
        </span>
      </LinkElement> -->
      <!-- <Divider /> -->
      <!-- TODO(DESK-178): FE: Contact / Group / DistributionList Media Gallery  -->
      <!-- <div class="gallery">
        <LinkElement wip label="Media Gallery">
          <div slot="icon-left" class="icon-photo">
            <MdIcon theme="Outlined">photo</MdIcon>
          </div>
          <MdIcon slot="icon-right" theme="Outlined">navigate_next</MdIcon>
        </LinkElement>
      </div> -->
      <!-- <Divider /> -->
      <!-- TODO(DESK-515): FE: Allow cloning groups -->
      <!-- <LinkElement wip label="Clone Group">
        <MdIcon slot="icon-left" theme="Outlined">copy_all</MdIcon>
      </LinkElement> -->
      <!-- TODO(DESK-548): FE: Leave Group -->
      <!-- <LinkElement wip label="Leave Group">
        <MdIcon slot="icon-left" theme="Outlined">directions_run</MdIcon>
      </LinkElement> -->
      <!-- TODO(DESK-549): FE: Delete Group -->
      <!-- <LinkElement wip label="Delete Group">
        <MdIcon slot="icon-left" theme="Outlined">delete</MdIcon>
      </LinkElement> -->

      <DeleteDialog
        bind:visible={deleteGroupDialogVisible}
        on:confirm={deleteGroup}
        displayName={group$.displayName}
      />

      <ProfilePictureDialog bind:visible={groupProfilePictureDialogVisible}
        ><ProfilePicture
          img={transformProfilePicture($profilePicture.view.picture)}
          alt={$i18n.t('contacts.hint--profile-picture', {
            name: group$.displayName,
          })}
          initials={group$.displayName.slice(0, 2)}
          color={$profilePicture.view.color}
          shape="square"
        />
      </ProfilePictureDialog>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .aside-group {
    display: grid;
    grid-template:
      'header' #{rem(64px)}
      'profile-picture' min-content
      'name' #{rem(24px)}
      'edit' #{rem(24px)}
      'members' min-content
      'add' min-content
      'remove' min-content
      'sync' min-content
      'divider-1' min-content
      'gallery' min-content
      'divider-2' min-content
      'clone' min-content
      'leave' min-content
      'delete' min-content
      / 1fr;

    header {
      display: grid;
      padding: rem(12px) rem(8px);
      grid-template:
        'back title cancel' 100%
        / #{rem(40px)} auto #{rem(40px)};
      grid-auto-flow: column;
      place-items: center;
      user-select: none;

      &[data-display='large'] .back {
        visibility: hidden;
      }

      &:not([data-display='large']) .close {
        visibility: hidden;
      }
    }

    .profile-picture {
      display: grid;
      place-items: center;
      margin: rem(8px) 0;
      --c-profile-picture-size: #{rem(120px)};

      button {
        @extend %neutral-input;
        cursor: pointer;
      }
    }

    .name {
      @extend %font-large-400;
      padding: 0 rem(16px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;

      &.inactive {
        text-decoration: line-through;
      }
    }

    .edit {
      @extend %font-small-400;
      display: grid;
      place-items: center;
      color: var(--t-color-primary);
      text-decoration: none;
      user-select: none;

      span {
        cursor: pointer;
      }
    }
  }
</style>
