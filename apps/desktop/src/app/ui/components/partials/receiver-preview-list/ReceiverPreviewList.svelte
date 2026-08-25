<!--
  @component Renders a list of preview cards for the given receivers.
-->
<script lang="ts" generics="THandlerProps = never">
  import {AsyncLock} from '@threema/ts-utils/lock/async-lock';
  import {TIMER} from '@threema/ts-utils/timer/global-timer';
  import {AvatarSelectionSummary, type AvatarSelectionSummaryItem} from '@threema/ui';
  import {onDestroy} from 'svelte';
  import {SvelteMap} from 'svelte/reactivity';

  import {globals} from '~/app/globals';
  import LazyList from '~/app/ui/components/hocs/lazy-list/LazyList.svelte';
  import type {ConversationRouteParams} from '~/app/ui/components/partials/conversation/types';
  import ReceiverPreview from '~/app/ui/components/partials/receiver-preview-list/internal/receiver-preview/ReceiverPreview.svelte';
  import type {
    ReceiverPreviewListItem,
    ReceiverPreviewListProps,
  } from '~/app/ui/components/partials/receiver-preview-list/props';
  import {transformContextMenuItemsToContextMenuOptions} from '~/app/ui/components/partials/receiver-preview-list/transformers';
  import {i18n} from '~/app/ui/i18n';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbContactReceiverLookup} from '~/common/db';
  import {assertUnreachable} from '~/common/utils/assert';
  import type {StoreUnsubscriber} from '~/common/utils/store';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.receiver-preview-list');

  const {
    contextMenuItems = undefined,
    highlights = undefined,
    items = [],
    summaryItems,
    oninteraction,
    onitementereddebounced = () => {},
    options = {},
    services,
  }: ReceiverPreviewListProps<THandlerProps> = $props();

  const {router} = services;

  const initiallyVisibleItemId = items?.at(0)?.get().id;

  let routeParams = $state<ConversationRouteParams | undefined>(undefined);
  let containerElement = $state<SvelteNullableBinding<HTMLElement>>(null);
  let lazyListComponent =
    $state<SvelteNullableBinding<LazyList<ReceiverPreviewListItem<THandlerProps>>>>(null);

  /**
   * Profile pictures of the currently selected contacts, keyed by {@link profilePictureKeyFor}.
   */
  const profilePictures = new SvelteMap<string, Blob | undefined>();
  /**
   * Unsubscribers of the profile picture stores which are currently subscribed to. Note: Reactivity
   * is skipped on purpose, as this is lifecycle bookkeeping which the template must not depend on.
   * Only ever mutated inside {@link profilePictureLock}.
   */
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const profilePictureUnsubscribers = new Map<string, StoreUnsubscriber>();
  const profilePictureLock = new AsyncLock();
  let isDestroyed = false;

  /**
   * Returns a key which uniquely identifies the profile picture of the given contact.
   */
  function profilePictureKeyFor(lookup: DbContactReceiverLookup): string {
    return `${lookup.type}.${lookup.uid}`;
  }

  /**
   * The contacts which are currently selected. Note: Deliberately does not include the contacts'
   * profile pictures, so that the `$effect` which loads them does not depend on the state it writes
   * to.
   */
  const avatarSelectionSummaryItemData = $derived(
    summaryItems === undefined
      ? []
      : summaryItems.flatMap((item) => {
          const itemData = item.get();
          const {receiver, interaction} = itemData;

          if (receiver.type !== 'contact' || interaction?.mode !== 'select') {
            return [];
          }

          const {name, lookup, initials, color} = receiver;

          return receiver.isCreator !== true && interaction.isSelected
            ? {
                actions: {
                  remove: {
                    label: $i18n.t('groups.action--remove-member', {name}),
                    onclick: () => oninteraction?.({type: 'select', receiver, selected: false}),
                  },
                },
                color,
                description: $i18n.t('contacts.hint--profile-picture', {name}),
                id: itemData.id,
                initials,
                key: profilePictureKeyFor(lookup),
                label: name,
                lookup,
              }
            : [];
        }),
  );

  const avatarSelectionSummaryItems: AvatarSelectionSummaryItem[] = $derived(
    avatarSelectionSummaryItemData.map(({key, lookup, ...rest}) => ({
      ...rest,
      image: profilePictures.get(key),
    })),
  );

  /**
   * Subscribes to the profile pictures of the currently selected contacts and unsubscribes from the
   * profile pictures of contacts which are no longer selected.
   *
   * Note: This runs inside a lock because the check for an existing subscription and the
   * subscription itself are separated by an `await`, so unserialized runs would subscribe to the
   * profile picture of the same contact more than once (compare the cache lock of the
   * `ProfilePictureService`).
   */
  async function updateProfilePictures(
    contacts: typeof avatarSelectionSummaryItemData,
  ): Promise<void> {
    await profilePictureLock.with(async () => {
      for (const {key, lookup} of contacts) {
        if (profilePictureUnsubscribers.has(key)) {
          continue;
        }

        const store = await services.profilePicture
          .getProfilePictureForReceiver(lookup)
          .catch((error: unknown) => {
            log.warn(`Failed to fetch profile picture store: ${error}`);
            return undefined;
          });

        // The component might have been destroyed while the store was being fetched. Note: The
        // lock does not cover this, as its queue is not bound to the component's lifecycle.
        if (isDestroyed) {
          return;
        }
        if (store === undefined) {
          continue;
        }

        profilePictureUnsubscribers.set(
          key,
          store.subscribe((value) => profilePictures.set(key, value?.blob)),
        );
      }

      // Note: Subscriptions are pruned here instead of in the teardown of the `$effect` below,
      // because `items` changes on every keystroke in a search field, and unsubscribing from all
      // profile pictures on every such change would make the avatars flicker.
      const selectedKeys = new Set(contacts.map(({key}) => key));
      for (const [key, unsubscribe] of profilePictureUnsubscribers) {
        if (selectedKeys.has(key)) {
          continue;
        }

        unsubscribe();
        profilePictureUnsubscribers.delete(key);
        profilePictures.delete(key);
      }
    });
  }

  /**
   * Scrolls the view to the item with the given id. Note: If the item is not already present, the
   * view will not scroll.
   */
  export async function scrollToItem(
    id: ReceiverPreviewListItem<THandlerProps>['id'],
    scrollIntoViewOptions?: ScrollIntoViewOptions,
  ): Promise<void> {
    return await lazyListComponent?.scrollToItem(id, scrollIntoViewOptions);
  }

  function handleChangeRouterState(): void {
    const routerState = router.get();

    if (routerState.main.id === 'conversation') {
      routeParams = routerState.main.params;
    } else {
      // If we are not in a conversation, reset `routeParams` to `undefined` to clear the view.
      routeParams = undefined;
    }
  }

  const handleItemEntered = TIMER.debounce(
    (item: ReceiverPreviewListItem<unknown>) => onitementereddebounced(item.id),
    100,
    false,
  );

  $effect(() => {
    reactive(handleChangeRouterState, [$router]);
  });

  $effect(() => {
    updateProfilePictures(avatarSelectionSummaryItemData).catch(assertUnreachable);
  });

  onDestroy(() => {
    isDestroyed = true;

    for (const unsubscribe of profilePictureUnsubscribers.values()) {
      unsubscribe();
    }
    profilePictureUnsubscribers.clear();
    profilePictures.clear();
  });
