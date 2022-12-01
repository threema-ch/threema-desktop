<script lang="ts">
  import AvatarComponent from '#3sc/components/threema/Avatar/Avatar.svelte';
  import {type ReceiverBadgeType} from '#3sc/types';
  import AvatarOverlay from '~/app/components/avatar/AvatarOverlay.svelte';
  import {transformAvatarPicture} from '~/common/dom/ui/avatar';
  import {type Avatar, type RemoteModelFor} from '~/common/model';
  import {type u53} from '~/common/types';

  export let avatar: RemoteModelFor<Avatar>;

  export let alt: string;

  export let initials: string;

  export let unread: u53;

  export let badge: ReceiverBadgeType | undefined = undefined;
</script>

<template>
  <div class="avatar">
    <div class="inner">
      <AvatarComponent
        img={transformAvatarPicture(avatar.view.picture)}
        {alt}
        {initials}
        color={avatar.view.color}
        shape={'circle'}
      />
    </div>
    <div class="overlay">
      <AvatarOverlay {unread} {badge} />
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .avatar {
    grid-area: avatar;
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
