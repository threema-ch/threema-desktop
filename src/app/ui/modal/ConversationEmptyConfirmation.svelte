<script lang="ts">
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
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
  let description: string;
  $: switch (receiverType) {
    case 'contact':
      confirmText = $i18n.t(
        'dialog--empty-conversation.action--contact-conversation-confirm',
        'Empty Chat',
      );
      description = $i18n.t(
        'dialog--empty-conversation.prose--contact-conversation-prompt',
        "This will delete the {n, plural, =1 {only message} other {# messages}} of this chat with {name} on this device. Your linked devices won't be affected.",
        {n: conversationMessageCount, name: truncate(receiverName, 80)},
      );
      break;

    case 'group':
      confirmText = $i18n.t(
        'dialog--empty-conversation.action--group-conversation-confirm',
        'Empty Group Chat',
      );
      description = $i18n.t(
        'dialog--empty-conversation.prose--group-conversation-prompt',
        'This will delete the {n, plural, =1 {only message} other {# messages}} of this "{name}" group chat on this device. Your linked devices won\'t be affected.',
        {n: conversationMessageCount, name: truncate(receiverName, 80)},
      );
      break;

    case 'distribution-list':
      confirmText = $i18n.t(
        'dialog--empty-conversation.action--distribution-list-conversation-confirm',
        'Empty Distribution List',
      );
      description = $i18n.t(
        'dialog--empty-conversation.prose--distribution-list-conversation-prompt',
        'This will delete the {n, plural, =1 {only message} other {# messages}} of this "{name}" distribution list on this device. Your linked devices won\'t be affected.',
        {n: conversationMessageCount, name: truncate(receiverName, 80)},
      );
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
      <Title
        slot="header"
        title={$i18n.t('dialog--empty-conversation.label--title', 'Empty Chat')}
      />
      <div class="body" slot="body">
        {description}
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
