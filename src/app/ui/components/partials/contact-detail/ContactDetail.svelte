<!--
  @component Renders the contact detail pane (i.e., details about a receiver).
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import ContactContent from '~/app/ui/components/partials/contact-detail/internal/contact-content/ContactContent.svelte';
  import GroupContent from '~/app/ui/components/partials/contact-detail/internal/group-content/GroupContent.svelte';
  import TopBar from '~/app/ui/components/partials/contact-detail/internal/top-bar/TopBar.svelte';
  import type {ContactDetailProps} from '~/app/ui/components/partials/contact-detail/props';
  import type {
    ModalState,
    RemoteContactDetailViewModelStoreValue,
    ContactDetailRouteParams,
  } from '~/app/ui/components/partials/contact-detail/types';
  import EditContactModal from '~/app/ui/components/partials/modals/edit-contact-modal/EditContactModal.svelte';
  import ProfilePictureModal from '~/app/ui/components/partials/modals/profile-picture-modal/ProfilePictureModal.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {reactive} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {ReceiverType} from '~/common/enum';
  import type {AnyReceiver} from '~/common/model';
  import {assertUnreachable, ensureError, unreachable} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import {hasProperty} from '~/common/utils/object';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';
  import type {ContactDetailViewModelBundle} from '~/common/viewmodel/contact/detail';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.contact-detail');

  type $$Props = ContactDetailProps;

  export let services: $$Props['services'];

  const {backend, profilePicture, router} = services;

  // Params of the current route.
  let routeParams: ContactDetailRouteParams | undefined = undefined;

  // ViewModelBundle containing all contacts.
  let viewModelStore: IQueryableStore<RemoteContactDetailViewModelStoreValue | undefined> =
    new ReadableStore(undefined);
  let viewModelController:
    | Remote<ContactDetailViewModelBundle<AnyReceiver>>['viewModelController']
    | undefined = undefined;

  let modalState: ModalState = {type: 'none'};

  function handleClickBack(): void {
    router.closeAside();
  }

  function handleClickClose(): void {
    router.closeAside();
  }

  function handleCloseModal(): void {
    modalState = {
      type: 'none',
    };
  }

  function handleOpenEditModal(): void {
    if ($viewModelStore?.receiver === undefined) {
      log.error('Error opening edit modal: receiver is undefined');
      return;
    }

    const {receiver} = $viewModelStore;
    if (receiver.type !== 'contact') {
      return;
    }

    modalState = {
      type: 'edit-contact',
      props: {
        receiver: {
          ...receiver,
          edit: async (update) => {
            if (viewModelController === undefined) {
              throw new Error(
                'Error editing receiver: ContactDetailViewModelController was undefined',
              );
            }

            await viewModelController.edit(update);
          },
        },
        services,
      },
    };
  }

  async function handleOpenProfilePictureModal(): Promise<void> {
    if ($viewModelStore?.receiver === undefined) {
      log.error('Error opening profile picture modal: receiver is undefined');
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
        alt: $i18n.t('settings.hint--own-profile-picture'),
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

    if (routerState.aside?.id === 'contactDetails' || routerState.aside?.id === 'groupDetails') {
      routeParams = routerState.aside.params;
    } else {
      // If no detail is open, reset `routeParams` to `undefined` to clear the view.
      routeParams = undefined;
    }
  }

  async function handleChangeContactDetail(): Promise<void> {
    let receiver: DbReceiverLookup | undefined = undefined;
    if (routeParams !== undefined) {
      if (hasProperty(routeParams, 'contactUid')) {
        receiver = {
          type: ReceiverType.CONTACT,
          uid: routeParams.contactUid,
        };
      } else if (hasProperty(routeParams, 'groupUid')) {
        receiver = {
          type: ReceiverType.GROUP,
          uid: routeParams.groupUid,
        };
      }
    }

    // If the receiver is the same, it's not necessary to reload the `viewModelBundle`.
    if (
      receiver !== undefined &&
      receiver.type === $viewModelStore?.receiver.lookup.type &&
      receiver.uid === $viewModelStore.receiver.lookup.uid
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
      .contactDetail(receiver)
      .then((viewModelBundle) => {
        if (viewModelBundle === undefined) {
          throw new Error('ViewModelBundle returned by the repository was undefined');
        }

        // Replace `viewModelBundle`.
        viewModelStore = viewModelBundle.viewModelStore;
        viewModelController = viewModelBundle.viewModelController;
      })
      .catch((error: unknown) => {
        log.error(`Failed to load detail for receiver uid ${receiver?.uid}: ${ensureError(error)}`);

        toast.addSimpleFailure(
          i18n.get().t('contacts.error--contact-detail-load', 'Details could not be loaded'),
        );

        // Close aside pane.
        router.closeAside();
      });
  }

  $: reactive(handleChangeRouterState, [$router]);
  $: reactive(handleChangeContactDetail, [routeParams]).catch(assertUnreachable);
</script>

{#if $viewModelStore !== undefined && viewModelController !== undefined}
  <div class="container">
    <div class="top-bar">
      <TopBar
        receiver={$viewModelStore.receiver}
        on:clickback={handleClickBack}
        on:clickclose={handleClickClose}
      />
    </div>

    <div class="content">
      {#if $viewModelStore.receiver.type === 'contact'}
        <ContactContent
          receiver={$viewModelStore.receiver}
          {services}
          on:clickedit={handleOpenEditModal}
          on:clickprofilepicture={handleOpenProfilePictureModal}
        />
      {:else if $viewModelStore.receiver.type === 'distribution-list'}
        <!-- TODO -->
      {:else if $viewModelStore.receiver.type === 'group'}
        <GroupContent
          receiver={$viewModelStore.receiver}
          {services}
          on:clickprofilepicture={handleOpenProfilePictureModal}
        />
      {:else}
        {unreachable($viewModelStore.receiver)}
      {/if}
    </div>
  </div>
{/if}

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'edit-contact'}
  <EditContactModal {...modalState.props} on:close={handleCloseModal} />
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
