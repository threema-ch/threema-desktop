<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {DeleteConversationModalProps} from '~/app/ui/components/partials/modals/delete-conversation-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = DeleteConversationModalProps;

  export let conversation: $$Props['conversation'];
  export let receiver: $$Props['receiver'];

  const dispatch = createEventDispatcher<{
    afterdeleteconversation: $$Props['receiver']['lookup'];
  }>();

  let modalComponent: SvelteNullableBinding<Modal> = null;

  function handleSubmit(): void {
    conversation
      .delete()
      .then(() => {
        toast.addSimpleSuccess(
          $i18n.t(
            'dialog--delete-conversation.success--delete-conversation',
            'Chat successfully deleted',
          ),
        );
      })
      .catch(() => {
        toast.addSimpleFailure(
          $i18n.t(
            'dialog--delete-conversation.error--delete-conversation',
            'Failed to delete chat',
          ),
        );
      });

    dispatch('afterdeleteconversation', receiver.lookup);
    modalComponent?.close();
  }

  function getConfirmButtonLabel(receiverType: (typeof receiver)['type']): string {
    switch (receiverType) {
      case 'contact':
        return $i18n.t(
          'dialog--delete-conversation.action--contact-conversation-confirm',
          'Delete Chat',
        );

      case 'group':
        return $i18n.t(
          'dialog--delete-conversation.action--group-conversation-confirm',
          'Delete Group Chat',
        );

      case 'distribution-list':
        return $i18n.t(
          'dialog--delete-conversation.action--distribution-list-conversation-confirm',
          'Delete Distribution List',
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
    actions: [
      {
        iconName: 'close',
        onClick: 'close',
      },
    ],
    buttons: [
      {
        label: $i18n.t('dialog--delete-conversation.action--cancel', 'Cancel'),
        type: 'naked',
        onClick: 'close',
      },
      {
        label: getConfirmButtonLabel(receiver.type),
        onClick: 'submit',
        type: 'filled',
      },
    ],
    title: $i18n.t('dialog--delete-conversation.label--title', 'Delete Chat'),
    minWidth: 340,
    maxWidth: 460,
  }}
  options={{
    allowSubmittingWithEnter: true,
  }}
  on:submit={handleSubmit}
  on:close
>
  <div class="content">
    {#if receiver.type === 'contact'}
      {$i18n.t(
        'dialog--delete-conversation.prose--contact-conversation-prompt',
        'This will delete the chat with {name} and its messages on this device (but not on your linked devices).',
        {name: receiver.name},
      )}
    {:else if receiver.type === 'group'}
      {`${$i18n.t(
        'dialog--delete-conversation.prose--group-conversation-prompt',
        'This will delete the group chat "{name}" and its messages on this device (but not on your linked devices).',
        {name: receiver.name},
      )} ${
        !receiver.isLeft
          ? $i18n.t(
              'dialog--delete-conversation.prose--group-conversation-member',
              'However, you will stay a member of this group.',
            )
          : ''
      } `}
    {:else if receiver.type === 'distribution-list'}
      {$i18n.t(
        'dialog--delete-conversation.prose--distribution-list-conversation-prompt',
        'This will delete this distribution list and its messages on this device (but not on your linked devices).',
      )}
    {:else}
      {unreachable(receiver)}
    {/if}
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    padding: 0 rem(16px);
  }
</style>
