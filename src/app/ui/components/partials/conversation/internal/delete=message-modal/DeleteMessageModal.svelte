<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {ModalButton} from '~/app/ui/components/hocs/modal/props';
  import type {DeleteMessageModalProps} from '~/app/ui/components/partials/conversation/internal/delete=message-modal/props';
  import type {MessageListMessage} from '~/app/ui/components/partials/conversation/internal/message-list/props';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {DELETE_MESSAGE_GRACE_PERIOD_IN_MINUTES} from '~/common/network/protocol/constants';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.delete-message-modal');

  type $$Props = DeleteMessageModalProps;

  export let message: $$Props['message'];
  export let featureSupport: $$Props['featureSupport'];

  let modalComponent: SvelteNullableBinding<Modal> = null;

  const dispatch = createEventDispatcher<{
    deletelocally: MessageListMessage;
    deleteforall: MessageListMessage;
  }>();

  function handleDeleteLocally(): void {
    dispatch('deletelocally', message);
    modalComponent?.close();
  }
  function handleDeleteForAll(): void {
    if (message.deletedAt !== undefined) {
      log.warn('Cannot delete a message that was already deleted');
      modalComponent?.close();
      return;
    }

    dispatch('deleteforall', message);
    modalComponent?.close();
  }

  const buttons: ModalButton[] = [
    {
      label: $i18n.t('dialog--delete-message.action--cancel', 'Cancel'),
      type: 'naked',
      onClick: 'close',
    },

    {
      label: $i18n.t('dialog--delete-message.action--delete-locally', 'Delete on this device'),
      type: 'naked',
      onClick: handleDeleteLocally,
    },
  ];
  $: if (
    message.deletedAt === undefined &&
    message.direction === 'outbound' &&
    message.status.sent !== undefined &&
    featureSupport.supported &&
    // TODO(DESK-1451) Remove the sandbox check
    import.meta.env.BUILD_ENVIRONMENT === 'sandbox' &&
    Date.now() - message.status.sent.at.getTime() < DELETE_MESSAGE_GRACE_PERIOD_IN_MINUTES * 60000
  ) {
    buttons.push({
      label: $i18n.t('dialog--delete-message.action--delete-for-all', 'Delete for all'),
      type: 'naked',
      onClick: handleDeleteForAll,
    });
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
    buttons,
    title: $i18n.t('dialog--delete-message.action--delete-message', 'Delete message'),
  }}
  options={{
    allowClosingWithEsc: true,
    allowSubmittingWithEnter: false,
  }}
  on:close
>
  <div class="content">
    <div class="description">
      <Text
        text={$i18n.t(
          'dialog--delete-message.prose--delete-message',
          'Do you really want to delete this message?',
        )}
      ></Text>
      {#if featureSupport.supported && featureSupport.notSupportedNames.length > 0}
        <Text
          text={$i18n.t(
            'messaging.prose--delete-not-support-partial',
            'This message will not be deleted for the following group members because they use older versions of Threema: {names}.',

            {
              names: featureSupport.notSupportedNames.join(', '),
            },
          )}
        ></Text>
      {/if}
    </div>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    .description {
      padding: 0 rem(16px);
    }
  }
</style>
