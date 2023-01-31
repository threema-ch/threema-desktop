<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {type u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {truncate} from '~/common/utils/string';
  import {type ReceiverType} from '~/common/viewmodel/types';

  export let visible: boolean;
  export let receiverName: string;
  export let receiverType: ReceiverType;
  export let conversationMessageCount: u53;

  let confirmText: string;
  let conversationDisplayName: string;
  $: switch (receiverType) {
    case 'contact':
      confirmText = `Empty Chat`;
      conversationDisplayName = `chat with ${truncate(receiverName, 80)}`;
      break;

    case 'group':
      confirmText = `Empty Group Chat`;
      conversationDisplayName = `"${truncate(receiverName, 80)}" group chat`;
      break;

    case 'distribution-list':
      confirmText = `Empty Distribution List`;
      conversationDisplayName = `"${truncate(receiverName, 80)}" distribution list`;
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
        This will delete the
        {#if conversationMessageCount === 1}
          only message
        {:else}
          {conversationMessageCount} messages
        {/if}
        of this {conversationDisplayName} just on this device. Your linked devices won't be affected.
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
