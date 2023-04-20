<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ProfilePicture from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import {type ProfilePictureView} from '~/common/model';

  export let profilePicture: ProfilePictureView;
  export let initials: string;

  const dispatch = createEventDispatcher();
</script>

<template>
  <header>
    <button
      type="button"
      class="profile-picture"
      on:click={() => dispatch('click-profile-picture')}
    >
      <ProfilePicture
        img={transformProfilePicture(profilePicture.picture)}
        alt={$i18n.t('topic.people.user-profile-picture-description')}
        {initials}
        color={profilePicture.color}
        shape="circle"
      />
    </button>
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
      @include def-var(--c-profile-picture-size, $-profile-picture-size);
      @include clicktarget-button-circle;
      justify-self: start;
    }
  }
</style>
