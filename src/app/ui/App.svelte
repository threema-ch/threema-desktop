<script lang="ts">
  import {type SvelteComponent, onMount} from 'svelte';

  import {dragEvents} from '#3sc/utils/dragdrop';
  import SuccessLinked from '~/app/components/bootstrap/SuccessLinked.svelte';
  import DebugPanel from '~/app/components/debug/DebugPanel.svelte';
  import NetworkAlert from '~/app/components/notification/NetworkAlert.svelte';
  import AsideContactDetails from '~/app/ui/aside/ContactDetails.svelte';
  import AsideGroupDetails from '~/app/ui/aside/GroupDetails.svelte';
  import MainConversation from '~/app/ui/main/Conversation.svelte';
  import MainProfile from '~/app/ui/main/Profile.svelte';
  import MainWelcome from '~/app/ui/main/Welcome.svelte';
  import ModalContactEdit from '~/app/ui/modal/ContactEdit.svelte';
  import ModalGroupEdit from '~/app/ui/modal/GroupEdit.svelte';
  import NavContactAdd from '~/app/ui/nav/ContactAdd.svelte';
  import NavContactAddDetail from '~/app/ui/nav/ContactAddDetail.svelte';
  import NavContactList from '~/app/ui/nav/ContactList.svelte';
  import NavConversationList from '~/app/ui/nav/ConversationList.svelte';
  import Snackbar from '~/app/ui/snackbar/Snackbar.svelte';
  import {type AppServices} from '~/app/types';
  import {DisplayModeObserver, manageLayout} from '~/common/dom/ui/layout';
  import {display, layout} from '~/common/dom/ui/state';
  import {ConnectionState} from '~/common/network/protocol/state';
  import {unreachable} from '~/common/utils/assert';

  export let isNewIdentity: boolean;

  export let services: AppServices;

  // Unpack router
  const {router} = services;

  // Unpack stores
  const {debugPanelState} = services.storage;
  const {connectionState} = services.backend;

  // Create display mode observer
  const displayModeObserver = new DisplayModeObserver(display);

  // Set initial display mode and manage the layout
  onMount(() => {
    displayModeObserver.update();
    return manageLayout({display, router}, layout);
  });

  function toggleDebugPanel(): void {
    $debugPanelState = $debugPanelState === 'show' ? 'hide' : 'show';
  }

  // Toogle the debug panel with Ctrl+D
  function maybeToggleDebugPanelByKey(event: KeyboardEvent): void {
    if (import.meta.env.DEBUG && event.ctrlKey && event.key === 'd') {
      toggleDebugPanel();
      event.preventDefault();
    }
  }

  // Routing
  let navPanelComponent: typeof SvelteComponent;
  let mainPanelComponent: typeof SvelteComponent;
  let asidePanelComponent: typeof SvelteComponent | undefined;
  let modalComponent: typeof SvelteComponent | undefined;
  $: {
    switch ($router.nav.id) {
      case 'conversationList':
        navPanelComponent = NavConversationList;
        break;
      case 'contactList':
        navPanelComponent = NavContactList;
        break;
      case 'contactAdd':
        navPanelComponent = NavContactAdd;
        break;
      case 'contactAddDetails':
        navPanelComponent = NavContactAddDetail;
        break;
      default:
        unreachable($router.nav, new Error('Unhandled nav panel router state'));
    }
    switch ($router.main.id) {
      case 'welcome':
        mainPanelComponent = MainWelcome;
        break;
      case 'conversation':
        mainPanelComponent = MainConversation;
        break;
      case 'profile':
        mainPanelComponent = MainProfile;
        break;
      default:
        unreachable($router.main, new Error('Unhandled main panel router state'));
    }
    const asideId = $router.aside?.id;
    switch (asideId) {
      case undefined:
        asidePanelComponent = undefined;
        break;
      case 'contactDetails':
        asidePanelComponent = AsideContactDetails;
        break;
      case 'groupDetails':
        asidePanelComponent = AsideGroupDetails;
        break;
      default:
        unreachable(asideId, new Error('Unhandled aside panel router state'));
    }
    const modalId = $router.modal?.id;
    switch (modalId) {
      case undefined:
        modalComponent = undefined;
        break;
      case 'contactEdit':
        modalComponent = ModalContactEdit;
        break;
      case 'groupEdit':
        modalComponent = ModalGroupEdit;
        break;
      default:
        unreachable(modalId, new Error('Unhandled modal router state'));
    }
  }
