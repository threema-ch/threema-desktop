<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import Wrapper from '~/app/components/modal-dialog/Wrapper.svelte';

  export let visible: boolean;
</script>

<template>
  <Wrapper>
    <ModalDialog
      bind:visible
      on:confirm
      on:close={() => (visible = false)}
      on:cancel={() => (visible = false)}
    >
      <Title slot="header" title="Delete message from this device?" />
      <CancelAndConfirm slot="footer" let:modal {modal} confirmText="Delete Message" />
    </ModalDialog>
  </Wrapper>
</template>

<style lang="scss">
  @use 'component' as *;
</style>
