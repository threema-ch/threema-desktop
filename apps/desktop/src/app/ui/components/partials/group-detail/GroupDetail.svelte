<!--
  @component Renders the group detail pane (i.e., details about a receiver).
-->
<script lang="ts">
  import {ensureError} from '@threema/ts-utils/meta/ensure-error';

  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import GroupContent from '~/app/ui/components/partials/group-detail/internal/group-content/GroupContent.svelte';
  import TopBar from '~/app/ui/components/partials/group-detail/internal/top-bar/TopBar.svelte';
  import type {GroupDetailProps} from '~/app/ui/components/partials/group-detail/props';
  import {groupReceiverDataToGroupContentItemProps} from '~/app/ui/components/partials/group-detail/transformers';
  import type {
    ContextMenuItemHandlerProps,
    GroupDetailRouteParams,
    ModalState,
    RemoteGroupDetailViewModelController,
    RemoteGroupDetailViewModelStoreValue,
  } from '~/app/ui/components/partials/group-detail/types';
  import DeleteGroupModal from '~/app/ui/components/partials/modals/delete-group-modal/DeleteGroupModal.svelte';
  import DisbandGroupModal from '~/app/ui/components/partials/modals/disband-group-modal/DisbandGroupModal.svelte';
  import EditGroupNameModal from '~/app/ui/components/partials/modals/edit-group-name-modal/EditGroupNameModal.svelte';
  import LeaveGroupModal from '~/app/ui/components/partials/modals/leave-group-modal/LeaveGroupModal.svelte';
  import ProfilePictureModal from '~/app/ui/components/partials/modals/profile-picture-modal/ProfilePictureModal.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {reactive, svelteUnreachable} from '~/app/ui/utils/svelte';
  import type {DbGroupReceiverLookup} from '~/common/db';
  import type {DisbandGroupIntent, LeaveGroupIntent} from '~/common/model/types/group';
  import {assertUnreachable} from '~/common/utils/assert';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';
  import {
    isContactReceiverData,
    type AnyReceiverDataOrSelf,
    type GroupReceiverData,
  } from '~/common/viewmodel/utils/receiver';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.group-detail');

  const {services}: GroupDetailProps = $props();

  const {backend, profilePicture, router} = services;

  // Params of the current route.
  let routeParams = $state<GroupDetailRouteParams | undefined>(undefined);

  // ViewModelBundle containing all the group details.
  let viewModelStore = $state<IQueryableStore<RemoteGroupDetailViewModelStoreValue | undefined>>(
    new ReadableStore(undefined),
  );
  let viewModelController: RemoteGroupDetailViewModelController | undefined = undefined;

  let modalState = $state<ModalState>({type: 'none'});

  function handleClickBack(): void {
    router.go({aside: 'close'});
  }

  function handleClickClose(): void {
    router.go({aside: 'close'});
  }

  function handleCloseModal(): void {
    modalState = {
      type: 'none',
    };
  }

  async function handleOpenProfilePictureModal(): Promise<void> {
    if ($viewModelStore === undefined) {
      log.error('Error opening profile picture modal because the view model store is not defined');
      return;
    }

    const {receiver} = $viewModelStore;
    const profilePictureBlobStore = await profilePicture
      .getProfilePictureForReceiver(receiver.lookup)
      .catch(() => {
        log.error(
          `Error opening profile picture modal: Profile picture for ${receiver.lookup.type}.${receiver.lookup.uid} could not be loaded`,
        );

        return undefined;
      });
    const profilePictureBlob = profilePictureBlobStore?.get();

    modalState = {
      type: 'profile-picture',
      props: {
        alt: $i18n.t('groups.hint--profile-picture', 'Profile picture of “{name}”', {
          name: receiver.name,
        }),
        color: receiver.color,
        initials: receiver.initials,
        pictureBytes:
          profilePictureBlob === undefined
            ? undefined
            : new Uint8Array(await profilePictureBlob.blob.arrayBuffer()),
      },
    };
  }

  function handleChangeRouterState(): void {
    const routerState = router.get();

    if (routerState.aside?.id === 'groupDetails') {
      routeParams = routerState.aside.params;
    } else {
      // If no detail is open, reset `routeParams` to `undefined` to clear the view.
      routeParams = undefined;
    }
  }

  async function handleChangeGroupDetail(): Promise<void> {
    // Because Svelte `$state` uses proxies under the hood, the current value needs to be unwrapped
    // to make it serializable for sending it to the backend.
    let unproxiedReceiver: DbGroupReceiverLookup | undefined = undefined;

    if (routeParams !== undefined) {
      unproxiedReceiver = $state.snapshot(routeParams) as unknown as DbGroupReceiverLookup;
    }

    const viewModelStoreValue = $viewModelStore;

    // If the receiver is the same, it's not necessary to reload the `viewModelBundle`.
    if (
      unproxiedReceiver !== undefined &&
      unproxiedReceiver.type === viewModelStoreValue?.receiver.lookup.type &&
      unproxiedReceiver.uid === viewModelStoreValue.receiver.lookup.uid
    ) {
      return;
    }

    // If the receiver is undefined, reset `viewModelStore` and -controller.
    if (unproxiedReceiver === undefined) {
      viewModelStore = new ReadableStore(undefined);
      viewModelController = undefined;
      return;
    }

    await backend.viewModel
      .groupDetail(unproxiedReceiver)
      .then((viewModelBundle) => {
        if (viewModelBundle === undefined) {
          throw new Error('ViewModelBundle returned by the repository was undefined');
        }
        viewModelStore = viewModelBundle.viewModelStore;
        viewModelController = viewModelBundle.viewModelController;
      })
      .catch((error: unknown) => {
        log.error(
          `Failed to load detail for group with uid ${unproxiedReceiver.uid}: ${ensureError(error)}`,
        );

        toast.addSimpleFailure(
          $i18n.t('groups.error--group-detail-load', 'Details could not be loaded'),
        );

        // Close aside pane.
        router.go({aside: 'close'});
      });
  }

  function handleClickEditGroupName(): void {
    if ($viewModelStore === undefined) {
      log.error('Error opening group edit modal because the view model store is not defined');
      return;
    }

    const {receiver} = $viewModelStore;
    modalState = {
      type: 'edit-group-name',
      props: {
        receiver: {
          ...receiver,
          edit: async (update) => {
            if (viewModelController === undefined) {
              log.error('Error editing receiver: GroupDetailViewModelController was undefined');
              return false;
            }
            return await viewModelController.edit(update);
          },
          updateProfilePicture: async (update) => {
            if (viewModelController === undefined) {
              log.error(
                'Error setting group picture: GroupDetailViewModelController was undefined',
              );
              return false;
            }
            return await viewModelController.updateProfilePicture(update);
          },
        },
        services,
      },
    };
  }

  function handleClickEditGroupMembers(): void {
    if ($viewModelStore === undefined) {
      log.error(
        'Error opening group members edit modal because the view model store is not defined',
      );
      return;
    }

    if ($viewModelStore.receiver.creator.type !== 'self') {
      log.error('Error opening group members because the user is not the creator');
      return;
    }

    router.go({
      ...$router,
      modal: ROUTE_DEFINITIONS.modal.editGroupMembers.withParams({
        ...$viewModelStore.receiver.lookup,
      }),
    });
  }

  async function handleClickItem(receiver: AnyReceiverDataOrSelf, active: boolean): Promise<void> {
    if (!isContactReceiverData(receiver)) {
      log.error(
        `Called the clickGroupMember callback with lookup of type ${receiver.type} instead of 'contact'`,
      );
      return;
    }

    if (viewModelController !== undefined) {
      try {
        await viewModelController?.setAcquaintanceLevelDirect(receiver.lookup);
      } catch (error) {
        log.error(`Failed to set acquaintance level: ${error}`);
        // Prevent navigation.
        return;
      }
    } else {
      // Prevent navigation.
      return;
    }

    if (active) {
      router.goToWelcome();
    } else {
      router.goToConversation({receiverLookup: receiver.lookup});
    }
  }

  async function handleClickRemoveMember(props: ContextMenuItemHandlerProps): Promise<void> {
    if (props === undefined) {
      return;
    }

    if ($viewModelStore === undefined) {
      return;
    }

    if (props.receiver.type !== 'contact') {
      log.error('Failed to remove group member, the selected receiver is not a contact');
      return;
    }

    if ($viewModelStore.receiver.creator.type !== 'self') {
      log.error('Failed to remove group member, user is not the creator');
    }

    await viewModelController
      ?.removeMember(props.receiver.lookup)
      .then((success) => {
        if (success) {
          toast.addSimpleSuccess(
            $i18n.t('groups.label--remove-member-success', 'Successfully removed group member'),
          );
          return;
        }
        toast.addSimpleFailure(
          $i18n.t('groups.label--remove-member-failure', 'Could not remove group member'),
        );
      })
      .catch((error) => {
        toast.addSimpleFailure(
          $i18n.t('groups.label--remove-member-failure', 'Could not remove group member'),
        );
        log.error('Removing group member failed with error: ', error);
      });
  }

  function setDisbandModalState(intent: DisbandGroupIntent, receiver: GroupReceiverData): void {
    modalState = {
      type: 'disband-group',
      props: {
        receiver: {
          ...receiver,
          disband: async () => {
            if (viewModelController === undefined) {
              log.error('Error disbanding group: GroupDetailViewModelController was undefined');
              return false;
            }
            return await viewModelController.disband(intent);
          },
        },
        intent,
        services,
      },
    };
  }

  function setLeaveModalState(intent: LeaveGroupIntent, receiver: GroupReceiverData): void {
    modalState = {
      type: 'leave-group',
      props: {
        receiver: {
          ...receiver,
          leave: async () => {
            if (viewModelController === undefined) {
              log.error('Error leaving group: GroupDetailViewModelController was undefined');
              return false;
            }
            return await viewModelController.leave(intent);
          },
        },
        intent,
        services,
      },
    };
  }

  function handleClickDeleteGroup(): void {
    if ($viewModelStore === undefined) {
      return;
    }

    modalState = {
      type: 'delete-group',
      props: {
        receiver: {
          ...$viewModelStore.receiver,
          delete: async () => {
            if (viewModelController === undefined) {
              log.error('Error deleting group: GroupDetailViewModelController was undefined');
              return false;
            }
            return await viewModelController.delete();
          },
        },
      },
    };
  }

  function handleClickLeaveGroup(): void {
    if ($viewModelStore === undefined) {
      return;
    }
    if ($viewModelStore.receiver.creator.type === 'self') {
      setDisbandModalState('disband', $viewModelStore.receiver);
    } else {
      setLeaveModalState('leave', $viewModelStore.receiver);
    }
  }

  function handleClickLeaveAndDeleteGroup(): void {
    if ($viewModelStore === undefined) {
      return;
    }
    if ($viewModelStore.receiver.creator.type === 'self') {
      setDisbandModalState('disband-and-delete', $viewModelStore.receiver);
    } else {
      setLeaveModalState('leave-and-delete', $viewModelStore.receiver);
    }
  }

  $effect(() => {
    reactive(handleChangeRouterState, [$router]);
  });

  $effect(() => {
    reactive(handleChangeGroupDetail, [routeParams]).catch(assertUnreachable);
  });

  const receiverPreviewListProps = $derived(
    groupReceiverDataToGroupContentItemProps(viewModelStore),
  );
