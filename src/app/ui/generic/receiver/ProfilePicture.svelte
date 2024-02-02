<script lang="ts">
  import ProfilePictureOverlay from '~/app/ui/generic/profile-picture/ProfilePictureOverlay.svelte';
  import ProfilePictureComponent from '~/app/ui/svelte-components/threema/ProfilePicture/ProfilePicture.svelte';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import type {ProfilePictureView} from '~/common/model';
  import type {u53} from '~/common/types';
  import type {ReceiverBadgeType} from '~/common/viewmodel/types';

  export let profilePicture: ProfilePictureView;

  export let alt: string;

  export let initials: string;

  export let unread: u53 | undefined = undefined;

  export let badge: ReceiverBadgeType | undefined = undefined;
</script>

<template>
  <div class="profile-picture" on:click>
    <div class="inner">
      <ProfilePictureComponent
        img={transformProfilePicture(profilePicture.picture)}
        {alt}
        {initials}
        color={profilePicture.color}
        shape="circle"
      />
      <div class="overlay">
        <ProfilePictureOverlay {unread} {badge} />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .profile-picture {
    container-type: size;
    container-name: resize-box;
    grid-area: profile-picture;
    display: grid;
    width: var(--c-profile-picture-size, default);
    height: var(--c-profile-picture-size, default);
    place-self: center;

    .inner {
      position: relative;
      width: 100%;
      aspect-ratio: 1/1;
      object-fit: contain;
      margin: auto;

      .overlay {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
      }
    }

    @container resize-box (aspect-ratio > 1/1) {
      .inner {
        width: auto;
        height: 100%;
      }
    }
  }
</style>
