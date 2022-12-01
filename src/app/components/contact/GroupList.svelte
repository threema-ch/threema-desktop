<script lang="ts">
  import {SwipeAreaGroup} from '#3sc/components/blocks/SwipeArea';
  import GroupListItem from '~/app/components/contact/GroupListItem.svelte';
  import {matchesGroupSearchFilter} from '~/app/components/group';
  import {type AppServices} from '~/app/types';
  import {type DbGroupUid} from '~/common/db';
  import {scrollToCenterOfView} from '~/common/dom/utils/element';
  import {ReceiverType} from '~/common/enum';
  import {type RemoteObject} from '~/common/utils/endpoint';
  import {type SetValue} from '~/common/utils/set';
  import {type IQueryableStoreValue} from '~/common/utils/store';
  import {derive} from '~/common/utils/store/derived-store';
  import {localeSort} from '~/common/utils/string';
  import {type GroupListItemSetStore} from '~/common/viewmodel/group-list-item';

  import {contactListFilter} from '.';

  /**
   * App Services.
   */
  export let services: AppServices;
  /**
   * Set of all contact view models.
   */
  export let groups: RemoteObject<GroupListItemSetStore>;

  const {router} = services;

  const swipeGroup = new SwipeAreaGroup();

  let currentGroup: SetValue<IQueryableStoreValue<typeof groups>> | undefined;

  // Filter and sort all contacts
  const sortedFilteredGroups = derive(groups, (groupSet, getAndSubscribe) =>
    [...groupSet]
      // Filter: Only include direct groups matching the search filter
      .filter((group) => {
        const viewModel = getAndSubscribe(group.viewModelStore);
        return matchesGroupSearchFilter(getAndSubscribe(contactListFilter), viewModel);
      })
      // Sort: By display name
      .sort((a, b) =>
        localeSort(getAndSubscribe(a.viewModelStore).name, getAndSubscribe(b.viewModelStore).name),
      ),
  );

  function scrollIntoViewIfConversationDisplayed(node: HTMLElement, groupUid: DbGroupUid): void {
    if (currentlyDisplayedConversationGroupUid === groupUid) {
      scrollToCenterOfView(node);
    }
  }

  let currentlyDisplayedConversationGroupUid: DbGroupUid | undefined;
  $: {
    const routeReceiverLookup = $router.main.params?.receiverLookup;
    currentlyDisplayedConversationGroupUid =
      routeReceiverLookup?.type === ReceiverType.GROUP ? routeReceiverLookup.uid : undefined;
  }
</script>

<template>
  <div class="group-preview-list">
    {#each $sortedFilteredGroups as group (group.groupUid)}
      <div class="group-preview" use:scrollIntoViewIfConversationDisplayed={group.groupUid}>
        <GroupListItem
          group={group.viewModelStore}
          {router}
          {swipeGroup}
          active={currentGroup === group}
          selectable={false}
        />
      </div>
    {/each}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .group-preview-list {
    overflow-y: auto;
    overflow-x: hidden;
    scroll-snap-type: y mandatory;

    .group-preview {
      scroll-snap-align: start;
    }
  }
</style>
