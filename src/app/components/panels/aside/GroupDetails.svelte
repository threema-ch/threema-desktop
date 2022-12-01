<script lang="ts">
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Avatar from '#3sc/components/threema/Avatar/Avatar.svelte';
  import {
    type GroupPreviewStores,
    type TransformedGroup,
    getAvatarAndMemberStores,
    transformGroup,
  } from '~/app/components/group';
  import GroupMembers from '~/app/components/group/detail/GroupMembers.svelte';
  import AvatarDialog from '~/app/components/modal-dialog/ContactAvatar.svelte';
  import DeleteDialog from '~/app/components/modal-dialog/ContactDelete.svelte';
  import {toast} from '~/app/components/snackbar';
  import {type RouterState} from '~/app/routing/router';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import {transformAvatarPicture} from '~/common/dom/ui/avatar';
  import {ReceiverType} from '~/common/enum';
  import {type Contact, type Group} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {ensureIdentityString} from '~/common/network/types';
  import {type IQueryableStore} from '~/common/utils/store';

  /**
   * App Services
   */
  export let services: AppServices;

  // Unpack services
  const {router, backend} = services;

  let group: RemoteModelStore<Group> | undefined;
  let avatar: GroupPreviewStores['avatar'] | undefined;
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

  async function setGroupAndAvatarStore(groupParam: RemoteModelStore<Group>): Promise<void> {
    const allContactsStore = await backend.model.contacts.getAll();
    const stores = await getAvatarAndMemberStores(groupParam, allContactsStore);
    group$ = transformGroup(groupParam.get());
    ({avatar, members} = stores);
  }

  $: void fetchGroup($router);

  let members: IQueryableStore<ReadonlySet<RemoteModelStore<Contact>>>;

  $: if (group !== undefined) {
    void setGroupAndAvatarStore(group);
  }

  function closeAside(): void {
    router.closeAside();
  }

  // Switch different modal dialogs
  let deleteGroupDialogVisible = false;
  let groupAvatarDialogVisible = false;

  // @ts-expect-error TODO(WEBMD-653): Implement this
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
      router.go(
        $router.nav,
        ROUTE_DEFINITIONS.main.welcome.withTypedParams(undefined),
        undefined,
        undefined,
      );
    }

    const groupName = $group.view.name;
    $group.controller.remove
      .fromLocal()
      .then(() => {
        toast.addSimpleSuccess(`Successfully removed group "${groupName}"`);
      })
      .catch(() => {
        toast.addSimpleFailure(`Could not delete group "${groupName}"`);
      });

    deleteGroupDialogVisible = false;
    closeAside();
  }
</script>

<template>
  <div class="aside-group">
    <header>
      <span />
      Group Detail
      <IconButton flavor="naked" on:click={closeAside}>
        <MdIcon theme="Outlined">close</MdIcon>
      </IconButton>
    </header>

    {#if group$ !== undefined && $avatar !== undefined}
      <div class="avatar">
        <span>
          <Avatar
            on:click={() => (groupAvatarDialogVisible = true)}
            img={transformAvatarPicture($avatar.view.picture)}
            alt="Avatar of {group$.displayName}"
            initials={group$.displayName.slice(0, 2)}
            color={$avatar.view.color}
            shape={'circle'}
          />
        </span>
      </div>
      <div class="name" class:inactive={group$.isInactive}>
        {group$.name}
      </div>
      <div class="edit">
        <!--<span on:click={openGroupEditDialog}>Edit</span>-->
        <span class="wip">Edit</span>
      </div>

      <GroupMembers
        {backend}
        {members}
        creator={ensureIdentityString(group$.creator)}
        {router}
        isInactiveGroup={group$.isInactive}
      />

      <!-- TODO(WEBMD-165): FE: Add members to groups -->
      <!-- <LinkElement wip label="Add Members">
        <span class="icon-primary add" slot="icon-left">
          <MdIcon theme="Outlined">add</MdIcon>
        </span>
      </LinkElement> -->
      <!-- TODO(WEBMD-517): FE: Remove members from groups -->
      <!-- <LinkElement wip label="Remove Members">
        <span class="icon-primary remove" slot="icon-left">
          <MdIcon theme="Outlined">delete</MdIcon>
        </span>
      </LinkElement> -->
      <!-- TODO(WEBMD-512): FE: Sync groups manually -->
      <!-- <LinkElement wip label="Sync Group">
        <span class="icon-primary sync" slot="icon-left">
          <MdIcon theme="Outlined">sync</MdIcon>
        </span>
      </LinkElement> -->
      <!-- <Divider /> -->
      <!-- TODO(WEBMD-178): FE: Contact / Group / DistributionList Media Gallery  -->
      <!-- <div class="gallery">
        <LinkElement wip label="Media Gallery">
          <div slot="icon-left" class="icon-photo">
            <MdIcon theme="Outlined">photo</MdIcon>
          </div>
          <MdIcon slot="icon-right" theme="Outlined">navigate_next</MdIcon>
        </LinkElement>
      </div> -->
      <!-- <Divider /> -->
      <!-- TODO(WEBMD-515): FE: Allow cloning groups -->
      <!-- <LinkElement wip label="Clone Group">
        <MdIcon slot="icon-left" theme="Outlined">copy_all</MdIcon>
      </LinkElement> -->
      <!-- TODO(WEBMD-548): FE: Leave Group -->
      <!-- <LinkElement wip label="Leave Group">
        <MdIcon slot="icon-left" theme="Outlined">directions_run</MdIcon>
      </LinkElement> -->
      <!-- TODO(WEBMD-549): FE: Delete Group -->
      <!-- <LinkElement wip label="Delete Group">
        <MdIcon slot="icon-left" theme="Outlined">delete</MdIcon>
      </LinkElement> -->

      <DeleteDialog
        bind:visible={deleteGroupDialogVisible}
        on:confirm={deleteGroup}
        displayName={group$.displayName}
      />

      <AvatarDialog bind:visible={groupAvatarDialogVisible}
        ><Avatar
          img={transformAvatarPicture($avatar.view.picture)}
          alt="Avatar of {group$.displayName}"
          initials={group$.displayName.slice(0, 2)}
          color={$avatar.view.color}
          shape={'square'}
        />
      </AvatarDialog>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .aside-group {
    display: grid;
    grid-template:
      'header' #{rem(64px)}
      'avatar' min-content
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
      padding: #{rem(12px)} #{rem(8px)} #{rem(12px)} #{rem(8px)};
      grid-template:
        'space title cancel' 100%
        / #{rem(40px)} auto #{rem(40px)};
      grid-auto-flow: column;
      place-items: center;
      user-select: none;
    }

    .avatar {
      display: grid;
      place-items: center;
      margin: rem(8px) 0;
      --c-avatar-size: #{rem(120px)};

      span {
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

    // .icon-primary {
    //   display: grid;
    //   color: var(--t-color-primary);
    // }

    // .gallery {
    //   .icon-photo {
    //     display: grid;
    //     place-items: center;
    //     color: var(--t-color-primary);
    //   }
    // }
  }
</style>
