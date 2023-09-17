<script lang="ts">
  import ProfilePicture from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import type {ProfilePictureView} from '~/common/model';

  export let profilePicture: ProfilePictureView;
  export let initials: string;
  export let displayName: string;
</script>

<template>
  <div class="profile">
    <div class="profile-picture">
      <ProfilePicture
        img={transformProfilePicture(profilePicture.picture)}
        alt={$i18n.t('settings.hint--own-profile-picture', 'My profile picture')}
        {initials}
        color={profilePicture.color}
        shape="circle"
      />
    </div>
    <div class="nickname">
      <div class="label">{$i18n.t('settings.label--nickname', 'Nickname')}</div>
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
      'profile-picture nickname qr-code'
      / #{rem(60px)} 1fr #{rem(60px)};
    column-gap: rem(16px);
    padding: rem(16px);

    .profile-picture {
      grid-area: profile-picture;
      --c-profile-picture-size: #{rem(60px)};
    }

    .nickname {
      grid-area: nickname;
      align-self: center;
      justify-self: start;

      .label {
        @extend %font-small-400;
        color: var(--t-text-e2-color);
      }

      .value {
        user-select: all;
      }
    }

    .qr-code {
      grid-area: qr-code;
      align-self: center;
    }
  }
</style>
