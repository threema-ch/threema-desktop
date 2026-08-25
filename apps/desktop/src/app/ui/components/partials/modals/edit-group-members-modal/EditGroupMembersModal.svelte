<script lang="ts">
  import {SvelteMap} from 'svelte/reactivity';

  import {globals} from '~/app/globals';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import SearchBar from '~/app/ui/components/molecules/search-bar/SearchBar.svelte';
  import type {EditGroupMembersModalProps} from '~/app/ui/components/partials/modals/edit-group-members-modal/props';
  import {groupEditViewModelStoreToContactList} from '~/app/ui/components/partials/modals/edit-group-members-modal/transformers';
  import type {
    EditGroupMembersRouteParams,
    RemoteGroupEditViewModelController,
    RemoteGroupEditViewModelStoreValue,
  } from '~/app/ui/components/partials/modals/edit-group-members-modal/types';
  import ReceiverPreviewList from '~/app/ui/components/partials/receiver-preview-list/ReceiverPreviewList.svelte';
  import {buildFilteredAndSummaryItems} from '~/app/ui/components/partials/receiver-preview-list/helpers';
  import type {InteractionEvent} from '~/app/ui/components/partials/receiver-preview-list/types';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {reactive} from '~/app/ui/utils/svelte';
  import type {DbContactUid, DbGroupReceiverLookup} from '~/common/db';
  import {assertUnreachable} from '~/common/utils/assert';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';
  import {isContactReceiverData, isSelfReceiverData} from '~/common/viewmodel/utils/receiver';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.edit-group-members-modal');

  const {services}: EditGroupMembersModalProps = $props();

  const {
    backend,
    router,
    settings: {
      views: {appearance},
    },
  } = services;

  // Explicit local overrides of the server-side membership, keyed by contact uid. A missing entry
  // means "no local change", i.e. defer to `currentGroupMembers`.
  const memberIntent = new SvelteMap<DbContactUid, 'added' | 'removed'>();

  let routeParams: EditGroupMembersRouteParams | undefined = $state<
    EditGroupMembersRouteParams | undefined
  >(undefined);

  let searchTerm = $state<string | undefined>(undefined);

  // ViewModelBundle containing all receivers.
  let viewModelStore = $state<IQueryableStore<RemoteGroupEditViewModelStoreValue | undefined>>(
    new ReadableStore(undefined),
  );
  let viewModelController: RemoteGroupEditViewModelController | undefined = undefined;

  function handleChangeRouterState(): void {
    const routerState = $router;
    if (routerState.modal?.id === 'editGroupMembers') {
      routeParams = routerState.modal.params;
    } else {
      // If no detail is open, reset `routeParams` to `undefined` to clear the view.
      routeParams = undefined;
    }
  }

  async function handleChangeRouteParams(): Promise<void> {
    let receiver: DbGroupReceiverLookup | undefined = undefined;
    if (routeParams !== undefined) {
      receiver = routeParams;
    }

    // If the receiver is the same, it's not necessary to reload the `viewModelBundle`.
    if (
      receiver !== undefined &&
      receiver.type === $viewModelStore?.groupReceiverData.lookup.type &&
      receiver.uid === $viewModelStore?.groupReceiverData.lookup.uid
    ) {
      return;
    }

    // If the receiver is undefined, reset `viewModelStore` and `viewModelController`.
    if (receiver === undefined) {
      viewModelStore = new ReadableStore(undefined);
      viewModelController = undefined;
      return;
    }

    const unproxiedReceiver = $state.snapshot(routeParams) as unknown as DbGroupReceiverLookup;

    await backend.viewModel.groupEdit(unproxiedReceiver).then((viewModelBundle) => {
      if (viewModelBundle === undefined) {
        throw new Error('ViewModelBundle returned by the repository was undefined');
      }

      // If the user is not the creator, show a toast and route away.
      if (viewModelBundle.viewModelStore.get()?.groupReceiverData.creator.type !== 'self') {
        toast.addSimpleFailure(
          $i18n.t(
            'groups.error--group-edit-not-creator',
            'You cannot edit the group because you are not the creator',
          ),
        );
        router.go({...$router, modal: 'close'});
      }

      viewModelStore = viewModelBundle.viewModelStore;
      viewModelController = viewModelBundle.viewModelController;
    });
  }

  function closeModal(): void {
    router.go({...$router, modal: 'close'});
  }

  async function setGroupMembers(): Promise<void> {
    if (viewModelController === undefined) {
      log.error('Error editing group members: The GroupEditController was undefined');
      return;
    }

    // Return early if nothing changed.
    const equalSetSize = selectedMembers.size === currentGroupMembers.size;
    let equalSets = equalSetSize;
    if (equalSetSize) {
      for (const member of selectedMembers) {
        if (!currentGroupMembers.has(member)) {
          equalSets = false;
          break;
        }
      }
    }
    if (equalSets) {
      closeModal();
      return;
    }

    try {
      const success = await viewModelController.setMembers(selectedMembers);
      if (!success) {
        toast.addSimpleFailure(
          $i18n.t('dialog--edit-group.error--edit-group-members', 'Failed to edit group members'),
        );
        return;
      }

      toast.addSimpleSuccess(
        $i18n.t(
          'dialog--edit-group.success--edit-group-members',
          'Group members successfully edited',
        ),
      );
      closeModal();
    } catch (error) {
      log.error(`Failed to update group: ${error}`);

      toast.addSimpleFailure(
        $i18n.t('dialog--edit-group.error--edit-group-members', 'Failed to edit group members'),
      );
    }
  }

  function handleInteraction(event: InteractionEvent): void {
    if (event.type !== 'select') {
      return;
    }

    const {receiver, selected} = event;

    if (!isContactReceiverData(receiver)) {
      log.debug('EditGroupMembers receiver list should only contain contacts');
      return;
    }
    const uid = receiver.lookup.uid;

    if (selected === currentGroupMembers.has(uid)) {
      // The new state matches the server truth, so there's no local change to track.
      memberIntent.delete(uid);
    } else {
      memberIntent.set(uid, selected ? 'added' : 'removed');
    }
  }

  const currentGroupMembers = $derived(
    new Set(
      $viewModelStore?.groupReceiverData.members.flatMap((member) => {
        // This typecheck is necessary for us to extract the uid below. It should, however, never
        // happen in practice.
        if (isSelfReceiverData(member)) {
          return [];
        }
        return member.lookup.uid;
      }),
    ),
  );

  $effect(() => reactive(handleChangeRouterState, [$router]));
  $effect(() => {
    reactive(handleChangeRouteParams, [routeParams]).catch(assertUnreachable);
  });

  const selectedMembers = $derived.by(() => {
    // `members` is a scratch value scoped to this derivation pass only; it is never held across
    // renders, so reactivity on the Set itself is unnecessary.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const members = new Set(currentGroupMembers);

    memberIntent.forEach((intent, uid) =>
      intent === 'added' ? members.add(uid) : members.delete(uid),
    );

    return members;
  });

  const receiverPreviewListProps = $derived(
    groupEditViewModelStoreToContactList(viewModelStore, $appearance),
  );

  const {filteredSelectableContacts, summaryContacts} = $derived(
    buildFilteredAndSummaryItems($receiverPreviewListProps, selectedMembers, searchTerm),
  );
