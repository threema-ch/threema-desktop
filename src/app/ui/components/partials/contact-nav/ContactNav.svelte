<!--
  @component Renders the contact navigation sidebar (i.e., the address book).
-->
<script lang="ts">
  import {onMount, tick} from 'svelte';

  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import SearchBar from '~/app/ui/components/molecules/search-bar/SearchBar.svelte';
  import TabBar from '~/app/ui/components/molecules/tab-bar/TabBar.svelte';
  import type {TabBarProps} from '~/app/ui/components/molecules/tab-bar/props';
  import {
    getContextMenuItems,
    goToSettings,
    isReceiverMatchingSearchTerm,
  } from '~/app/ui/components/partials/contact-nav/helpers';
  import TopBar from '~/app/ui/components/partials/contact-nav/internal/top-bar/TopBar.svelte';
  import type {ContactNavProps} from '~/app/ui/components/partials/contact-nav/props';
  import {contactListViewModelStoreToReceiverPreviewListPropsStore} from '~/app/ui/components/partials/contact-nav/transformers';
  import type {
    ContextMenuItemHandlerProps,
    ModalState,
    RemoteContactListViewModelStoreValue,
    TabState,
  } from '~/app/ui/components/partials/contact-nav/types';
  import EditContactModal from '~/app/ui/components/partials/modals/edit-contact-modal/EditContactModal.svelte';
  import ReceiverPreviewList from '~/app/ui/components/partials/receiver-preview-list/ReceiverPreviewList.svelte';
  import type {ReceiverPreviewListItem} from '~/app/ui/components/partials/receiver-preview-list/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {scrollIntoViewIfNeededAsync} from '~/app/ui/utils/scroll';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {display} from '~/common/dom/ui/state';
  import {ConnectionState, InactiveContactsPolicy} from '~/common/enum';
  import type {AnyReceiver} from '~/common/model';
  import {ensureError, unreachable} from '~/common/utils/assert';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';

  const {uiLogging, hotkeyManager} = globals.unwrap();
  const log = uiLogging.logger('ui.component.contact-nav');

  type $$Props = ContactNavProps;

  export let services: $$Props['services'];

  const {
    backend,
    router,
    settings: {appearance},
  } = services;

  // ViewModelBundle containing all contacts.
  let viewModelStore: IQueryableStore<RemoteContactListViewModelStoreValue | undefined> =
    new ReadableStore(undefined);

  let modalState: ModalState = {type: 'none'};
  let tabState: TabState = 'contact';

  let searchBarComponent: SvelteNullableBinding<SearchBar> = null;
  let searchTerm: string | undefined = undefined;

  let receiverPreviewListComponent: SvelteNullableBinding<
    ReceiverPreviewList<ContextMenuItemHandlerProps<AnyReceiver>>
  > = null;

  let listElement: SvelteNullableBinding<HTMLElement> = null;

  function handleHotkeyControlF(): void {
    searchBarComponent?.focusAndSelect();
  }

  function handleClickBackButton(): void {
    router.replaceNav(ROUTE_DEFINITIONS.nav.conversationList.withoutParams());
  }

  function handleClickSettingsButton(): void {
    goToSettings(router, $display);
  }

  function handleClickTab(newTabState: TabState): void {
    tabState = newTabState;
  }

  function handleClickAdd(): void {
    // If the connection is currently inactive, don't allow entering the contact creation wizard.
    if (backend.connectionState.get() !== ConnectionState.CONNECTED) {
      toast.addSimpleFailure(
        i18n
          .get()
          .t(
            'contacts.error--add-contact',
            'Unable to add contact. Please check your Internet connection.',
          ),
      );
      return;
    }

    router.replaceNav(ROUTE_DEFINITIONS.nav.contactAdd.withTypedParams({identity: undefined}));
  }

  async function handleClearSearchBar(): Promise<void> {
    /*
     * Wait for any pending state changes to be applied before scrolling to the active conversation,
     * because it might not be rendered before that (e.g., if a filter has been applied).
     */
    await tick();
    await scrollToActiveItem();
  }

  function handleCloseModal(): void {
    modalState = {
      type: 'none',
    };
  }

  function handleOpenEditModal(
    item: ReceiverPreviewListItem<ContextMenuItemHandlerProps<AnyReceiver>>,
    props: ContextMenuItemHandlerProps<AnyReceiver>,
  ): void {
    const {receiver} = item;
    if (receiver.type !== 'contact') {
      return;
    }

    modalState = {
      type: 'edit-contact',
      props: {
        receiver: {
          ...receiver,
          edit: async (update) => {
            await props.viewModelBundle.viewModelController.edit(update);
          },
        },
        services,
      },
    };
  }

  function getTabBarTabs(): TabBarProps<TabState>['tabs'] {
    return [
      {
        id: 'contact',
        icon: 'person',
        onClick: handleClickTab,
      },
      {
        id: 'group',
        icon: 'group',
        onClick: handleClickTab,
      },
      ...(import.meta.env.BUILD_VARIANT === 'work'
        ? [
            {
              id: 'work-subscription-contact',
              icon: 'work_outline',
              onClick: handleClickTab,
            } as const,
          ]
        : []),
    ];
  }

  async function scrollToItem(lookup: DbReceiverLookup): Promise<void> {
    await scrollIntoViewIfNeededAsync({
      container: listElement,
      element: listElement?.querySelector(
        `ul > li[data-receiver="${`${lookup.type}.${lookup.uid}`}"]`,
      ),
      options: {
        behavior: 'instant',
        block: 'start',
      },
      timeoutMs: 100,
    }).catch((error) => {
      log.info(`Scroll to contact was not performed: ${error}`);
    });
  }

  async function scrollToActiveItem(): Promise<void> {
    const routerState = router.get();

    if (routerState.main.id === 'conversation') {
      await scrollToItem(routerState.main.params.receiverLookup);
    }
  }

  // Current list items.
  $: receiverPreviewListPropsStore = contactListViewModelStoreToReceiverPreviewListPropsStore(
    viewModelStore,
    tabState,
    (item, getAndSubscribe) => {
      const appearanceSettings = getAndSubscribe(appearance);
      if (
        appearanceSettings.view.inactiveContactsPolicy === InactiveContactsPolicy.HIDE &&
        item.receiver.type === 'contact' &&
        item.receiver.isInactive
      ) {
        return false;
      }
      if (item.receiver.type === 'self') {
        return false;
      }

      if (searchTerm !== undefined && searchTerm !== '') {
        return isReceiverMatchingSearchTerm(item.receiver, searchTerm);
      }

      return true;
    },
  );

  onMount(async () => {
    await backend.viewModel
      .contactList()
      .then((viewModelBundle) => {
        // Replace `viewModelBundle`.
        viewModelStore = viewModelBundle.viewModelStore;
      })
      .catch((error) => {
        log.error(`Failed to load ContactListViewModelBundle: ${ensureError(error)}`);

        toast.addSimpleFailure(
          i18n.get().t('contacts.error--contact-list-load', 'Contacts could not be loaded'),
        );
      });

    await scrollToActiveItem();
  });

  onMount(() => {
    hotkeyManager.registerHotkey({control: true, code: 'KeyF'}, handleHotkeyControlF);

    return () => {
      hotkeyManager.unregisterHotkey(handleHotkeyControlF);
    };
  });
