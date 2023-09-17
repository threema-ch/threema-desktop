<script lang="ts">
  import type {ProfilePictureColor} from '#3sc/components/threema/ProfilePicture';

  export let name: string;

  export let color: ProfilePictureColor;
</script>

<template>
  <div style="color: var(--c-profile-picture-initials-{color});">
    {name}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    @extend %font-small-700;
  }
</style>
