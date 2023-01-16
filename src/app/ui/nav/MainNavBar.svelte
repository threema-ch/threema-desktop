<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {type ProfilePictureData} from '#3sc/components/threema/ProfilePicture';
  import ProfilePicture from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import {clickOrKeyboadAction} from '~/app/ui/helpers';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import type * as model from '~/common/model';
  import {type IdentityString} from '~/common/network/types';
  import {type RemoteStore} from '~/common/utils/store';
  import {getGraphemeClusters} from '~/common/utils/string';

  export let identity: IdentityString;

  export let profilePicture: RemoteStore<model.ProfilePictureView>;

  export let displayName: RemoteStore<string>;

  const dispatch = createEventDispatcher();

  // Profile picture data
  function processProfilePicture(view: model.ProfilePictureView): ProfilePictureData {
    return {
      color: view.color,
      img: transformProfilePicture(view.picture),
      initials: getGraphemeClusters($displayName !== '' ? $displayName : identity, 2).join(''),
    };
  }
  let profilePicture$: ProfilePictureData;
  $: profilePicture$ = processProfilePicture($profilePicture);
</script>

<template>
  <header>
    <div
      class="profile-picture"
      role="link"
      tabindex="0"
      use:clickOrKeyboadAction={() => dispatch('click-profile-picture')}
    >
      <ProfilePicture {...profilePicture$} alt="Your profile picture" shape={'circle'} />
    </div>
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
    <!-- <IconButton
      on:click={() => {
        dispatch('click-more');
      }}
      flavor="naked"
      class="wip"
    >
      <MdIcon theme="Outlined">more_vert</MdIcon>
    </IconButton> -->
  </header>
</template>

<style lang="scss">
  @use 'component' as *;

  $-profile-picture-size: rem(40px);

  header {
    display: grid;
    grid-template:
      'profile-picture'
      / 1fr;
    grid-auto-flow: column;
    grid-auto-columns: $-profile-picture-size;
    place-items: center;
    user-select: none;

    .profile-picture {
      cursor: pointer;
      height: $-profile-picture-size;
      width: $-profile-picture-size;
      justify-self: start;
    }
  }
</style>
