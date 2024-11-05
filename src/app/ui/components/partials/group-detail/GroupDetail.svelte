<!--
  @component Renders the group detail pane (i.e., details about a receiver).
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import GroupContent from '~/app/ui/components/partials/group-detail/internal/group-content/GroupContent.svelte';
  import TopBar from '~/app/ui/components/partials/group-detail/internal/top-bar/TopBar.svelte';
  import type {GroupDetailProps} from '~/app/ui/components/partials/group-detail/props';
  import type {
    GroupDetailRouteParams,
    ModalState,
    RemoteGroupDetailViewModelController,
    RemoteGroupDetailViewModelStoreValue,
  } from '~/app/ui/components/partials/group-detail/types';
  import ProfilePictureModal from '~/app/ui/components/partials/modals/profile-picture-modal/ProfilePictureModal.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {reactive} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {ReceiverType, ReceiverTypeUtils} from '~/common/enum';
  import {assertUnreachable, ensureError, unreachable} from '~/common/utils/assert';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.group-detail');

  type $$Props = GroupDetailProps;

  export let services: $$Props['services'];

  const {backend, profilePicture, router} = services;

  // Params of the current route.
  let routeParams: GroupDetailRouteParams | undefined = undefined;

  // ViewModelBundle containing all the group details.
  let viewModelStore: IQueryableStore<RemoteGroupDetailViewModelStoreValue | undefined> =
    new ReadableStore(undefined);
  let viewModelController: RemoteGroupDetailViewModelController | undefined = undefined;

  let modalState: ModalState = {type: 'none'};

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
        alt: $i18n.t('groups.hint--profile-picture', 'Profile picture of {name}', {
          name: receiver.name,
        }),
        color: receiver.color,
        initials: receiver.initials,
        pictureBytes:
          profilePictureBlob === undefined
            ? undefined
            : new Uint8Array(await profilePictureBlob.arrayBuffer()),
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
    let receiver: DbReceiverLookup | undefined = undefined;
    if (routeParams !== undefined) {
      receiver = routeParams;
    }

    const viewModelStoreValue = $viewModelStore;

    // If the receiver is the same, it's not necessary to reload the `viewModelBundle`.
    if (
      receiver !== undefined &&
      receiver.type === viewModelStoreValue?.receiver.lookup.type &&
      receiver.uid === viewModelStoreValue.receiver.lookup.uid
    ) {
      return;
    }

    // If the receiver is undefined, reset `viewModelStore` and -controller.
    if (receiver === undefined) {
      viewModelStore = new ReadableStore(undefined);
      viewModelController = undefined;
      return;
    }

    await backend.viewModel
      .groupDetail(receiver)
      .then((viewModelBundle) => {
        if (viewModelBundle === undefined) {
          throw new Error('ViewModelBundle returned by the repository was undefined');
        }
        viewModelStore = viewModelBundle.viewModelStore;
        viewModelController = viewModelBundle.viewModelController;
      })
      .catch((error: unknown) => {
        log.error(
          `Failed to load detail for group with uid ${receiver.uid}: ${ensureError(error)}`,
        );

        toast.addSimpleFailure(
          i18n.get().t('groups.error--group-detail-load', 'Details could not be loaded'),
        );

        // Close aside pane.
        router.go({aside: 'close'});
      });
  }

  async function handleClickItem(
    event: CustomEvent<{lookup: DbReceiverLookup; active: boolean}>,
  ): Promise<void> {
    if (event.detail.lookup.type !== ReceiverType.CONTACT) {
      log.error(
        `Called the clickGroupMember callback with lookup of type ${ReceiverTypeUtils.nameOf(event.detail.lookup.type)} instead of contact`,
      );
      return;
    }

    await viewModelController?.setAcquaintanceLevelDirect(event.detail.lookup).catch((error) => {
      log.error(`Failed to set acquaintance level, routing to welcome: ${error}`);
      router.goToWelcome();
    });

    if (event.detail.active) {
      router.goToWelcome();
    } else {
      router.goToConversation({receiverLookup: event.detail.lookup});
    }
  }

  $: reactive(handleChangeRouterState, [$router]);
  $: reactive(handleChangeGroupDetail, [routeParams]).catch(assertUnreachable);
</script>

{#if $viewModelStore !== undefined && viewModelController !== undefined}
  <div class="container">
    <div class="top-bar">
      <TopBar on:clickback={handleClickBack} on:clickclose={handleClickClose} />
    </div>

    <div class="content">
      <GroupContent
        receiver={$viewModelStore.receiver}
        {services}
        on:clickprofilepicture={handleOpenProfilePictureModal}
        on:clickitem={handleClickItem}
      />
    </div>
  </div>
{/if}

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'profile-picture'}
  <ProfilePictureModal {...modalState.props} on:close={handleCloseModal} />
{:else}
  {unreachable(modalState)}
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
