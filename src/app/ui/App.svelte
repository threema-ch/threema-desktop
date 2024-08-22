<script lang="ts">
  import {onMount, type SvelteComponent} from 'svelte';

  import type {AppServices, AppServicesForSvelte} from '~/app/types';
  import GroupCallActivity from '~/app/ui/components/partials/call-activity/GroupCallActivity.svelte';
  import ContactDetail from '~/app/ui/components/partials/contact-detail/ContactDetail.svelte';
  import ContactNav from '~/app/ui/components/partials/contact-nav/ContactNav.svelte';
  import ConversationView from '~/app/ui/components/partials/conversation/ConversationView.svelte';
  import ConversationNav from '~/app/ui/components/partials/conversation-nav/ConversationNav.svelte';
  import Settings from '~/app/ui/components/partials/settings/Settings.svelte';
  import NavSettingsList from '~/app/ui/components/partials/settings-nav/SettingsNav.svelte';
  import MainWelcome from '~/app/ui/components/partials/welcome/Welcome.svelte';
  import DebugPanel from '~/app/ui/debug/DebugPanel.svelte';
  import ChangePassword from '~/app/ui/modal/ChangePassword.svelte';
  import NavContactAdd from '~/app/ui/nav/ContactAddNav.svelte';
  import NavContactAddDetail from '~/app/ui/nav/contact-add/ContactAddDetail.svelte';
  import NetworkAlert from '~/app/ui/notification/NetworkAlert.svelte';
  import Snackbar from '~/app/ui/snackbar/Snackbar.svelte';
  import {DisplayModeObserver, manageLayout} from '~/common/dom/ui/layout';
  import {display, layout} from '~/common/dom/ui/state';
  import type {IGlobalPropertyModel} from '~/common/model/types/settings';
  import type {ModelStore} from '~/common/model/utils/model-store';
  import {ConnectionState} from '~/common/network/protocol/state';
  import type {u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import {TIMER, type TimerCanceller} from '~/common/utils/timer';

  export let services: AppServices;

  // Unpack router
  const {router} = services;

  // Unpack stores
  const {debugPanelState} = services.storage;
  const {connectionState} = services.backend;
  const applicationState = services.backend.model.globalProperties.getOrCreate(
    'applicationState',
    {},
  ) as Promise<Remote<ModelStore<IGlobalPropertyModel<'applicationState'>>>>;

  // Create display mode observer
  const displayModeObserver = new DisplayModeObserver(display);

  // Delayed connection state
  let delayedConnectionState: ConnectionState | undefined = undefined;
  let updateDelayedConnectionStateTimerCanceller: TimerCanceller | undefined = undefined;

  // Activity display state
  let activityDisplayState: 'collapsed' | 'expanded' = 'collapsed';

  // Set initial display mode and manage the layout
  onMount(() => {
    displayModeObserver.update();
    return manageLayout({display, router}, layout);
  });

  function handleClickToggleExpandActivity(): void {
    activityDisplayState = activityDisplayState === 'collapsed' ? 'expanded' : 'collapsed';
  }

  function toggleDebugPanel(): void {
    $debugPanelState = $debugPanelState === 'show' ? 'hide' : 'show';
  }

  // Toggle the debug panel with Ctrl+D
  function maybeToggleDebugPanelByKey(event: KeyboardEvent): void {
    if (import.meta.env.DEBUG && event.ctrlKey && event.key === 'd') {
      toggleDebugPanel();
      event.preventDefault();
    }
  }

  /**
   * Updates the `delayedConnectionState` with the given {@link ConnectionState} value, but only
   * after a certain delay has passed. This is used so that a short loss of connection won't cause
   * the network alert banner to be shown immediately.
   *
   * Note: If the connection state switches back to connected, it will be updated immediately.
   */
  function updateDelayedConnectionState(
    currentConnectionState: ConnectionState,
    delayMs: u53,
  ): void {
    updateDelayedConnectionStateTimerCanceller?.();

    if (currentConnectionState === ConnectionState.CONNECTED) {
      // If the `connectionState` has switched to connected, update the `delayedConnectionState`
      // immediately.
      delayedConnectionState = currentConnectionState;
    } else {
      // Else, start a timer to update it after 3 seconds.
      updateDelayedConnectionStateTimerCanceller = TIMER.timeout(() => {
        delayedConnectionState = currentConnectionState;
      }, delayMs);
    }
  }

  // Routing
  let navPanelComponent: typeof SvelteComponent<{
    services: AppServicesForSvelte;
  }>;
  let mainPanelComponent: typeof SvelteComponent<{
    services: AppServicesForSvelte;
  }>;
  let asidePanelComponent:
    | typeof SvelteComponent<{
        services: AppServicesForSvelte;
      }>
    | undefined;
  let modalComponent:
    | typeof SvelteComponent<{
        services: AppServicesForSvelte;
      }>
    | undefined;
  let activityComponent:
    | typeof SvelteComponent<{
        isExpanded: boolean;
        services: AppServicesForSvelte;
      }>
    | undefined;
  $: {
    // Navigation
    switch ($router.nav.id) {
      case 'conversationList':
        navPanelComponent = ConversationNav;
        break;
      case 'contactList':
        navPanelComponent = ContactNav;
        break;
      case 'contactAdd':
        navPanelComponent = NavContactAdd;
        break;
      case 'contactAddDetails':
        navPanelComponent = NavContactAddDetail;
        break;
      case 'settingsList':
        navPanelComponent = NavSettingsList;
        break;
      default:
        unreachable($router.nav, 'Unhandled nav panel router state');
    }

    // Main
    switch ($router.main.id) {
      case 'welcome':
        mainPanelComponent = MainWelcome;
        break;
      case 'conversation':
        mainPanelComponent = ConversationView;
        break;
      case 'settings':
        mainPanelComponent = Settings;
        break;
      default:
        unreachable($router.main, 'Unhandled main panel router state');
    }

    // Aside
    if ($router.aside !== undefined) {
      switch ($router.aside.id) {
        case undefined:
          break;
        case 'receiverDetails':
          asidePanelComponent = ContactDetail;
          break;
        default:
          unreachable($router.aside.id, 'Unhandled aside panel router state');
      }
    }

    // Modal
    modalComponent = undefined;
    if ($router.modal !== undefined) {
      switch ($router.modal.id) {
        case undefined:
          modalComponent = undefined;
          break;
        case 'changePassword':
          modalComponent = ChangePassword;
          break;
        default:
          unreachable($router.modal.id, 'Unhandled modal router state');
      }
    }

    // Activity
    activityComponent = undefined;
    if ($router.activity !== undefined) {
      switch ($router.activity.id) {
        case undefined:
          activityComponent = undefined;
          break;
        case 'call':
          activityComponent = GroupCallActivity;
          break;
        default:
          unreachable($router.activity.id, 'Unhandled activity router state');
      }
    }
  }

  $: updateDelayedConnectionState($connectionState as unknown as ConnectionState, 3000);
</script>

<svelte:body on:keydown|self={maybeToggleDebugPanelByKey} />

<template>
  <div class="wrapper" data-connection-state={delayedConnectionState}>
    <!-- App -->

    {#if delayedConnectionState !== ConnectionState.CONNECTED}
      {#await applicationState then resolvedApplicationState}
        <NetworkAlert applicationState={resolvedApplicationState} />
      {/await}
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
        <aside class="aside">
          <svelte:component this={asidePanelComponent} {services} />
        </aside>
      {/if}

      <!-- Activities panel -->
      {#if activityComponent !== undefined}
        <aside class={`activity ${activityDisplayState}`}>
          <svelte:component
            this={activityComponent}
            isExpanded={activityDisplayState === 'expanded'}
            {services}
            on:clicktoggleexpand={handleClickToggleExpandActivity}
          />
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
  }

  .app {
    height: 100%;
    display: grid;
    color: var(--t-text-e1-color);
    overflow: hidden;

    %-panel {
      height: 100%;
      overflow: hidden;
      display: none;
    }

    nav {
      @extend %-panel;
      border-right: 1px solid var(--t-panel-gap-color);
    }

    main {
      @extend %-panel;
      background-color: var(--t-main-background-color);
    }

    .aside {
      @extend %-panel;
      background-color: var(--t-aside-background-color);
      border-left: 1px solid var(--t-panel-gap-color);
    }

    .activity {
      @extend %-panel;
      overflow: visible;

      display: grid;
      grid-template: 100% / minmax(0, 1fr);

      container: activity / inline-size;
      background-color: var(--t-aside-background-color);
      border-left: 1px solid var(--t-panel-gap-color);
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

      &:has(.activity.collapsed) {
        grid-template:
          'main activity' 100%
          / 1fr rem(64px);

        .activity {
          grid-area: activity;
        }
      }

      // Activity is expanded (covers entire view).
      &:has(.activity.expanded) {
        .activity {
          @include show(main);
          border-left: none;
        }
      }

      // Activity is hidden or collapsed.
      &:not(:has(.activity.expanded)) {
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
          .aside {
            @include show(main);
          }
        }
      }
    }

    // Medium
    &[data-display='medium'] {
      grid-template:
        'nav main' 100%
        / #{rem(308px)} 1fr;

      &:has(.activity.collapsed) {
        grid-template:
          'nav main activity' 100%
          / #{rem(308px)} 1fr rem(64px);

        .activity {
          grid-area: activity;
        }
      }

      // Activity is expanded (covers entire view).
      &:has(.activity.expanded) {
        .activity {
          grid-area: nav / nav / main / main;
          border-left: none;
        }
      }

      // Activity is hidden or collapsed.
      &:not(:has(.activity.expanded)) {
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
          .aside {
            @include show(main);
          }
        }
      }
    }

    // Large
    &[data-display='large'] {
      &[data-layout='nav-main'] {
        grid-template:
          'nav main' 100%
          / minmax(rem(308px), rem(400px)) 1fr;

        &:has(.activity.collapsed) {
          grid-template:
            'nav main activity' 100%
            / minmax(rem(308px), rem(400px)) 1fr rem(308px);

          .activity {
            grid-area: activity;
          }
        }

        // Activity is expanded (covers entire view).
        &:has(.activity.expanded) {
          .activity {
            grid-area: nav / nav / main / main;
            border-left: none;
          }
        }

        // Activity is hidden or collapsed.
        &:not(:has(.activity.expanded)) {
          nav {
            @include show(nav);
          }

          main {
            @include show(main);
          }
        }
      }

      &[data-layout='nav-main-aside'] {
        grid-template:
          'nav main aside' 100%
          / minmax(rem(308px), rem(400px)) minmax(rem(410px), 1fr) rem(308px);

        &:has(.activity.collapsed) {
          grid-template:
            'nav main aside activity' 100%
            / minmax(rem(308px), rem(400px)) 1fr rem(308px) rem(64px);

          .activity {
            grid-area: activity;
          }
        }

        // Activity is expanded (covers entire view).
        &:has(.activity.expanded) {
          .activity {
            grid-area: nav / nav / aside / aside;
            border-left: none;
          }
        }

        // Activity is hidden or collapsed.
        &:not(:has(.activity.expanded)) {
          nav {
            @include show(nav);
          }

          main {
            @include show(main);
          }

          .aside {
            @include show(aside);
          }
        }

        @media screen and (min-width: rem(1280px)) {
          &[data-display='large'] {
            &[data-layout='nav-main-aside'] {
              grid-template:
                'nav main aside' 100%
                / #{rem(400px)} 1fr minmax(rem(308px), rem(400px));

              &:has(.activity.collapsed) {
                grid-template:
                  'nav main aside activity' 100%
                  / #{rem(400px)} 1fr #{rem(308px)} #{rem(308px)};
              }
            }
          }
        }
      }
    }
  }
</style>
