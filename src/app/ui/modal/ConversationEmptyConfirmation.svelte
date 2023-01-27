<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {unreachable} from '~/common/utils/assert';
  import {truncate} from '~/common/utils/string';
  import {type ReceiverType} from '~/common/viewmodel/types';

  export let visible: boolean;
  export let receiverName: string;
  export let receiverType: ReceiverType;

  let confirmText: string;
  $: switch (receiverType) {
    case 'contact':
      confirmText = `Empty "${truncate(receiverName, 30)}" Chat`;
      break;

    case 'group':
      confirmText = `Empty "${truncate(receiverName, 20)}" Group Chat`;
      break;

    case 'distribution-list':
      confirmText = `Empty "${truncate(receiverName, 15)}" Distribution List`;
      break;

    default:
      unreachable(receiverType);
  }
</script>

<template>
  <ModalWrapper>
    <ModalDialog
      bind:visible
      on:confirm
      on:close={() => (visible = false)}
      on:cancel={() => (visible = false)}
    >
      <Title slot="header" title="Empty Chat" />
      <div class="body" slot="body">
        This will only delete the messages for this chat on this device. Your linked devices won't
        be affected.
        <br />
        <br />
        Emptying a chat might be useful to make the UI more responsive in case you have lots of messages
        in a chat, or just to clear old messages.
      </div>
      <CancelAndConfirm slot="footer" let:modal {modal} {confirmText} />
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    @extend %font-normal-400;
    padding: rem(16px);
    max-width: rem(500px);
  }
</style>
