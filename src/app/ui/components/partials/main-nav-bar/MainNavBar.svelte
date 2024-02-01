<!--
  @component
  Renders a nav bar with the user's profile picture and action buttons.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import ProfilePicture from '~/app/ui/svelte-components/threema/ProfilePicture/ProfilePicture.svelte';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import {
    provideContextMenuEntries,
    routeToSettings,
  } from '~/app/ui/components/partials/main-nav-bar/helpers';
  import type {MainNavBarProps} from '~/app/ui/components/partials/main-nav-bar/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import {display} from '~/common/dom/ui/state';

  type $$Props = MainNavBarProps;

  export let profilePicture: $$Props['profilePicture'];
  export let initials: $$Props['initials'];
  export let services: $$Props['services'];

  const {router} = services;

  $: items = provideContextMenuEntries(router, $i18n, $display);

  const dispatch = createEventDispatcher();

  let popover: SvelteNullableBinding<Popover> = null;

  function handleClickProfilePicture(): void {
    routeToSettings(router);
  }
</script>

<header>
  <button type="button" class="profile-picture" on:click={handleClickProfilePicture}>
    <ProfilePicture
      img={transformProfilePicture(profilePicture.picture)}
      alt={$i18n.t('contacts.hint--own-profile-picture')}
      {initials}
      color={profilePicture.color}
      shape="circle"
    />
  </button>

  <div class="actions">
    <!-- <IconButton flavor="naked" class="wip">
      <ThreemaIcon
        on:click={() => {
          dispatch('click-chat');
        }}
        theme="Outlined">start_chat</ThreemaIcon
      >
    </IconButton> -->
    <IconButton
      on:click={() => {
        dispatch('click-contact');
      }}
      flavor="naked"
    >
      <MdIcon theme="Outlined">person_outline</MdIcon>
    </IconButton>
    <ContextMenuProvider
      bind:popover
      {items}
      anchorPoints={{
        reference: {
          horizontal: 'right',
          vertical: 'bottom',
        },
        popover: {
          horizontal: 'right',
          vertical: 'top',
        },
      }}
      offset={{
        left: 0,
        top: 4,
      }}
      triggerBehavior="toggle"
      on:clickitem={() => popover?.close()}
    >
      <IconButton flavor="naked">
        <MdIcon theme="Outlined">more_vert</MdIcon>
      </IconButton>
    </ContextMenuProvider>
  </div>
</header>

<style lang="scss">
  @use 'component' as *;

  $-profile-picture-size: rem(40px);

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .profile-picture {
      @include def-var(--c-profile-picture-size, $-profile-picture-size);
      @include clicktarget-button-circle;
    }

    .actions {
      display: flex;
      align-items: center;
      justify-content: end;
    }
  }
</style>