</script>

<div bind:this={containerElement} class="container">
  {#if avatarSelectionSummaryItems.length > 0}
    <div class="px-4 pb-3">
      <AvatarSelectionSummary
        heading={$i18n.t(
          'groups.label--members-selected',
          '{n, plural, =1 {1 member selected} other {# members selected}}',
          {n: avatarSelectionSummaryItems.length},
        )}
        items={avatarSelectionSummaryItems}
      />
    </div>
  {/if}
  {#if items.length === 0}
    <!--Empty `ConversationPreviewList` list-->
  {:else}
    <LazyList
      bind:this={lazyListComponent}
      {items}
      onitementered={handleItemEntered}
      visibleItemId={initiallyVisibleItemId}
    >
      {#snippet snippetItem(item)}
        {@const itemData = item.get()}
        {@const {receiver, interaction} = itemData}
        {@const active =
          receiver.type === 'self'
            ? false
            : routeParams?.receiverLookup.type === receiver.lookup.type &&
              routeParams.receiverLookup.uid === receiver.lookup.uid}

        <ReceiverPreview
          active={active && options.highlightActiveReceiver !== false}
          contextMenuOptions={contextMenuItems === undefined
            ? undefined
            : {
                container: containerElement,
                ...transformContextMenuItemsToContextMenuOptions(item, contextMenuItems),
              }}
          {highlights}
          {interaction}
          {oninteraction}
          options={{
            highlightWhenActive: options.highlightActiveReceiver,
          }}
          {services}
          store={item}
        />
      {/snippet}
    </LazyList>
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;

    list-style-type: none;
    margin: 0;
    padding: 0;
    max-width: 100%;
    height: 100%;
  }
</style>
