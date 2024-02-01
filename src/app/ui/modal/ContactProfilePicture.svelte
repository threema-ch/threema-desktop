<script lang="ts">
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';

  export let visible: boolean;
</script>

<template>
  <ModalWrapper {visible}>
    <ModalDialog
      bind:visible
      on:confirm
      on:clickoutside={() => (visible = false)}
      on:close={() => (visible = false)}
      on:cancel={() => (visible = false)}
    >
      <div class="body" slot="body"><slot /></div>
    </ModalDialog>
    {#if visible}
      <div class="close" on:click={() => (visible = false)}>
        <IconButton flavor="naked">
          <MdIcon theme="Outlined">close</MdIcon>
        </IconButton>
      </div>
    {/if}
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    width: rem(480px);
    height: rem(480px);
    border-radius: rem(8px);
    overflow: hidden;
  }

  .close {
    z-index: calc($z-index-modal + $z-index-plus);
    position: absolute;
    top: rem(12px);
    right: rem(8px);
  }
</style>
