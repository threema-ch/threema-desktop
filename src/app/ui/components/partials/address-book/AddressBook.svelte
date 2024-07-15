<!--
  @component Renders an address book containing the user's contacts.
-->
<script lang="ts" generics="THandlerProps = never">
  import {createEventDispatcher, tick} from 'svelte';

  import {globals} from '~/app/globals';
  import SearchBar from '~/app/ui/components/molecules/search-bar/SearchBar.svelte';
  import TabBar from '~/app/ui/components/molecules/tab-bar/TabBar.svelte';
  import type {TabBarProps} from '~/app/ui/components/molecules/tab-bar/props';
  import {
    getSearchInputPlaceholderForTabState,
    isReceiverMatchingSearchTerm,
  } from '~/app/ui/components/partials/address-book/helpers';
  import type {AddressBookProps} from '~/app/ui/components/partials/address-book/props';
  import type {TabState} from '~/app/ui/components/partials/address-book/types';
  import ReceiverPreviewList from '~/app/ui/components/partials/receiver-preview-list/ReceiverPreviewList.svelte';
  import type {
    ReceiverPreviewListItem,
    ContextMenuItemWithHandlerProps,
  } from '~/app/ui/components/partials/receiver-preview-list/props';
  import {i18n} from '~/app/ui/i18n';
  import type {I18nType} from '~/app/ui/i18n-types';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {scrollIntoViewIfNeededAsync} from '~/app/ui/utils/scroll';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {InactiveContactsPolicy} from '~/common/enum';
  import {unreachable} from '~/common/utils/assert';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.address-book');

  // Generic parameters are not yet recognized by the linter.
  // See https://github.com/sveltejs/eslint-plugin-svelte/issues/521
  // and https://github.com/sveltejs/svelte-eslint-parser/issues/306
  // eslint-disable-next-line no-undef
  type $$Props = AddressBookProps<THandlerProps>;

  export let items: NonNullable<$$Props['items']> = [];
  export let options: NonNullable<$$Props['options']> = {};
  export let services: $$Props['services'];
  export let tabState: $$Props['tabState'] = 'contact';

  const {
    router,
    settings: {appearance},
  } = services;

  let searchBarComponent: SvelteNullableBinding<SearchBar> = null;
  let searchTerm: string | undefined = undefined;

  let receiverPreviewListComponent: SvelteNullableBinding<
    // eslint-disable-next-line no-undef
    ReceiverPreviewList<THandlerProps>
  > = null;

  let listElement: SvelteNullableBinding<HTMLElement> = null;

  const dispatch = createEventDispatcher<{
    clickadd: undefined;
    // eslint-disable-next-line no-undef
    clickedititem: THandlerProps;
  }>();

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
    await scrollIntoViewIfNeededAsync({
      container: listElement,
      element: listElement?.querySelector(`ul > li[data-receiver="${lookup.type}.${lookup.uid}"]`),
      options: {
        behavior: 'instant',
        block: 'start',
      },
      timeoutMs: 100,
    }).catch((error: unknown) => {
      log.info(`Scroll to contact was not performed: ${error}`);
    });
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
  }

  async function handleClearSearchBar(): Promise<void> {
    /*
     * Wait for any pending state changes to be applied before scrolling to the active conversation,
     * because it might not be rendered before that (e.g., if a filter has been applied).
     */
    await tick();
    await scrollToActiveItem();
  }

  function handleClickAdd(): void {
    dispatch('clickadd');
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

  function getContextMenuItems(
    // eslint-disable-next-line no-undef
    receiverPreviewListItem: ReceiverPreviewListItem<THandlerProps>,
    currentAllowReceiverEditing: boolean,
    t: I18nType['t'],
    // eslint-disable-next-line no-undef
  ): ContextMenuItemWithHandlerProps<THandlerProps>[] {
    if (!currentAllowReceiverEditing) {
      // Don't show a context menu if editing is not allowed, as there are no other options at this time.
      return [];
    }

    switch (receiverPreviewListItem.receiver.type) {
      case 'contact':
        return [
          {
            disabled: false,
            handler: (props) => dispatch('clickedititem', props),
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

  function getFilteredItems(
    currentItems: typeof items,
    currentSearchTerm: typeof searchTerm,
    currentAppearance: ReturnType<(typeof appearance)['get']>,
  ): typeof items {
    return currentItems.filter((item) => {
      // Only retain contacts that were added manually by the user.
      if (item.receiver.type === 'contact' && item.receiver.acquaintanceLevel !== 'direct') {
        return false;
      }

      // Filter inactive contacts according to the respective policy.
      if (
        currentAppearance.view.inactiveContactsPolicy === InactiveContactsPolicy.HIDE &&
        item.receiver.type === 'contact' &&
        item.receiver.isInactive
      ) {
        return false;
      }

      // Receivers of type "self" don't make sense to be displayed in the address book. In
      // practice, this case should never happen, but if such items were to be provided, we'll
      // filter them out.
      if (item.receiver.type === 'self') {
        return false;
      }

      // Filter items by `searchTerm`.
      if (currentSearchTerm !== undefined && currentSearchTerm !== '') {
        return isReceiverMatchingSearchTerm(item.receiver, currentSearchTerm);
      }

      return true;
    });
  }

  $: ({
    allowReceiverCreation = true,
    allowReceiverEditing = true,
    highlightActiveReceiver = true,
    routeOnClick = true,
  } = options);

  $: filteredItems = getFilteredItems(items, searchTerm, $appearance);
</script>

<div class="container">
  <div class="tab-bar">
    <TabBar tabs={getTabBarTabs()} />
  </div>

  <div class="search">
    <SearchBar
      bind:this={searchBarComponent}
      bind:term={searchTerm}
      onRequestRefresh={() => {}}
      placeholder={getSearchInputPlaceholderForTabState(tabState, $i18n.t)}
      on:clear={handleClearSearchBar}
    />
  </div>

  {#if allowReceiverCreation && import.meta.env.BUILD_VARIANT === 'consumer' && tabState === 'contact'}
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
    {#if filteredItems.length > 0}
      <!-- Suppress `any` type warnings, as the types are fine, but not recognized by the linter in
      Svelte. -->
      <!-- eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -->
      <ReceiverPreviewList
        bind:this={receiverPreviewListComponent}
        contextMenuItems={(receiverPreviewListItem) =>
          getContextMenuItems(receiverPreviewListItem, allowReceiverEditing, $i18n.t)}
        highlights={searchTerm}
        items={filteredItems}
        options={{
          highlightActiveReceiver,
          routeOnClick,
        }}
        {services}
        on:clickitem
      />
    {:else}
      <!-- No chats. -->
    {/if}
  </div>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    overflow: hidden;
    max-height: 100%;
    max-width: 100%;

    grid-template:
      'tab-bar' min-content
      'search' min-content
      'add' min-content
      'list' 1fr
      / 100%;

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

      overflow-y: auto;
    }
  }
</style>
