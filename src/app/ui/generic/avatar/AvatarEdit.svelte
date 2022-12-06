<script lang="ts">
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Avatar from '#3sc/components/threema/Avatar/Avatar.svelte';
  import {transformAvatarPicture} from '~/common/dom/ui/avatar';
  import {type Avatar as AvatarModel} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';

  export let avatar: RemoteModelStore<AvatarModel>;

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
    <div class="avatar">
      <Avatar
        img={transformAvatarPicture($avatar.view.picture)}
        alt={`Avatar of ${name}`}
        initials=""
        color={$avatar.view.color}
        shape={'circle'}
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

    .avatar {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: $z-index-minus;
    }
  }
</style>
