<!--
  @component
  Renders a message that can be used as part of a conversation.
-->
<script lang="ts">
  import IconButtonProgressBarOverlay from '#3sc/components/blocks/Button/IconButtonProgressBarOverlay.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import Avatar from '~/app/ui/components/atoms/avatar/Avatar.svelte';
  import OverlayProvider from '~/app/ui/components/hocs/overlay-provider/OverlayProvider.svelte';
  import BasicMessage from '~/app/ui/components/molecules/message/Message.svelte';
  import type {MessageProps as BasicMessageProps} from '~/app/ui/components/molecules/message/props';
  import {
    getTextContent,
    getTranslatedSyncButtonTitle,
    isUnsyncedOrSyncingFile,
  } from '~/app/ui/components/partials/chat-view/internal/message/helpers';
  import type {MessageProps} from '~/app/ui/components/partials/chat-view/internal/message/props';
  import MessageContextMenuProvider from '~/app/ui/components/partials/chat-view/internal/message-context-menu-provider/MessageContextMenuProvider.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {handleCopyImage, handleSaveAsFile} from '~/app/ui/utils/file-sync/handlers';
  import {syncAndGetPayload} from '~/app/ui/utils/file-sync/helpers';
  import {reactive} from '~/app/ui/utils/svelte';
  import {formatDateLocalized} from '~/app/ui/utils/timestamp';
  import {ReceiverType} from '~/common/enum';
  import {extractErrorMessage} from '~/common/error';
  import {ensureError, unreachable} from '~/common/utils/assert';
  import {type IQueryableStore, ReadableStore} from '~/common/utils/store';

  const {uiLogging, systemTime} = globals.unwrap();
  const log = uiLogging.logger('ui.component.message');

  type $$Props = MessageProps;

  export let actions: $$Props['actions'];
  export let boundary: $$Props['boundary'] = undefined;
  export let conversation: $$Props['conversation'];
  export let direction: $$Props['direction'];
  export let file: $$Props['file'] = undefined;
  export let id: $$Props['id'];
  export let highlighted: $$Props['highlighted'] = undefined;
  export let quote: $$Props['quote'] = undefined;
  export let reactions: $$Props['reactions'];
  export let sender: $$Props['sender'] = undefined;
  export let services: $$Props['services'];
  export let status: $$Props['status'];
  export let text: $$Props['text'] = undefined;

  const {
    router,
    settings: {appearance},
  } = services;

  let quoteProps: BasicMessageProps['quote'];

  let profilePictureStore: IQueryableStore<Blob | undefined> = new ReadableStore(undefined);

  function handleClickAvatar(): void {
    if (sender === undefined) {
      log.error('Clicked avatar when sender was undefined');
      return;
    }
    if (sender.type === 'self') {
      log.error('Sender type is self of clicked avatar');
      return;
    }

    const route = router.get();

    if (route.aside !== undefined) {
      router.go(
        route.nav,
        ROUTE_DEFINITIONS.main.conversation.withTypedParams({
          receiverLookup: {
            type: ReceiverType.CONTACT,
            uid: sender.uid,
          },
        }),
        ROUTE_DEFINITIONS.aside.contactDetails.withTypedParams({
          contactUid: sender.uid,
        }),
        undefined,
      );
    } else {
      router.go(
        route.nav,
        ROUTE_DEFINITIONS.main.conversation.withTypedParams({
          receiverLookup: {
            type: ReceiverType.CONTACT,
            uid: sender.uid,
          },
        }),
        undefined,
        undefined,
      );
    }
  }

  function handleClickCopyOption(): void {
    if (text !== undefined) {
      navigator.clipboard
        .writeText(text.raw)
        .then(() =>
          toast.addSimpleSuccess(
            i18n
              .get()
              .t('messaging.success--copy-message-content', 'Message content copied to clipboard'),
          ),
        )
        .catch((error) => {
          log.error('Could not copy message content to clipboard', error);

          toast.addSimpleFailure(
            i18n
              .get()
              .t(
                'messaging.error--copy-message-content',
                'Could not copy message content to clipboard',
              ),
          );
        });
    } else {
      log.warn('Attempting to copy undefined message content');

      toast.addSimpleFailure(
        i18n.get().t('messaging.error--copy-undefined-message-content', 'Nothing to copy'),
      );
    }
  }

  function handleClickCopyImageOption(): void {
    void handleCopyImage(file, log, $i18n.t, toast.addSimpleSuccess, toast.addSimpleFailure);
  }

  function handleClickSaveAsFileOption(): void {
    void handleSaveAsFile(file, log, $i18n.t, toast.addSimpleFailure);
  }

  function handleClickAcknowledgeOption(): void {
    void actions.acknowledge().catch((error) => {
      log.error(`Could not react to message: ${extractErrorMessage(ensureError(error), 'short')}`);

      toast.addSimpleFailure(
        i18n.get().t('messaging.error--reaction', 'Could not react to message'),
      );
    });
  }

  function handleClickDeclineOption(): void {
    void actions.decline().catch((error) => {
      log.error(`Could not react to message: ${extractErrorMessage(ensureError(error), 'short')}`);

      toast.addSimpleFailure(
        i18n.get().t('messaging.error--reaction', 'Could not react to message'),
      );
    });
  }

  async function handleClickSync(): Promise<void> {
    if (file === undefined) {
      return;
    }

    switch (file.sync.state) {
      case 'unsynced':
        // Start down- or upload.
        // TODO(DESK-961): Handle upload resumption for local unsynced files.
        // eslint-disable-next-line no-case-declarations
        const result = await syncAndGetPayload(file.fetchFileBytes, $i18n.t);
        switch (result.status) {
          case 'ok':
            break;

          case 'error':
            log.error(
              `File payload sync for message ${id} failed: ${extractErrorMessage(
                result.error,
                'short',
              )}`,
            );

            toast.addSimpleFailure(result.message);
            break;

          default:
            unreachable(result);
        }
        break;
      case 'syncing':
        /* TODO(DESK-948): Implement cancellation. */
        break;
      case 'synced':
      case 'failed':
        // Nothing to do.
        break;
      default:
        unreachable(file.sync.state);
    }
  }

  function handleClickFileInfo(): void {
    void handleSaveAsFile(file, log, $i18n.t, toast.addSimpleFailure);
  }

  function updateProfilePictureStore(
    conversationValue: typeof conversation,
    senderValue: typeof sender,
    directionValue: typeof direction,
  ): void {
    if (
      conversationValue.type === ReceiverType.GROUP &&
      senderValue !== undefined &&
      directionValue === 'inbound' &&
      senderValue.type !== 'self'
    ) {
      services.profilePicture
        .getProfilePictureForReceiver({
          type: ReceiverType.CONTACT,
          uid: senderValue.uid,
        })
        .then((store) => {
          if (store === undefined) {
            profilePictureStore = new ReadableStore(undefined);
          } else {
            profilePictureStore = store;
          }
        })
        .catch((error) => {
          log.warn(`Failed to fetch profile picture store: ${error}`);
          profilePictureStore = new ReadableStore(undefined);
        });
    }
  }

  function updateQuoteProps(rawQuote: $$Props['quote']): void {
    if (rawQuote === undefined) {
      quoteProps = undefined;
    } else if (rawQuote === 'not-found') {
      quoteProps = {
        type: 'not-found',
        fallbackText: $i18n.t(
          'messaging.error--quoted-message-not-found',
          'The quoted message could not be found.',
        ),
      };
    } else {
      const sanitizedHtml = getTextContent(rawQuote.text?.raw, rawQuote.text?.mentions, $i18n.t);

      quoteProps = {
        type: 'default',
        alt: $i18n.t('messaging.hint--media-thumbnail', 'Media preview'),
        content:
          sanitizedHtml === undefined
            ? undefined
            : {
                sanitizedHtml,
              },
        file: rawQuote.file,
        onError: (error) =>
          log.error(
            `An error occurred in a child component: ${extractErrorMessage(error, 'short')}`,
          ),
        sender: rawQuote.sender,
      };
    }
  }

  $: htmlContent = getTextContent(text?.raw, text?.mentions, $i18n.t);

  $: supportsReactions =
    !conversation.isBlocked &&
    !conversation.isDisabled &&
    (direction === 'inbound' || conversation.type === ReceiverType.GROUP);

  $: timestamp = reactive(
    () => ({
      fluent: formatDateLocalized(status.created.at, $i18n, 'auto', $appearance.view.use24hTime),
      short: formatDateLocalized(status.created.at, $i18n, 'time', $appearance.view.use24hTime),
    }),
    [$systemTime.current],
  );

  $: updateQuoteProps(quote);

  $: updateProfilePictureStore(conversation, sender, direction);
