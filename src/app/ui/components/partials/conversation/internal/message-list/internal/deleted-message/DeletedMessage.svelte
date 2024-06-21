<!--
  @component Renders a deleted message that can be used as part of a conversation.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import BasicMessage from '~/app/ui/components/molecules/message/Message.svelte';
  import type {DeletedMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/deleted-message/props';
  import MessageAvatarProvider from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-avatar-provider/MessageAvatarProvider.svelte';
  import MessageContextMenuProvider from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-context-menu-provider/MessageContextMenuProvider.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {reactive} from '~/app/ui/utils/svelte';
  import {formatDateLocalized} from '~/app/ui/utils/timestamp';
  import {extractErrorMessage} from '~/common/error';

  const {uiLogging, systemTime} = globals.unwrap();
  const log = uiLogging.logger('ui.component.deleted-message');

  type $$Props = DeletedMessageProps;

  export let boundary: $$Props['boundary'] = undefined;
  export let conversation: $$Props['conversation'];
  export let direction: $$Props['direction'];
  export let highlighted: $$Props['highlighted'] = undefined;
  export let sender: $$Props['sender'] = undefined;
  export let services: $$Props['services'];
  export let status: $$Props['status'];

  const {
    settings: {appearance},
  } = services;

  $: timestamp = reactive(
    () => ({
      fluent: formatDateLocalized(status.created.at, $i18n, 'auto', $appearance.view.use24hTime),
      short: formatDateLocalized(status.created.at, $i18n, 'time', $appearance.view.use24hTime),
    }),
    [$systemTime.current],
  );
</script>

<div class="container">
  <MessageAvatarProvider {conversation} {direction} {services} {sender}>
    <MessageContextMenuProvider
      {boundary}
      placement={direction === 'inbound' ? 'right' : 'left'}
      enabledOptions={{
        copyLink: false,
        copySelection: false,
        copyImage: false,
        copy: false,
        edit: false,
        saveAsFile: false,
        acknowledge: false,
        decline: false,
        quote: false,
        forward: false,
        openDetails: true,
        deleteMessage: true,
      }}
      on:clickopendetailsoption
      on:clickdeleteoption
    >
      <div class="message" slot="message">
        <BasicMessage
          alt={$i18n.t('messaging.hint--media-thumbnail')}
          content={{
            text: $i18n.t('messaging.prose--message-deleted', 'This message was deleted'),
          }}
          {direction}
          {highlighted}
          onError={(error) =>
            log.error(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              `An error occurred in a child component: ${extractErrorMessage(error, 'short')}`,
            )}
          options={{
            hideSender: conversation.receiver.type !== 'contact',
            indicatorOptions: {
              hideStatus: conversation.receiver.type !== 'contact' && status.sent !== undefined,
            },
          }}
          quote={undefined}
          reactions={[]}
          {sender}
          {status}
          {timestamp}
          on:completehighlightanimation
        />
      </div>
    </MessageContextMenuProvider>
  </MessageAvatarProvider>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    align-items: start;
    justify-content: start;
    gap: rem(8px);

    .message {
      border-radius: rem(10px);
      overflow: hidden;
    }
  }
</style>