</script>

<svelte:body
  use:dragEvents
  on:drop|preventDefault
  on:dragover|preventDefault
  on:keydown|self={maybeToggleDebugPanelByKey}
/>

<template>
  <div class="wrapper" data-connection-state={$connectionState}>
    <!-- App -->

    {#if $connectionState !== ConnectionState.CONNECTED}
      <NetworkAlert />
    {/if}

    <div class="app" data-display={$display} data-layout={$layout[$display]}>
      <Snackbar />

      <!-- Nav Panel-->
      <nav>
        <svelte:component this={navPanelComponent} {services} />
      </nav>

      <!-- Main Panel -->
      <main>
        <svelte:component this={mainPanelComponent} {services} />
      </main>

      <!-- Aside Panel -->
      {#if asidePanelComponent !== undefined}
        <aside>
          <svelte:component this={asidePanelComponent} {services} />
        </aside>
      {/if}

      {#if modalComponent !== undefined}
        <svelte:component this={modalComponent} {services} />
      {/if}
    </div>

    <!-- Debug Panel -->
    {#if $debugPanelState === 'show'}
      <footer>
        <DebugPanel {services} />
      </footer>
    {/if}

    {#if isNewIdentity}
      <div class="first-start">
        <SuccessLinked
          on:close={() => {
            isNewIdentity = false;
          }}
        />
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .wrapper {
    height: 100vh;
    display: grid;
    grid-template:
      'app   ' 1fr
      'debug ' auto;

    &:not([data-connection-state='3']) {
      grid-template:
        'network-alert' auto
        'app' 1fr
        'debug' auto;
    }

    .first-start {
      height: 100vh;
      display: grid;
      grid-template: 'app' min-content;
      place-content: center;
      color: var(--t-text-e1-color);
      background-color: var(--t-pairing-background-color);
    }
  }

  .app {
    height: 100%;
    display: grid;
    gap: rem(1px);
    color: var(--t-text-e1-color);
    background-color: var(--t-panel-gap-color);
    overflow: hidden;

    %-panel {
      height: 100%;
      overflow: hidden;
      display: none;
    }

    nav {
      @extend %-panel;
    }

    main {
      @extend %-panel;
      background-color: var(--t-main-background-color);
    }

    aside {
      @extend %-panel;
      background-color: var(--t-aside-background-color);
      overflow-y: auto;
    }

    @mixin show($area) {
      grid-area: $area;
      display: grid;
    }

    // Small
    &[data-display='small'] {
      grid-template:
        'main' 100%
        / 100%;

      &[data-layout='nav'] {
        nav {
          @include show(main);
        }
      }

      &[data-layout='main'] {
        main {
          @include show(main);
        }
      }

      &[data-layout='aside'] {
        aside {
          @include show(main);
        }
      }
    }

    // Medium
    &[data-display='medium'] {
      grid-template:
        'nav main' 100%
        / #{rem(308px)} 1fr;

      &[data-layout='nav-main'] {
        nav {
          @include show(nav);
        }
        main {
          @include show(main);
        }
      }

      &[data-layout='nav-aside'] {
        nav {
          @include show(nav);
        }
        aside {
          @include show(main);
        }
      }
    }

    // Large
    &[data-display='large'] {
      grid-template:
        'nav main' 100%
        / minmax(rem(308px), rem(400px)) 1fr;

      &[data-layout='nav-main'] {
        nav {
          @include show(nav);
        }
        main {
          @include show(main);
        }
      }

      &[data-layout='nav-main-aside'] {
        grid-template:
          'nav main aside' 100%
          / minmax(rem(308px), rem(400px)) minmax(rem(410px), 1fr) rem(308px);

        nav {
          @include show(nav);
        }
        main {
          @include show(main);
        }
        aside {
          @include show(aside);
        }
      }

      @media screen and (min-width: rem(1280px)) {
        &[data-display='large'] {
          &[data-layout='nav-main-aside'] {
            grid-template:
              'nav main aside' 100%
              / #{rem(400px)} 1fr minmax(rem(308px), rem(400px));
          }
        }
      }
    }
  }
</style>
