<script lang="ts">
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {Modal} from '~/app/ui/svelte-components/blocks/ModalDialog';

  export let modal: Modal;
  export let title: string;
</script>

<template>
  <div class="header">
    <div class="title">{title}</div>
    <div class="close" on:click={modal.close}>
      <MdIcon theme="Outlined">close</MdIcon>
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .header {
    padding: rem(16px);
    display: grid;
    grid-template: 'text icon' auto / 1fr min-content;
    place-items: center;

    .title {
      @extend %font-large-400;
      text-align: left;
      width: 100%;
    }

    .close {
      @include def-var(--c-icon-font-size, #{rem(24px)});
      display: grid;
      place-items: center;
      cursor: pointer;
    }
  }
</style>
