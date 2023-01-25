<script lang="ts">
  import {getFileExtension} from '.';

  export let filename: string;
</script>

<template>
  <div>
    {getFileExtension(filename)}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    display: grid;
    place-items: center;
    text-transform: uppercase;
    background-image: var(--cc-media-message-file-type-background-image);
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    color: var(--cc-media-message-file-type-text-color);
    width: 100%;
    height: 100%;
    user-select: none;
  }
</style>
