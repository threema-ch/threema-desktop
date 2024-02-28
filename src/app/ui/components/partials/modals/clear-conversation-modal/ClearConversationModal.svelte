<!--
  @component
  Renders a modal with details about a message.
-->
<script lang="ts">
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {ClearConversationModalProps} from '~/app/ui/components/partials/modals/clear-conversation-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';
  import {truncate} from '~/common/utils/string';

  type $$Props = ClearConversationModalProps;

  export let conversation: $$Props['conversation'];
  export let receiver: $$Props['receiver'];

  let modalComponent: SvelteNullableBinding<Modal> = null;

  function handleClickConfirm(): void {
    conversation.clear().catch(assertUnreachable);
    modalComponent?.close();
  }

  function getConfirmButtonLabel(receiverType: (typeof receiver)['type']): string {
    switch (receiverType) {
      case 'contact':
        return $i18n.t(
          'dialog--empty-conversation.action--contact-conversation-confirm',
          'Empty Chat',
        );

      case 'group':
        return $i18n.t(
          'dialog--empty-conversation.action--group-conversation-confirm',
          'Empty Group Chat',
        );

      case 'distribution-list':
        return $i18n.t(
          'dialog--empty-conversation.action--distribution-list-conversation-confirm',
          'Empty Distribution List',
        );
      default:
        return unreachable(receiverType);
    }
  }
</script>

<Modal
  bind:this={modalComponent}
  wrapper={{
    type: 'card',
    buttons: [
      {
        isFocused: true,
        label: $i18n.t('dialog--empty-conversation.action--cancel', 'Cancel'),
        onClick: 'close',
        type: 'naked',
      },
      {
        label: getConfirmButtonLabel(receiver.type),
        onClick: handleClickConfirm,
        type: 'filled',
      },
    ],
    title: $i18n.t('dialog--empty-conversation.label--title', 'Empty Chat'),
  }}
  on:close
>
  <div class="content">
    {#if receiver.type === 'contact'}
      {$i18n.t(
        'dialog--empty-conversation.prose--contact-conversation-prompt',
        "This will delete the {n, plural, =1 {only message} other {# messages}} of this chat with {name} on this device. Your linked devices won't be affected.",
        {n: conversation.totalMessagesCount, name: truncate(receiver.name, 80, 'end')},
      )}
    {:else if receiver.type === 'group'}
      {$i18n.t(
        'dialog--empty-conversation.prose--group-conversation-prompt',
        'This will delete the {n, plural, =1 {only message} other {# messages}} of this "{name}" group chat on this device. Your linked devices won\'t be affected.',
        {n: conversation.totalMessagesCount, name: truncate(receiver.name, 80, 'end')},
      )}
    {:else if receiver.type === 'distribution-list'}
      {$i18n.t(
        'dialog--empty-conversation.prose--distribution-list-conversation-prompt',
        'This will delete the {n, plural, =1 {only message} other {# messages}} of this "{name}" distribution list on this device. Your linked devices won\'t be affected.',
        {n: conversation.totalMessagesCount, name: truncate(receiver.name, 80, 'end')},
      )}
    {:else}
      {unreachable(receiver.type)}
    {/if}
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    padding: 0 rem(16px);
  }
</style>
