<!--
  @component Renders a top bar with the user's profile picture and action buttons.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import type {TopBarProps} from '~/app/ui/components/partials/conversation-nav/internal/top-bar/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {i18n} from '~/app/ui/i18n';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import ProfilePicture from '~/app/ui/svelte-components/threema/ProfilePicture/ProfilePicture.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';

  type $$Props = TopBarProps;

  export let profilePicture: $$Props['profilePicture'];
  export let initials: $$Props['initials'];

  const dispatch = createEventDispatcher<{
    clickcontactlistbutton: undefined;
    clickprofilepicture: undefined;
    clicksettingsbutton: undefined;
  }>();

  let popover: SvelteNullableBinding<Popover> = null;

  function handleClickContactListButton(): void {
    dispatch('clickcontactlistbutton');
  }

  function handleClickProfilePicture(): void {
    dispatch('clickprofilepicture');
  }

  function handleClickSettingsButton(): void {
    dispatch('clicksettingsbutton');
  }
</script>

<header class="container">
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

    <IconButton on:click={handleClickContactListButton} flavor="naked">
      <MdIcon theme="Outlined">person_outline</MdIcon>
    </IconButton>

    <ContextMenuProvider
      bind:popover
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
      items={[
        {
          type: 'option',
          icon: {
            name: 'settings',
            color: 'default',
          },
          label: $i18n.t('settings.label--title', 'Settings'),
          handler: handleClickSettingsButton,
        },
      ]}
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

  .container {
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
