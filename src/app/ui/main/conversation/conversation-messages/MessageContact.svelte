<script lang="ts">
  import {type ProfilePictureColor} from '#3sc/components/threema/ProfilePicture';

  export let name: string;

  export let color: ProfilePictureColor;
</script>

<template>
  <span style="color: var(--c-profile-picture-initials-{color});">
    {name}
  </span>
</template>

<style lang="scss">
  @use 'component' as *;

  span {
    @extend %font-small-700;
  }
</style>
