<script lang="ts">
  import ProfilePictureComponent from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import ProfilePictureOverlay from '~/app/ui/generic/profile-picture/ProfilePictureOverlay.svelte';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import {type ProfilePictureView} from '~/common/model';
  import {type u53} from '~/common/types';
  import {type ReceiverBadgeType} from '~/common/viewmodel/types';

  export let profilePicture: ProfilePictureView;

  export let alt: string;

  export let initials: string;

  export let unread: u53;

  export let badge: ReceiverBadgeType | undefined = undefined;
</script>

<template>
  <div class="profile-picture">
    <div class="inner">
      <ProfilePictureComponent
        img={transformProfilePicture(profilePicture.picture)}
        {alt}
        {initials}
        color={profilePicture.color}
        shape="circle"
      />
    </div>
    <div class="overlay">
      <ProfilePictureOverlay {unread} {badge} />
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .profile-picture {
    grid-area: profile-picture;
    height: rem(60px);
    width: rem(68px);
    position: relative;
    display: grid;
    place-items: center;

    .inner {
      height: rem(48px);
      width: rem(48px);
    }

    .overlay {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
    }
  }
</style>
