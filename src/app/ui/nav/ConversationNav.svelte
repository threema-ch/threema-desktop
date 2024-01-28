<script lang="ts">
  import {onDestroy, onMount, tick} from 'svelte';

  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import type {AppServices} from '~/app/types';
  import MainNavBar from '~/app/ui/components/partials/main-nav-bar/MainNavBar.svelte';
  import SearchResultList from '~/app/ui/components/partials/search-result-list/SearchResultList.svelte';
  import SearchInput from '~/app/ui/generic/search/SearchInput.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {conversationPreviewListFilter} from '~/app/ui/nav/conversation';
  import ConversationNavList from '~/app/ui/nav/conversation/ConversationNavList.svelte';
  import type {Remote} from '~/common/utils/endpoint';
  import type {LocalStore} from '~/common/utils/store';
  import {derive} from '~/common/utils/store/derived-store';
  import type {ConversationPreviewTranslations} from '~/common/viewmodel/conversation-preview';
  import type {ProfileViewModelStore} from '~/common/viewmodel/profile';

  const log = globals.unwrap().uiLogging.logger('ui.component.conversation-nav');
  const hotkeyManager = globals.unwrap().hotkeyManager;

  export let services: AppServices;
  const {
    backend: {viewModel},
    router,
  } = services;

  // TODO(DESK-800): This type is incorrect, it's actually ` | undefined`. To prevent this, the
  // remote store must be passed into this component once loaded, not before.
  let profile: Remote<ProfileViewModelStore>;
  viewModel
    .profile()
    .then((loadedProfile) => {
      profile = loadedProfile;
    })
    .catch((error) => {
      log.error('Loading profile view model failed', error);
    });

  let searchInput: SearchInput | null | undefined;
  let conversationList: ConversationNavList | null | undefined;

  function handleHotkeyControlF(): void {
    searchInput?.select();
  }

  async function scrollToActiveConversation(): Promise<void> {
    /*
     * Wait for any pending state changes to be applied before scrolling to the active conversation,
     * because it might not be rendered before that (e.g., if a filter has been applied).
     */
    await tick();
    conversationList?.scrollToActiveConversation();
  }

  // TODO(DESK-1082): This translation should be entirely in the backend and not passed in.
  const translationsForBackend: LocalStore<ConversationPreviewTranslations> = derive(
    i18n,
    ({t}) => ({
      'messaging.label--default-file-message-preview': t(
        'messaging.label--default-file-message-preview',
        'File',
      ),
      'messaging.label--default-image-message-preview': t(
        'messaging.label--default-image-message-preview',
        'Image',
      ),
      'messaging.label--default-video-message-preview': t(
        'messaging.label--default-video-message-preview',
        'Video',
      ),
      'messaging.label--default-audio-message-preview': t(
        'messaging.label--default-audio-message-preview',
        'Voice Message',
      ),
    }),
  );

  onMount(() => {
    hotkeyManager.registerHotkey({control: true, code: 'KeyF'}, handleHotkeyControlF);
  });

  onDestroy(() => {
    hotkeyManager.unregisterHotkey(handleHotkeyControlF);
  });
</script>

<template>
  <div id="nav-wrapper">
    <div class="bar">
      <!-- eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -->
      {#if profile !== undefined}
        <MainNavBar
          {services}
          profilePicture={$profile.profilePicture}
          initials={$profile.initials}
          on:click-contact={() =>
            router.replaceNav(ROUTE_DEFINITIONS.nav.contactList.withoutParams())}
        />
      {/if}
    </div>
    <div class="search">
      <SearchInput
        bind:this={searchInput}
        placeholder={$i18n.t('messaging.label--search-conversation', 'Find Chat')}
        bind:value={$conversationPreviewListFilter}
        on:reset={scrollToActiveConversation}
      />
    </div>
    <div class="results">
      <SearchResultList searchTerm={$conversationPreviewListFilter} {services} />
    </div>

    {#await viewModel.conversationPreviews(translationsForBackend) then conversationPreviews}
      {#if $conversationPreviewListFilter === ''}
        <div class="conversation-preview-list">
          <ConversationNavList bind:this={conversationList} {conversationPreviews} {services} />
        </div>
      {/if}
    {/await}
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
      'bar    ' rem(40px)
      'search ' min-content
      'content' minmax(0, 1fr)
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

    .results {
      grid-area: content;

      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: start;
    }

    .conversation-preview-list {
      grid-area: content;

      display: grid;
    }
  }
</style>
