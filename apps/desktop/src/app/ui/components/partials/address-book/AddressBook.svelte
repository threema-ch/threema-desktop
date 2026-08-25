<!--
  @component Renders an address book containing the user's contacts.
-->
<script lang="ts">
  import type {u53} from '@threema/ts-utils/integer/u53';
  import {tick} from 'svelte';

  import {globals} from '~/app/globals';
  import SearchBar from '~/app/ui/components/molecules/search-bar/SearchBar.svelte';
  import TabBar from '~/app/ui/components/molecules/tab-bar/TabBar.svelte';
  import type {TabBarProps} from '~/app/ui/components/molecules/tab-bar/props';
  import {getSearchInputPlaceholderForTabState} from '~/app/ui/components/partials/address-book/helpers';
  import type {AddressBookProps} from '~/app/ui/components/partials/address-book/props';
  import type {TabState} from '~/app/ui/components/partials/address-book/types';
  import ContactAddForm from '~/app/ui/components/partials/contact-add-form/ContactAddForm.svelte';
  import GroupAddForm from '~/app/ui/components/partials/group-add-form/GroupAddForm.svelte';
  import type {ContextMenuItemHandlerProps} from '~/app/ui/components/partials/receiver-nav/types';
  import ReceiverPreviewList from '~/app/ui/components/partials/receiver-preview-list/ReceiverPreviewList.svelte';
  import {isReceiverPreviewListItemRetained} from '~/app/ui/components/partials/receiver-preview-list/helpers';
  import type {
    ReceiverPreviewListItem,
    ContextMenuItemWithHandlerProps,
    ReceiverPreviewListProps,
  } from '~/app/ui/components/partials/receiver-preview-list/props';
  import type {
    InteractionEvent,
    ReceiverPreviewListId,
  } from '~/app/ui/components/partials/receiver-preview-list/types';
  import {i18n} from '~/app/ui/i18n';
  import type {I18nType} from '~/app/ui/i18n-types';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {MAX_LAZY_RECEIVER_PREVIEWS} from '~/app/ui/utils/constants';
  import type {ScrollWindow} from '~/app/ui/utils/scroll';
  import {svelteUnreachable, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import type {AnyReceiver} from '~/common/model';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';
  import {hasProperty} from '~/common/utils/object';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.address-book');

  let {
    actions,
    componentState = 'receiver-preview-list',
    items = {contacts: [], groups: [], workSubscriptionContacts: []},
    onclickedititem,
    onclickitem,
    onselectitem,
    options = {},
    services,
    snippetTopbar,
  }: AddressBookProps = $props();

  const {router} = services;

  const {
    allowReceiverCreation = true,
    allowReceiverEditing = true,
    highlightActiveReceiver = true,
  } = $derived(options);

  let scrollWindow = $state<ScrollWindow>({
    startIndex: 0,
    endIndex: MAX_LAZY_RECEIVER_PREVIEWS,
  });

  let tabState: TabState = $state('contacts');

  let receiverPreviewListComponent =
    $state<SvelteNullableBinding<ReceiverPreviewList<ContextMenuItemHandlerProps<AnyReceiver>>>>(
      null,
    );

  let searchBarComponent = $state<SvelteNullableBinding<SearchBar>>(null);
  let searchTerm = $state<string | undefined>(undefined);
  let listElement = $state<SvelteNullableBinding<HTMLElement>>(null);

  function handleItemEntered(id: ReceiverPreviewListId): void {
    updateScrollWindow({id});
  }

  function updateScrollWindow(
    anchoredItem:
      | {
          readonly id: ReceiverPreviewListId;
        }
      | {
          readonly index: u53;
        },
  ): void {
    let targetIndex: u53 | undefined = undefined;
    if (hasProperty(anchoredItem, 'id')) {
      targetIndex = filteredPreviewListItems.findIndex((item) => item.get().id === anchoredItem.id);
    } else {
      targetIndex = anchoredItem.index;
    }

    // Do nothing if the index is invalid or the item was not found.
    if (targetIndex === undefined || targetIndex < 0) {
      return;
    }

    // Calculate start and end indices such that `targetIndex` is roughly near the middle of the
    // window.
    const start = Math.max(targetIndex - Math.floor(MAX_LAZY_RECEIVER_PREVIEWS / 2), 0);
    const end = start + MAX_LAZY_RECEIVER_PREVIEWS;

    scrollWindow = {
      startIndex: start,
      endIndex: end,
    };
  }

  /**
   * Set focus to the search bar input element and select its contents.
   */
  export function focusAndSelectSearchBar(): void {
    searchBarComponent?.focusAndSelect();
  }

  /**
   * Scroll to the list item of the receiver that matches the given `lookup`.
   */
  export async function scrollToItem(lookup: DbReceiverLookup): Promise<void> {
    let targetItemIndex: u53 | undefined = undefined;
    const targetItem = filteredPreviewListItems
      .find((item, index) => {
        const {receiver} = item.get();
        if (
          receiver.type !== 'self' &&
          receiver.lookup.type === lookup.type &&
          receiver.lookup.uid === lookup.uid
        ) {
          targetItemIndex = index;

          return true;
        }

        return false;
      })
      ?.get();
    if (targetItem === undefined || targetItemIndex === undefined) {
      return;
    }

    updateScrollWindow({index: targetItemIndex});
    try {
      await tick();
      await receiverPreviewListComponent?.scrollToItem(targetItem.id, {
        behavior: 'instant',
        block: 'start',
      });
    } catch (error) {
      log.error('AddressBook: Error scrolling to item: ', error);
    }
  }

  /**
   * Scroll to the list item of the receiver whose conversation is currently open.
   */
  export async function scrollToActiveItem(): Promise<void> {
    const routerState = router.get();

    if (routerState.main.id === 'conversation') {
      await scrollToItem(routerState.main.params.receiverLookup);
    }
  }

  function handleClickTab(newTabState: TabState): void {
    tabState = newTabState;
    // Go to the top of the list.
    scrollToFirstItem().catch(assertUnreachable);
  }

  async function handleClearSearchBar(): Promise<void> {
    /*
     * Wait for any pending state changes to be applied before scrolling to the active conversation,
     * because it might not be rendered before that (e.g., if a filter has been applied).
     */
    await tick();
    await scrollToActiveItem();
  }

  async function scrollToFirstItem(): Promise<void> {
    const firstItem = filteredPreviewListItems.at(0)?.get();
    if (firstItem === undefined) {
      return;
    }

    updateScrollWindow({index: 0});
    try {
      await tick();
      await receiverPreviewListComponent?.scrollToItem(firstItem.id, {
        behavior: 'instant',
        block: 'start',
      });
    } catch (error: unknown) {
      log.error('Error scrolling to top in AddressBook: ', error);
    }
  }

  function handleClickAddContact(): void {
    componentState = 'contact-add-form';
  }

  function handleClickAddGroup(): void {
    componentState = 'group-add-form';
    searchTerm = '';
  }

  function handleInteraction(event: InteractionEvent): void {
    switch (event.type) {
      case 'click':
        onclickitem?.(event.receiver, event.active);
        break;
      case 'select':
        onselectitem?.(event.receiver, event.selected);
        break;
      default:
        unreachable(event);
    }
  }

  function getTabBarTabs(): TabBarProps<TabState>['tabs'] {
    return [
      {
        id: 'contacts',
        icon: 'person',
        onclick: handleClickTab,
      },
      {
        id: 'groups',
        icon: 'group',
        onclick: handleClickTab,
      },
      ...(import.meta.env.BUILD_VARIANT === 'work' || import.meta.env.BUILD_VARIANT === 'custom'
        ? [
            {
              id: 'workSubscriptionContacts',
              icon: 'work_outline',
              onclick: handleClickTab,
            } as const,
          ]
        : []),
    ];
  }

  function getContextMenuItems(
    receiverPreviewListItem: ReceiverPreviewListItem<ContextMenuItemHandlerProps<AnyReceiver>>,
    currentAllowReceiverEditing: boolean,
    t: I18nType['t'],
  ): ContextMenuItemWithHandlerProps<ContextMenuItemHandlerProps<AnyReceiver>>[] {
    if (!currentAllowReceiverEditing) {
      // Don't show a context menu if editing is not allowed, as there are no other options at this time.
      return [];
    }

    switch (receiverPreviewListItem.receiver.type) {
      case 'contact':
        return [
          {
            type: 'option',
            disabled: false,
            handler: (props) => onclickedititem?.(props),
            label: t('contacts.action--edit', 'Edit'),
            icon: {
              name: 'edit',
            },
          },
        ];

      case 'distribution-list':
      case 'group':
      case 'self':
        // Don't show a context menu for group and distribution-list receivers at this time.
        return [];

      default:
        return unreachable(receiverPreviewListItem.receiver);
    }
  }

  function getFilteredPreviewListItems(
    currentTab: TabState,
    currentItems: typeof items,
    currentSearchTerm: typeof searchTerm,
  ): ReceiverPreviewListProps<ContextMenuItemHandlerProps<AnyReceiver>>['items'] {
    return currentItems[currentTab].filter((item) =>
      isReceiverPreviewListItemRetained(item, currentSearchTerm, ['contact', 'group']),
    ) as ReceiverPreviewListProps<ContextMenuItemHandlerProps<AnyReceiver>>['items'];
  }

  function resetStateToDefault(tabState_: TabState): void {
    componentState = 'receiver-preview-list';
    tabState = tabState_;
  }

  const filteredPreviewListItems = $derived(
    getFilteredPreviewListItems(tabState, items, searchTerm),
  );

  const visiblePreviewListItems = $derived.by(() => {
    if (filteredPreviewListItems.length <= MAX_LAZY_RECEIVER_PREVIEWS) {
      return filteredPreviewListItems;
    }
    return filteredPreviewListItems.slice(scrollWindow.startIndex, scrollWindow.endIndex);
  });
</script>

{#if componentState === 'receiver-preview-list'}
  <div class="container">
    {#if snippetTopbar}
      <div class="top-bar">
        {@render snippetTopbar?.()}
      </div>
    {/if}

    <div class="tab-bar">
      <TabBar tabs={getTabBarTabs()} initiallySelectedId={tabState} />
    </div>

    <div class="search">
      <SearchBar
        bind:this={searchBarComponent}
        bind:term={searchTerm}
        onclear={handleClearSearchBar}
        placeholder={getSearchInputPlaceholderForTabState(tabState, $i18n.t)}
      />
    </div>

    {#if allowReceiverCreation && (import.meta.env.BUILD_VARIANT === 'consumer' || import.meta.env.BUILD_ENVIRONMENT === 'sandbox' || import.meta.env.BUILD_MODE === 'testing') && tabState === 'contacts'}
      <button class="add" onclick={handleClickAddContact}>
        <div class="icon">
          <MdIcon theme="Filled">add</MdIcon>
        </div>
        <div class="text">
          {$i18n.t('contacts.action--add-contact', 'New Contact')}
        </div>
      </button>
    {/if}

    {#if allowReceiverCreation && (import.meta.env.BUILD_VARIANT === 'consumer' || import.meta.env.BUILD_ENVIRONMENT === 'sandbox' || import.meta.env.BUILD_MODE === 'testing') && tabState === 'groups'}
      <button class="add" onclick={handleClickAddGroup}>
        <div class="icon">
          <MdIcon theme="Filled">add</MdIcon>
        </div>
        <div class="text">
          {$i18n.t('groups.action--add-group', 'New Group')}
        </div>
      </button>
    {/if}
    <div bind:this={listElement} class="list">
      {#if visiblePreviewListItems.length > 0}
        <ReceiverPreviewList
          bind:this={receiverPreviewListComponent}
          contextMenuItems={(receiverPreviewListItem) =>
            getContextMenuItems(receiverPreviewListItem, allowReceiverEditing, $i18n.t)}
          highlights={searchTerm}
          items={visiblePreviewListItems}
          oninteraction={handleInteraction}
          onitementereddebounced={handleItemEntered}
          options={{
            highlightActiveReceiver,
          }}
          {services}
        />
      {:else}
        <!-- No receivers. -->
      {/if}
    </div>
  </div>
{:else if componentState === 'contact-add-form'}
  <ContactAddForm
    {actions}
    onclickcancel={() => resetStateToDefault('contacts')}
    onclickformcancel={() => resetStateToDefault('contacts')}
    oncreatesuccess={() => resetStateToDefault('contacts')}
    {services}
  />
{:else if componentState === 'group-add-form'}
  <GroupAddForm
    {services}
    {actions}
    contacts={items.contacts}
    onclickcancel={() => resetStateToDefault('contacts')}
    onclickformcancel={() => resetStateToDefault('groups')}
  />
{:else}
  {svelteUnreachable(componentState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    overflow: hidden;
    max-height: 100%;
    max-width: 100%;
    grid-template:
      'top-bar' min-content
      'tab-bar' minmax(rem(64px), min-content)
      '.' rem(8px)
      'search' min-content
      '.' rem(12px)
      'add' min-content
      'list' 1fr
      / 100%;

    // Logo is present.
    &:has(> .top-bar:not(:empty)) {
      grid-template:
        'top-bar' min-content
        '.' rem(8px)
        'tab-bar' minmax(rem(44px), min-content)
        '.' rem(8px)
        'search' min-content
        '.' rem(12px)
        'add' min-content
        'list' 1fr
        / 100%;
    }

    .tab-bar {
      grid-area: tab-bar;

      display: flex;
      align-items: center;
      justify-content: stretch;
      padding: 0 rem(16px);
    }

    .search {
      grid-area: search;

      padding: 0 rem(16px);
    }

    .add {
      @include def-var(--c-icon-font-size, #{rem(24px)});
      @extend %neutral-input;

      & {
        grid-area: add;

        padding: rem(10px) rem(16px) rem(10px);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: start;
        gap: rem(8px);
      }

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: rem(48px);
        height: rem(48px);
        border-radius: 50%;
        background-color: var(--cc-menu-item-icon-text-background-color--hover);
        color: var(--t-color-primary);
      }

      &:hover {
        background-color: var(--cc-menu-item-icon-text-background-color--hover);
      }

      &:active {
        .icon {
          background-color: var(--cc-menu-item-icon-text-background-color--active);
        }
      }
    }

    .list {
      grid-area: list;

      overflow-y: auto;
    }
  }
</style>