</script>

<div class="container">
  {#if conversation.type === ReceiverType.GROUP && sender !== undefined && direction === 'inbound'}
    <span class="avatar">
      <Avatar
        byteStore={profilePictureStore}
        color={sender.color}
        description={$i18n.t('contacts.hint--profile-picture', {
          name: sender.name,
        })}
        initials={sender.initials}
        size={24}
        on:click={handleClickAvatar}
      />
    </span>
  {/if}

  <MessageContextMenuProvider
    {boundary}
    placement={direction === 'inbound' ? 'right' : 'left'}
    enabledOptions={{
      copyLink: true,
      copySelection: true,
      copyImage: file !== undefined && file.type === 'image',
      copy: text !== undefined,
      saveAsFile: file !== undefined,
      acknowledge: supportsReactions
        ? {
            used: reactions.some(
              (reaction) => reaction.direction === 'outbound' && reaction.type === 'acknowledged',
            ),
          }
        : false,
      decline: supportsReactions
        ? {
            used: reactions.some(
              (reaction) => reaction.direction === 'outbound' && reaction.type === 'declined',
            ),
          }
        : false,
      quote: !conversation.isBlocked && !conversation.isDisabled,
      forward: text !== undefined,
      openDetails: true,
      deleteMessage: true,
    }}
    on:clickcopyimageoption={handleClickCopyImageOption}
    on:clickcopymessageoption={handleClickCopyOption}
    on:clicksaveasfileoption={handleClickSaveAsFileOption}
    on:clickacknowledgeoption={handleClickAcknowledgeOption}
    on:clickdeclineoption={handleClickDeclineOption}
    on:clickquoteoption
    on:clickforwardoption
    on:clickopendetailsoption
    on:clickdeleteoption
  >
    <div class="message" slot="message">
      <OverlayProvider show={isUnsyncedOrSyncingFile(file)}>
        <svelte:fragment slot="above">
          {#if isUnsyncedOrSyncingFile(file)}
            {@const {sync} = file}

            <button class="sync-button" on:click={handleClickSync}>
              {#if sync.state === 'unsynced'}
                <MdIcon theme="Filled" title={getTranslatedSyncButtonTitle(file, $i18n.t)}>
                  {#if sync.direction === 'download'}
                    file_download
                  {:else if sync.direction === 'upload'}
                    file_upload
                  {:else if sync.direction === undefined}
                    help
                  {:else}
                    {unreachable(sync.direction)}
                  {/if}
                </MdIcon>
              {:else if sync.state === 'syncing'}
                <!-- TODO(DESK-948): Cancellation <MdIcon theme="Filled">close</MdIcon>. -->
                <IconButtonProgressBarOverlay />
              {:else}
                {unreachable(sync.state)}
              {/if}
            </button>
          {/if}
        </svelte:fragment>

        <svelte:fragment slot="below">
          <!--TODO(DESK-771) handle distribution list conversation type-->
          <BasicMessage
            alt={$i18n.t('messaging.hint--media-thumbnail')}
            content={htmlContent === undefined
              ? undefined
              : {
                  sanitizedHtml: htmlContent,
                }}
            {direction}
            {file}
            {highlighted}
            onError={(error) =>
              log.error(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                `An error occurred in a child component: ${extractErrorMessage(error, 'short')}`,
              )}
            options={{
              hideSender: conversation.type !== ReceiverType.CONTACT,
              indicatorOptions: {
                hideStatus: conversation.type !== ReceiverType.CONTACT && status.sent !== undefined,
                fillReactions: conversation.type === ReceiverType.CONTACT,
                alwaysShowNumber: conversation.type === ReceiverType.GROUP,
              },
              hideVideoPlayButton: isUnsyncedOrSyncingFile(file),
            }}
            quote={quoteProps}
            {reactions}
            {sender}
            {status}
            {timestamp}
            on:clickfileinfo={handleClickFileInfo}
            on:clickthumbnail
            on:clickquote
            on:completehighlightanimation
          />
        </svelte:fragment>
      </OverlayProvider>
    </div>
  </MessageContextMenuProvider>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    align-items: start;
    justify-content: start;
    gap: rem(8px);

    .avatar {
      flex: none;
    }

    .message {
      border-radius: rem(10px);
      overflow: hidden;

      .sync-button {
        @include clicktarget-button-circle;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--mc-message-overlay-button-color);
        background-color: var(--mc-message-overlay-button-background-color);
        width: rem(44px);
        height: rem(44px);
        font-size: rem(22px);

        --c-icon-button-progress-bar-overlay-color: var(--mc-message-overlay-button-color);

        --c-icon-button-naked-outer-background-color--hover: var(
          --mc-message-overlay-button-background-color--hover
        );
        --c-icon-button-naked-outer-background-color--focus: var(
          --mc-message-overlay-button-background-color--focus
        );
        --c-icon-button-naked-outer-background-color--active: var(
          --mc-message-overlay-button-background-color--active
        );
      }
    }
  }
</style>
