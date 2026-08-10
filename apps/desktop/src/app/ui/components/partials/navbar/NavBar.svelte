<!--
  @component Renders the global vertical navigation strip on the far left of the app, letting the
  user switch between the main app areas.
-->
<script lang="ts">
  import {ensureError} from '@threema/ts-utils/meta/ensure-error';
  import {
    VerticalNavigationStrip,
    type VerticalNavigationAvatar,
    type VerticalNavigationItem,
  } from '@threema/ui';
  import {onMount, untrack} from 'svelte';
  import {cx} from 'tailwind-variants';

  import {globals} from '~/app/globals';
  import type {UpdateRouterState} from '~/app/routing/router';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import type {AppServicesForSvelte} from '~/app/types';
  import {i18n} from '~/app/ui/i18n';
  import {display} from '~/common/dom/ui/state';
  import {DEFAULT_CATEGORY} from '~/common/settings';
  import type {Remote} from '~/common/utils/endpoint';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';
  import type {ProfileViewModelStore} from '~/common/viewmodel/profile';

  interface NavBarProps {
    readonly services: AppServicesForSvelte;
  }
  type ProfileViewModelStoreValue = ReturnType<Remote<ProfileViewModelStore>['get']>;

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.navbar');

  const {services}: NavBarProps = $props();

  const {backend, router} = untrack(() => services);

  let profileViewModelStore = $state<IQueryableStore<ProfileViewModelStoreValue | undefined>>(
    new ReadableStore(undefined),
  );

  /**
   * Determines the `main` (and `aside`) panel updates to apply when switching between the top-level
   * nav lists, so that the freshly selected list is actually visible.
   */
  function getCommonRouterTargetState(): Pick<UpdateRouterState, 'main' | 'aside'> {
    if ($display === 'small') {
      return {main: ROUTE_DEFINITIONS.main.welcome.withoutParams(), aside: 'close'};
    }
    if (router.get().nav.id === 'settingsList') {
      return {main: ROUTE_DEFINITIONS.main.welcome.withoutParams()};
    }
    return {};
  }

  function handleClickChats(): void {
    router.go({
      nav: ROUTE_DEFINITIONS.nav.conversationList.withoutParams(),
      ...getCommonRouterTargetState(),
    });
  }

  function handleClickContacts(): void {
    router.go({
      nav: ROUTE_DEFINITIONS.nav.receiverList.withParams({
        addressBookState: 'receiver-preview-list',
      }),
      ...getCommonRouterTargetState(),
    });
  }

  function handleClickSettings(): void {
    router.goToSettings({category: DEFAULT_CATEGORY});
  }

  const startItems = $derived<VerticalNavigationItem[]>([
    {
      active: $router.nav.id === 'conversationList',
      icon: {glyph: 'chat_bubble'},
      label: $i18n.t('conversations.label--title-conversations', 'Chats'),
      onclick: handleClickChats,
      testId: 'nav-item-chats',
    },
    {
      active: $router.nav.id === 'receiverList',
      icon: {glyph: 'person'},
      label: $i18n.t('contacts.label--contacts', 'Contacts'),
      onclick: handleClickContacts,
      testId: 'nav-item-contacts',
    },
  ]);

  const endItems = $derived<VerticalNavigationItem[]>([
    {
      active: $router.nav.id === 'settingsList',
      icon: {glyph: 'settings'},
      label: $i18n.t('settings.label--title', 'Settings'),
      onclick: handleClickSettings,
      testId: 'nav-item-settings',
    },
  ]);

  const avatar = $derived<VerticalNavigationAvatar | undefined>(
    $profileViewModelStore === undefined
      ? undefined
      : {
          color: $profileViewModelStore.profilePicture.color,
          image: $profileViewModelStore.profilePicture.picture,
          initials: $profileViewModelStore.initials,
          label: $profileViewModelStore.displayName,
          onclick: handleClickSettings,
          testId: 'nav-avatar',
        },
  );

  onMount(async () => {
    await backend.viewModel
      .profile()
      .then((store) => {
        profileViewModelStore = store;
      })
      .catch((error: unknown) => {
        log.error(`Failed to load ProfileViewModel: ${ensureError(error)}`);
      });
  });
</script>

<div
  class={cx(
    'box-border flex w-full flex-col overflow-hidden border-r',
    $display === 'small' ? 'border-grey-200 dark:border-grey-700' : 'border-transparent',
  )}
>
  {#if import.meta.env.BUILD_PLATFORM === 'macos'}
    <!-- Draggable region behind macOS traffic lights. -->
    <div class="h-16 w-full shrink-0 grow-0 basis-auto [-webkit-app-region:drag]"></div>
  {/if}

  <VerticalNavigationStrip
    class={cx('pb-6', import.meta.env.BUILD_PLATFORM === 'macos' ? 'pt-2' : 'pt-2.5')}
    {avatar}
    {endItems}
    {startItems}
  />
</div>
