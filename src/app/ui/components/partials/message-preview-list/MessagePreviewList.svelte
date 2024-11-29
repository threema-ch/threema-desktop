<!--
  @component
  Renders a list of preview cards for the given messages, grouped by conversation.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import Avatar from '~/app/ui/components/atoms/avatar/Avatar.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Message from '~/app/ui/components/molecules/message/Message.svelte';
  import {getTextContent} from '~/app/ui/components/partials/message-preview-list/helpers';
  import type {MessagePreviewListProps} from '~/app/ui/components/partials/message-preview-list/props';
  import {
    transformMessageFileProps,
    transformMessageQuoteProps,
  } from '~/app/ui/components/partials/message-preview-list/transformers';
  import {i18n} from '~/app/ui/i18n';
  import {getDisplayTimestampForMessage} from '~/app/ui/utils/timestamp';
  import type {DbReceiverLookup} from '~/common/db';
  import {ReceiverType} from '~/common/enum';
  import {extractErrorMessage} from '~/common/error';
  import type {MessageId} from '~/common/network/types';
  import {ensureError} from '~/common/utils/assert';
  import {ReadableStore} from '~/common/utils/store';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.message-preview-list');

  type $$Props = MessagePreviewListProps;

  export let highlights: $$Props['highlights'] = undefined;
  export let items: $$Props['items'] = [];
  export let services: $$Props['services'];

  const {
    profilePicture,
    router,
    settings: {
      views: {appearance},
    },
  } = services;

  function handleClickMessage(receiverLookup: DbReceiverLookup, messageId: MessageId): void {
    router.go({
      main: ROUTE_DEFINITIONS.main.conversation.withParams({
        receiverLookup,
        initialMessage: {messageId},
      }),
    });
  }
</script>

<ul class="container">
  {#each items as item (item.conversation.receiver.id)}
    {@const receiver = item.conversation.receiver}

    <li class="conversation">
      <div class="name">
        <Text color="mono-low" ellipsis={true} size="body" text={receiver.name} wrap={false} />
      </div>

      <ul class="messages">
        {#each item.messages as message (message.id)}
          {@const htmlContent = getTextContent(
            message.text?.raw,
            highlights,
            message.text?.mentions,
            $i18n.t,
            200,
          )}

          <li class={`preview ${message.direction}`}>
            {#if message.direction === 'inbound' && message.sender?.type === 'contact'}
              <span class="avatar">
                {#await profilePicture.getProfilePictureForReceiver( {type: ReceiverType.CONTACT, uid: message.sender.uid}, ) then senderProfilePictureStore}
                  <Avatar
                    byteStore={senderProfilePictureStore ?? new ReadableStore(undefined)}
                    color={message.sender.color}
                    description={$i18n.t('contacts.hint--profile-picture', {
                      name: message.sender.name,
                    })}
                    initials={message.sender.initials}
                    isClickable={false}
                    isFocusable={false}
                    size={24}
                  />
                {/await}
              </span>
            {:else}
              <!-- Don't show a profile picture, as the sender is either `undefined` or the user themself. -->
            {/if}

            <div class="message">
              <Message
                alt={$i18n.t('messaging.hint--media-thumbnail')}
                clickable={true}
                direction={message.direction}
                reactions={message.reactions}
                status={message.status}
                timestamp={getDisplayTimestampForMessage(
                  $i18n,
                  message.direction,
                  message.status,
                  $appearance.use24hTime,
                )}
                content={htmlContent === undefined
                  ? undefined
                  : {
                      sanitizedHtml: htmlContent,
                    }}
                file={transformMessageFileProps(
                  message.file,
                  message.id,
                  receiver.lookup,
                  services,
                )}
                onError={(error) =>
                  log.error(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    `An error occurred in a child component: ${extractErrorMessage(
                      ensureError(error),
                      'short',
                    )}`,
                  )}
                options={{
                  showSender: true,
                  hideVideoPlayButton: true,
                  indicatorOptions: {
                    hideStatus: true,
                    fillReactions: item.conversation.receiver.type === 'contact',
                    alwaysShowNumber: item.conversation.receiver.type === 'group',
                  },
                }}
                quote={transformMessageQuoteProps(
                  message.quote,
                  receiver.lookup,
                  services,
                  $i18n,
                  log,
                )}
                sender={message.sender}
                on:click={() => handleClickMessage(receiver.lookup, message.id)}
              />
            </div>
          </li>
        {/each}
      </ul>
    </li>
  {/each}
</ul>

<style lang="scss">
  @use 'component' as *;

  ul {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;

    list-style-type: none;
    margin: 0;
    padding: 0;
    max-width: 100%;
    overflow: hidden;

    li {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: start;
    }
  }

  .container {
    gap: rem(32px);

    @include def-var(
      --mc-message-background-color-incoming,
      var(--mc-message-background-color-incoming-nav)
    );
    @include def-var(
      --mc-message-background-color-outgoing,
      var(--mc-message-background-color-outgoing-nav)
    );

    .conversation {
      .name {
        padding: 0 0 rem(12px) 0;
        overflow: hidden;
      }

      .messages {
        gap: rem(16px);

        .preview {
          position: relative;
          display: flex;
          flex-direction: row;
          align-items: end;
          justify-content: stretch;
          gap: rem(8px);

          &.outbound {
            flex-direction: row-reverse;
          }

          .avatar {
            flex: none;
          }

          .message {
            max-width: calc(100% - rem(64px));
          }
        }
      }
    }
  }
</style>
