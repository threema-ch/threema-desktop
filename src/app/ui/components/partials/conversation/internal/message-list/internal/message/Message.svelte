<!--
  @component
  Renders a message that can be used as part of a conversation.
-->
<script lang="ts">
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
  } from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/helpers';
  import type {MessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/props';
  import {transformMessageFileProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/transformers';
  import MessageContextMenuProvider from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-context-menu-provider/MessageContextMenuProvider.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import IconButtonProgressBarOverlay from '~/app/ui/svelte-components/blocks/Button/IconButtonProgressBarOverlay.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {handleCopyImage, handleSaveAsFile} from '~/app/ui/utils/file-sync/handlers';
  import {syncAndGetPayload} from '~/app/ui/utils/file-sync/helpers';
  import {reactive} from '~/app/ui/utils/svelte';
  import {formatDateLocalized} from '~/app/ui/utils/timestamp';
  import {ReceiverType} from '~/common/enum';
  import {extractErrorMessage} from '~/common/error';
  import {EDIT_MESSAGE_GRACE_PERIOD_IN_MINUTES} from '~/common/network/protocol/constants';
  import {assertUnreachable, ensureError, unreachable} from '~/common/utils/assert';
  import {type IQueryableStore, ReadableStore} from '~/common/utils/store';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  const {uiLogging, systemTime} = globals.unwrap();
  const log = uiLogging.logger('ui.component.message');

  type $$Props = MessageProps;

  export let actions: $$Props['actions'];
  export let boundary: $$Props['boundary'] = undefined;
  export let conversation: $$Props['conversation'];
  export let direction: $$Props['direction'];
  export let file: $$Props['file'] = undefined;
  export let id: $$Props['id'];
  export let lastEdited: $$Props['lastEdited'] = undefined;
  export let highlighted: $$Props['highlighted'] = undefined;
  export let history: $$Props['history'] = [];
  unusedProp(history);
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
    handleCopyImage(file, log, $i18n.t, toast.addSimpleSuccess, toast.addSimpleFailure).catch(
      assertUnreachable,
    );
  }

  function handleClickSaveAsFileOption(): void {
    handleSaveAsFile(file, log, $i18n.t, toast.addSimpleFailure).catch(assertUnreachable);
  }

  function handleClickAcknowledgeOption(): void {
    actions.acknowledge().catch((error) => {
      log.error(`Could not react to message: ${extractErrorMessage(ensureError(error), 'short')}`);

      toast.addSimpleFailure(
        i18n.get().t('messaging.error--reaction', 'Could not react to message'),
      );
    });
  }

  function handleClickDeclineOption(): void {
    actions.decline().catch((error) => {
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
    handleSaveAsFile(file, log, $i18n.t, toast.addSimpleFailure).catch(assertUnreachable);
  }

  function updateProfilePictureStore(
    conversationValue: typeof conversation,
    senderValue: typeof sender,
    directionValue: typeof direction,
  ): void {
    if (
      conversationValue.receiver.type === 'group' &&
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
      const sanitizedHtml = getTextContent(
        rawQuote.text?.raw,
        rawQuote.text?.mentions,
        $i18n.t,
        250,
      );

      quoteProps = {
        type: 'default',
        alt: $i18n.t('messaging.hint--media-thumbnail', 'Media preview'),
        content:
          sanitizedHtml === undefined
            ? undefined
            : {
                sanitizedHtml,
              },
        file: transformMessageFileProps(
          rawQuote.file,
          rawQuote.id,
          conversation.receiver.lookup,
          services,
        ),
        onError: (error) =>
          log.error(
            `An error occurred in a child component: ${extractErrorMessage(error, 'short')}`,
          ),
        sender: rawQuote.sender,
      };
    }
  }

  $: htmlContent = getTextContent(text?.raw, text?.mentions, $i18n.t);

  let supportsReactions: boolean;
  $: {
    const receiver = conversation.receiver;

    switch (receiver.type) {
      case 'contact':
        supportsReactions = !receiver.isDisabled && !receiver.isBlocked && direction === 'inbound';
        break;

      case 'group':
        supportsReactions = !receiver.isDisabled && !receiver.isLeft;
        break;

      case 'distribution-list':
        supportsReactions = false;
        break;

      default:
        unreachable(receiver);
    }
  }

  let supportsEdit: boolean = false;
  $: supportsEdit = reactive(
    () =>
      import.meta.env.BUILD_ENVIRONMENT === 'sandbox' &&
      direction === 'outbound' &&
      status.sent !== undefined &&
      // For audios we don't support edits yet
      !(file !== undefined && file.type === 'audio') &&
      Date.now() - status.sent.at.getTime() < EDIT_MESSAGE_GRACE_PERIOD_IN_MINUTES * 60000,
    [$systemTime.current],
  );

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
  {#if conversation.receiver.type === 'group' && sender !== undefined && direction === 'inbound'}
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
      edit: supportsEdit,
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
      quote:
        conversation.receiver.type === 'contact'
          ? !conversation.receiver.isBlocked
          : !conversation.receiver.isDisabled,
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
    on:clickeditmessageoption
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
            file={transformMessageFileProps(file, id, conversation.receiver.lookup, services)}
            {highlighted}
            {lastEdited}
            onError={(error) =>
              log.error(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                `An error occurred in a child component: ${extractErrorMessage(error, 'short')}`,
              )}
            options={{
              hideSender: conversation.receiver.type !== 'contact',
              indicatorOptions: {
                hideStatus: conversation.receiver.type !== 'contact' && status.sent !== undefined,
                fillReactions: conversation.receiver.type === 'contact',
                alwaysShowNumber: conversation.receiver.type === 'group',
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