</script>

<div class="container">
  <div class="top-bar">
    <TopBar
      on:clickbackbutton={handleClickBackButton}
      on:clicksettingsbutton={handleClickSettingsButton}
    />
  </div>

  <div class="tab-bar">
    <TabBar tabs={getTabBarTabs()} />
  </div>

  <div class="search">
    <SearchBar
      bind:this={searchBarComponent}
      bind:term={searchTerm}
      onRequestRefresh={() => {}}
      placeholder={$i18n.t('search.label--search-input-placeholder', 'Search...')}
      on:clear={handleClearSearchBar}
    />
  </div>

  {#if import.meta.env.BUILD_VARIANT === 'consumer' && tabState === 'contact'}
    <button class="add" on:click={handleClickAdd}>
      <div class="icon">
        <MdIcon theme="Filled">add</MdIcon>
      </div>
      <div class="text">
        {$i18n.t('contacts.action--add-contact', 'New Contact')}
      </div>
    </button>
  {/if}

  <div bind:this={listElement} class="list">
    {#if $receiverPreviewListPropsStore !== undefined && $receiverPreviewListPropsStore.items.length > 0}
      <!-- Suppress `any` type warnings, as the types are fine, but not recognized by the linter
      in Svelte. -->
      <!-- eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -->
      <ReceiverPreviewList
        bind:this={receiverPreviewListComponent}
        contextMenuItems={(item) => {
          switch (item.receiver.type) {
            case 'contact':
              return getContextMenuItems(item, $i18n, handleOpenEditModal);

            case 'distribution-list':
            case 'group':
            case 'self':
              // Don't show a context menu for group and distribution-list receivers at this time.
              return [];

            default:
              return unreachable(item.receiver);
          }
        }}
        {...$receiverPreviewListPropsStore}
        {services}
      />
    {:else}
      <!-- No chats. -->
    {/if}
  </div>
</div>

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'edit-contact'}
  <EditContactModal {...modalState.props} on:close={handleCloseModal} />
{:else}
  {unreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    overflow: hidden;
    background-color: var(--t-nav-background-color);

    grid-template:
      'top-bar' min-content
      'tab-bar' min-content
      'search' min-content
      'add' min-content
      'list' 1fr
      / 100%;

    .top-bar {
      grid-area: top-bar;
    }

    .tab-bar {
      grid-area: tab-bar;

      padding: 0 rem(16px) rem(16px);
    }

    .search {
      grid-area: search;

      padding: 0 rem(16px) rem(12px);
    }

    .add {
      grid-area: add;

      @extend %neutral-input;
      @include def-var(--c-icon-font-size, #{rem(24px)});

      padding: 0 rem(16px) rem(4px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: start;
      gap: rem(8px);

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: rem(48px);
        height: rem(48px);
        border-radius: 50%;
        color: var(--t-color-primary);
      }

      &:hover {
        .icon {
          background-color: var(--cc-menu-item-icon-text-background-color--hover);
        }
      }

      &:active {
        .icon {
          background-color: var(--cc-menu-item-icon-text-background-color--active);
        }
      }
    }

    .list {
      grid-area: list;

      overflow-y: scroll;
    }
  }
</style>