</script>

{#if $viewModelStore !== undefined}
  <div class="container">
    <div class="top-bar">
      <TopBar onclickback={handleClickBack} onclickclose={handleClickClose} />
    </div>

    <div class="content">
      <GroupContent
        onclickeditmembers={handleClickEditGroupMembers}
        onclickeditname={handleClickEditGroupName}
        onclickitem={handleClickItem}
        onclickprofilepicture={handleOpenProfilePictureModal}
        onclickremovemember={handleClickRemoveMember}
        onclickleavegroup={handleClickLeaveGroup}
        onlclickleaveanddeletegroup={handleClickLeaveAndDeleteGroup}
        onclickdeletegroup={handleClickDeleteGroup}
        contactPreviewList={$receiverPreviewListProps}
        receiver={$viewModelStore.receiver}
        {services}
      />
    </div>
  </div>
{/if}

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'profile-picture'}
  <ProfilePictureModal {...modalState.props} onclose={handleCloseModal} />
{:else if modalState.type === 'edit-group-name'}
  <EditGroupNameModal {...modalState.props} onclose={handleCloseModal} />
{:else if modalState.type === 'disband-group'}
  <DisbandGroupModal {...modalState.props} onclose={handleCloseModal} />
{:else if modalState.type === 'leave-group'}
  <LeaveGroupModal {...modalState.props} onclose={handleCloseModal} />
{:else if modalState.type === 'delete-group'}
  <DeleteGroupModal {...modalState.props} onclose={handleCloseModal} />
{:else}
  {svelteUnreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    overflow: hidden;

    grid-template:
      'top-bar' min-content
      'content' 1fr
      / 100%;

    .top-bar {
      grid-area: top-bar;
    }

    .content {
      grid-area: content;

      overflow-y: auto;
    }
  }
</style>
