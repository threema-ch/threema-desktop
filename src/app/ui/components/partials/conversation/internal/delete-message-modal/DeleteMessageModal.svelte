<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import {
    getModalButtons,
    deleteForEveryoneSupported,
  } from '~/app/ui/components/partials/conversation/internal/delete-message-modal/helpers';
  import type {DeleteMessageModalProps} from '~/app/ui/components/partials/conversation/internal/delete-message-modal/props';
  import type {
    AnyMessageListMessage,
    MessageListRegularMessage,
  } from '~/app/ui/components/partials/conversation/internal/message-list/props';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {unreachable} from '~/common/utils/assert';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.delete-message-modal');

  type $$Props = DeleteMessageModalProps;

  export let message: $$Props['message'];
  export let featureSupport: $$Props['featureSupport'];

  let modalComponent: SvelteNullableBinding<Modal> = null;

  const dispatch = createEventDispatcher<{
    clickdeletelocally: AnyMessageListMessage;
    clickdeleteforeveryone: MessageListRegularMessage;
  }>();

  function handleClickDeleteLocally(): void {
    dispatch('clickdeletelocally', message);
    modalComponent?.close();
  }

  function handleClickDeleteForEveryone(): void {
    switch (message.type) {
      case 'deleted-message':
        log.warn('Cannot delete a message that was already deleted');
        break;

      case 'regular-message':
        dispatch('clickdeleteforeveryone', message);
        break;

      case 'status-message':
        log.warn('Cannot delete a status message for everyone, as they are local-only');
        break;

      default:
        unreachable(message);
    }

    modalComponent?.close();
  }

  $: buttons = getModalButtons(
    message,
    featureSupport.supported,
    handleClickDeleteLocally,
    handleClickDeleteForEveryone,
    $i18n,
  );
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
    title: $i18n.t('dialog--delete-message.label--title', 'Delete message'),
    minWidth: 360,
    maxWidth: 460,
  }}
  options={{
    allowClosingWithEsc: true,
    allowSubmittingWithEnter: false,
  }}
  on:close
>
  <div class="content">
    <div class="description">
      <p>
        <Text
          text={$i18n.t(
            'dialog--delete-message.prose--delete-message',
            'Do you really want to delete this message?',
          )}
        />
      </p>
      {#if deleteForEveryoneSupported(message, featureSupport.supported) && featureSupport.supported && featureSupport.notSupportedNames.length > 0}
        <p>
          <Text
            text={$i18n.t(
              'dialog--delete-message.prose--delete-not-supported-partial',
              'Note: If you select "{buttonText}", this message will not be deleted for the following group members: {names}{n, plural, =0 {.} other { and {n} others.}} To support deleted messages, they need to install the latest Threema version.',
              {
                buttonText: $i18n.t('dialog--delete-message.action--delete-for-everyone'),
                n: `${featureSupport.notSupportedNames.length > 5 ? featureSupport.notSupportedNames.length - 5 : 0}`,
                names: featureSupport.notSupportedNames.slice(0, 5).join(', '),
              },
            )}
          />
        </p>
      {/if}
    </div>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    .description {
      p:first-child {
        margin-top: 0;
      }

      padding: 0 rem(16px);
    }
  }
</style>
