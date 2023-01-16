<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {type ProfilePictureData} from '#3sc/components/threema/ProfilePicture';
  import ProfilePicture from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import {unresolved} from '#3sc/utils/promise';
  import {clickOrKeyboadAction} from '~/app/ui/helpers';
  import type * as model from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type IdentityString} from '~/common/network/types';
  import {type RemoteStore} from '~/common/utils/store';
  import {getGraphemeClusters} from '~/common/utils/string';

  export let identity: IdentityString;

  export let profilePicture: RemoteModelStore<model.ProfilePicture>;

  export let displayName: RemoteStore<string>;

  const dispatch = createEventDispatcher();

  let profilePicture$: ProfilePictureData;

  $: profilePicture$ = {
    color: $profilePicture.view.color,
    img:
      $profilePicture.view.picture !== undefined
        ? new Blob([$profilePicture.view.picture], {type: 'image/jpeg'})
        : unresolved(),
    initials: getGraphemeClusters($displayName !== '' ? $displayName : identity, 2).join(''),
  };
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
