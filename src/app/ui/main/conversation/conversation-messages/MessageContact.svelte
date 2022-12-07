<script lang="ts">
  import {type AvatarColor} from '#3sc/components/threema/Avatar';

  export let name: string;

  export let color: AvatarColor;
</script>

<template>
  <span style="color: var(--c-avatar-initials-{color});">
    {name}
  </span>
</template>

<style lang="scss">
  @use 'component' as *;

  span {
    @extend %font-small-700;
  }
</style>
