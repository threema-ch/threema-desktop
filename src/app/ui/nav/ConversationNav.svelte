<script lang="ts">
  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import SearchInput from '~/app/ui/generic/search/SearchInput.svelte';
  import {conversationPreviewListFilter} from '~/app/ui/nav/conversation';
  import ConversationNavList from '~/app/ui/nav/conversation/ConversationNavList.svelte';
  import MainNavBar from '~/app/ui/nav/MainNavBar.svelte';
  import {type Remote} from '~/common/utils/endpoint';
  import {type ProfileViewModelStore} from '~/common/viewmodel/profile';

  const log = globals.unwrap().uiLogging.logger('ui.component.conversation-nav');

  export let services: AppServices;
  const {
    backend: {viewModel},
    router,
  } = services;

  let profile: Remote<ProfileViewModelStore>;
  viewModel
    .profile()
    .then((loadedProfile) => {
      profile = loadedProfile;
    })
    .catch((error) => {
      log.error('Loading profile view model failed', error);
    });
</script>

<template>
  <div id="nav-wrapper">
    <div class="bar">
      {#if profile !== undefined}
        <MainNavBar
          profilePicture={$profile.profilePicture}
          initials={$profile.initials}
          on:click-profile-picture={() => {
            const newMainRoute =
              router.get().main.id === 'profile'
                ? ROUTE_DEFINITIONS.main.welcome.withTypedParams(undefined)
                : ROUTE_DEFINITIONS.main.profile.withTypedParams(undefined);
            router.go(router.get().nav, newMainRoute, undefined);
          }}
          on:click-contact={() =>
            router.replaceNav(ROUTE_DEFINITIONS.nav.contactList.withTypedParams(undefined))}
        />
      {/if}
    </div>
    <div class="search">
      <SearchInput placeholder={'Find Chat'} bind:value={$conversationPreviewListFilter} />
    </div>
    <div class="conversation-preview-list">
      {#await viewModel.conversationPreviews() then conversationPreviews}
        <ConversationNavList {conversationPreviews} {router} />
      {/await}
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  #nav-wrapper {
    display: grid;
    overflow: hidden;
    padding: rem(12px) 0 0;
    background-color: var(--t-nav-background-color);
    grid-template:
      'bar                      ' rem(40px)
      'search                   ' rem(44px)
      'conversation-preview-list' minmax(0, 1fr)
      / 100%;
    gap: rem(8px);

    .bar {
      padding: 0 rem(8px) 0 rem(16px);
      display: grid;
    }

    .search {
      padding: rem(4px) rem(16px) 0;
      display: grid;
    }

    .conversation-preview-list {
      display: grid;
    }
  }
</style>
