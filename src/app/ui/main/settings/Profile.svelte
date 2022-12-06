<script lang="ts">
  import Avatar from '#3sc/components/threema/Avatar/Avatar.svelte';
  import {transformAvatarPicture} from '~/common/dom/ui/avatar';
  import {type AvatarView} from '~/common/model';

  export let avatar: AvatarView;
  export let initials: string;
  export let displayName: string;
</script>

<template>
  <div class="profile">
    <div class="avatar">
      <Avatar
        img={transformAvatarPicture(avatar.picture)}
        alt={'Avatar of {displayName}'}
        {initials}
        color={avatar.color}
        shape={'circle'}
      />
    </div>
    <div class="nickname">
      <div class="label">Public Nickname</div>
      <div class="value">{displayName}</div>
    </div>
    <div class="qr-code" />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .profile {
    display: grid;
    height: rem(92px);
    grid-template:
      'avatar nickname qr-code'
      / #{rem(60px)} 1fr #{rem(60px)};
    column-gap: rem(16px);
    padding: rem(16px);

    .avatar {
      grid-area: avatar;
    }

    .nickname {
      grid-area: nickname;
      align-self: center;
      justify-self: start;

      .label {
        @extend %font-small-400;
        color: var(--t-text-e2-color);
      }
    }

    .qr-code {
      grid-area: qr-code;
      align-self: center;
    }
  }
</style>
