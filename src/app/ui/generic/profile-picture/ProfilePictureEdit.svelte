<script lang="ts">
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ProfilePicture from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import {type ProfilePicture as ProfilePictureModel} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';

  export let profilePicture: RemoteModelStore<ProfilePictureModel>;

  export let name: string;
</script>

<template>
  <div class="overlay">
    <IconButton flavor="overlay" class="wip">
      <MdIcon theme="Outlined">delete</MdIcon>
    </IconButton>
    <IconButton flavor="overlay" class="wip">
      <MdIcon theme="Outlined">add_a_photo</MdIcon>
    </IconButton>
    <div class="profile-picture">
      <ProfilePicture
        img={transformProfilePicture($profilePicture.view.picture)}
        alt={`Profile picture of ${name}`}
        initials=""
        color={$profilePicture.view.color}
        shape="circle"
      />
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .overlay {
    display: grid;
    grid-template:
      'remove' min-content
      'upload' min-content
      / 1fr;
    justify-items: center;
    align-items: center;
    align-content: center;
    position: relative;
    width: rem(120px);
    height: rem(120px);
    --c-icon-button-padding: #{rem(8px)};
    --c-icon-button-icon-size: #{rem(20px)};

    .profile-picture {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: $z-index-minus;
    }
  }
</style>