</script>

{#if filteredSelectableContacts.length > 0}
  <Modal
    wrapper={{
      type: 'card',
      actions: [
        {
          iconName: 'close',
          onclick: 'close',
        },
      ],
      buttons: [
        {
          label: $i18n.t('dialog--common.action--cancel', 'Cancel'),
          type: 'naked',
          onclick: 'close',
        },
        {
          label: $i18n.t('dialog--common.action--save', 'Save'),
          onclick: 'submit',
          type: 'filled',
        },
      ],
      title: $i18n.t('dialog--edit-group-members.label--title', 'Edit Group Members'),
      maxWidth: 520,
    }}
    onsubmit={setGroupMembers}
    onclose={closeModal}
  >
    <div class="search">
      <SearchBar
        bind:term={searchTerm}
        placeholder={$i18n.t('contacts.label--search-private-contacts', 'Search Contacts')}
        onclear={() => {}}
      />
    </div>
    <div class="content">
      <div class="list">
        <ReceiverPreviewList
          highlights={searchTerm}
          items={filteredSelectableContacts}
          summaryItems={summaryContacts}
          oninteraction={handleInteraction}
          {services}
        />
      </div>
    </div>
  </Modal>
{/if}

<style lang="scss">
  @use 'component' as *;
  .search {
    padding: 0 rem(16px) rem(12px);
  }

  .content {
    grid-area: content;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;
    gap: rem(8px);
    height: rem(460px);

    .list {
      grid-area: list;
      overflow-y: auto;
    }
  }
</style>
