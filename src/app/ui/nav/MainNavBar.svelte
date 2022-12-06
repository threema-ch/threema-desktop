<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {type AvatarData} from '#3sc/components/threema/Avatar';
  import Avatar from '#3sc/components/threema/Avatar/Avatar.svelte';
  import {unresolved} from '#3sc/utils/promise';
  import type * as model from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type IdentityString} from '~/common/network/types';
  import {type RemoteStore} from '~/common/utils/store';
  import {getGraphemeClusters} from '~/common/utils/string';

  export let identity: IdentityString;

  export let avatar: RemoteModelStore<model.Avatar>;

  export let displayName: RemoteStore<string>;

  const dispatch = createEventDispatcher();

  let avatar$: AvatarData;

  $: avatar$ = {
    color: $avatar.view.color,
    img:
      $avatar.view.picture !== undefined
        ? new Blob([$avatar.view.picture], {type: 'image/jpeg'})
        : unresolved(),
    initials: getGraphemeClusters($displayName !== '' ? $displayName : identity, 2).join(''),
  };
</script>

<template>
  <header>
    <div
      class="avatar"
      on:click={() => {
        dispatch('click-avatar');
      }}
    >
      <Avatar {...avatar$} alt="Your avatar" shape={'circle'} />
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

  $-avatar-size: rem(40px);

  header {
    display: grid;
    grid-template:
      'avatar'
      / 1fr;
    grid-auto-flow: column;
    grid-auto-columns: $-avatar-size;
    place-items: center;
    user-select: none;

    .avatar {
      cursor: pointer;
      height: $-avatar-size;
      width: $-avatar-size;
      justify-self: start;
    }
  }
</style>
