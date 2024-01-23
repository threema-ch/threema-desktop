<script lang="ts">
  import {onDestroy} from 'svelte';

  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import DropZoneProvider from '~/app/ui/components/hocs/drop-zone-provider/DropZoneProvider.svelte';
  import Quote from '~/app/ui/components/molecules/message/internal/quote/Quote.svelte';
  import type {QuoteProps} from '~/app/ui/components/molecules/message/internal/quote/props';
  import {
    type ConversationDraftStore,
    conversationDrafts,
  } from '~/app/ui/components/partials/conversation/drafts';
  import {prepareFilesForMediaComposeModal} from '~/app/ui/components/partials/conversation/helpers';
  import ComposeBar from '~/app/ui/components/partials/conversation/internal/compose-bar/ComposeBar.svelte';
  import type {ComposeBarProps} from '~/app/ui/components/partials/conversation/internal/compose-bar/props';
  import MessageList from '~/app/ui/components/partials/conversation/internal/message-list/MessageList.svelte';
  import {getTextContent} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/helpers';
  import {transformMessageFileProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/transformers';
  import type {MessagePropsFromBackend} from '~/app/ui/components/partials/conversation/internal/message-list/transformers';
  import TopBar from '~/app/ui/components/partials/conversation/internal/top-bar/TopBar.svelte';
  import type {ConversationViewProps} from '~/app/ui/components/partials/conversation/props';
  import type {
    ConversationRouteParams,
    ModalState,
    RemoteConversationViewModelStoreValue,
  } from '~/app/ui/components/partials/conversation/types';
  import {conversationListEvent} from '~/app/ui/components/partials/conversation-nav/helpers';
  import {i18n} from '~/app/ui/i18n';
  import MediaMessage from '~/app/ui/modal/MediaMessage.svelte';
  import {type MediaFile, generateThumbnail} from '~/app/ui/modal/media-message';
  import {toast} from '~/app/ui/snackbar';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {FileResult} from '~/app/ui/svelte-components/utils/filelist';
  import type {FileLoadResult} from '~/app/ui/utils/file';
  import {type SvelteNullableBinding, reactive} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {ConversationCategory} from '~/common/enum';
  import {extractErrorMessage} from '~/common/error';
  import type {MessageId} from '~/common/network/types';
  import {FEATURE_MASK_FLAG} from '~/common/network/types';
  import {assertUnreachable, ensureError, unreachable} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import {getSanitizedFileNameDetails} from '~/common/utils/file';
  import {WritableStore, ReadableStore, type IQueryableStore} from '~/common/utils/store';
  import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
  import type {SendMessageEventDetail} from '~/common/viewmodel/conversation/main/controller/types';
  import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.conversation-view');

  type $$Props = ConversationViewProps;

  export let services: $$Props['services'];

  const {router, backend} = services;

  // Params of the current route.
  let routeParams: ConversationRouteParams | undefined = undefined;

  // ViewModelBundle of the current conversation.
  let viewModelStore: IQueryableStore<RemoteConversationViewModelStoreValue | undefined> =
    new ReadableStore(undefined);
  let viewModelController: Remote<ConversationViewModelBundle>['viewModelController'] | undefined =
    undefined;

  // The message to bring into view initially.
  let initiallyVisibleMessageId: MessageId | undefined = undefined;

  // Initialize an empty draft store, which will be replaced with the actual store as soon as the
  // receiver of the current conversation is known.
  let draftStore: ConversationDraftStore = conversationDrafts.getOrCreateStore(undefined);

  // Props of the quoted message, if any.
  let quote:
    | {
        readonly id: MessageId;
        readonly props: QuoteProps;
      }
    | undefined = undefined;

  let editedMessage: Pick<MessagePropsFromBackend, 'actions' | 'id'> | undefined = undefined;

  let messageListComponent: SvelteNullableBinding<MessageList> = null;
  let composeBarComponent: SvelteNullableBinding<ComposeBar> = null;

  let composeBarMode: ComposeBarProps['mode'] = 'insert';

  let modalState: ModalState = {type: 'none'};

  let receiverSupportsEditedMessages: {supports: false} | {supports: true; excludedNames: string[]};

  function handleClickDeleteMessage(event: CustomEvent<MessagePropsFromBackend>): void {
    viewModelController?.deleteMessage(event.detail.id).catch((error) => {
      log.error(`Could not delete message with id ${event.detail.id}`, error);
      toast.addSimpleFailure(
        $i18n.t('messaging.error--delete-message', 'Could not delete message'),
      );
    });
  }

  function setQuote(event: CustomEvent<MessagePropsFromBackend>): void {
    const quotedMessage = event.detail;
    const conversationReceiverLookup = viewModelStore.get()?.receiver.lookup;

    if (conversationReceiverLookup === undefined) {
      return;
    }

    const sanitizedHtml = getTextContent(
      quotedMessage.text?.raw,
      quotedMessage.text?.mentions,
      $i18n.t,
    );

    quote = {
      id: quotedMessage.id,
      props: {
        alt: $i18n.t('messaging.hint--media-thumbnail'),
        content:
          sanitizedHtml === undefined
            ? undefined
            : {
                sanitizedHtml,
              },
        clickable: false,
        file: transformMessageFileProps(
          quotedMessage.file,
          quotedMessage.id,
          conversationReceiverLookup,
          services,
        ),
        mode: editedMessage !== undefined ? 'edit' : 'quote',
        onError: (error) =>
          log.error(
            `An error occurred in a child component: ${extractErrorMessage(error, 'short')}`,
          ),
        sender: quotedMessage.sender,
      },
    };

    composeBarComponent?.focus();
  }

  function handleClickQuoteMessage(event: CustomEvent<MessagePropsFromBackend>): void {
    if (editedMessage !== undefined) {
      composeBarComponent?.clear();
    }
    editedMessage = undefined;
    composeBarMode = 'insert';
    setQuote(event);
  }

  function handleClickEditMessage(event: CustomEvent<MessagePropsFromBackend>): void {
    if (!receiverSupportsEditedMessages.supports) {
      toast.addSimpleFailure(
        $i18n.t(
          'messaging.prose--edit-not-support',
          'Cannot edit the message because the receiver does not support this functionality.',
        ),
      );
      return;
    } else if (receiverSupportsEditedMessages.excludedNames.length > 0) {
      toast.addSimpleWarning(
        $i18n.t(
          'messaging.prose--edit-not-support-partial',
          'The following group members will not see your edits: {names}. To see edits, they must install the latest Threema version.',

          {
            names: receiverSupportsEditedMessages.excludedNames.join(', '),
          },
        ),
      );
    }
    composeBarMode = 'edit';
    const textToEdit = event.detail;

    composeBarComponent?.clear();
    // If we have an empty message, we simply put the empty string into the compose bar
    composeBarComponent?.insertText(textToEdit.text?.raw ?? '');
    editedMessage = {
      id: event.detail.id,
      actions: event.detail.actions,
    };
    setQuote(event);
  }

  function handleClickCloseQuote(): void {
    quote = undefined;
    editedMessage = undefined;
  }

  function handleClickEditClose(): void {
    composeBarMode = 'insert';
    quote = undefined;
    editedMessage = undefined;
    composeBarComponent?.clear();
  }

  function handleAddFiles(
    event: CustomEvent<FileResult> | CustomEvent<FileLoadResult> | CustomEvent<File[]>,
  ): void {
    if (!isReceiverDisabled) {
      openMediaComposeModal(event.detail).catch(assertUnreachable);
    }
  }

  function handleChangeRouterState(): void {
    const routerState = router.get();
    if (routerState.main.id === 'conversation') {
      routeParams = routerState.main.params;
    } else {
      // If we are not in a conversation, reset `routeParams` to `undefined` to clear the view.
      routeParams = undefined;
    }
  }

  async function handleChangeConversation(): Promise<void> {
    const receiver = routeParams?.receiverLookup;
    if (receiver === undefined) {
      viewModelStore = new ReadableStore(undefined);
      viewModelController = undefined;
      return;
    }

    // If the receiver is the same, it's not necessary to reload the `viewModelBundle`.
    if (
      receiver.type === $viewModelStore?.receiver.lookup.type &&
      receiver.uid === $viewModelStore.receiver.lookup.uid
    ) {
      // Scroll to `initialMessage` if it has changed.
      if (routeParams?.initialMessage !== undefined) {
        await messageListComponent?.scrollToMessage(routeParams.initialMessage.messageId, {
          behavior: 'smooth',
          block: 'start',
          highlightOnScrollEnd: true,
        });
      }

      return;
    }

    // Before the new `viewModelBundle` is loaded, check if another conversation is already loaded
    // and clear quote and save draft if necessary.
    if ($viewModelStore !== undefined) {
      quote = undefined;
      saveDraftAndClearComposeBar($viewModelStore.receiver.lookup);
    }

    await backend.viewModel
      .conversation(receiver)
      .then(async (viewModelBundle) => {
        if (viewModelBundle === undefined) {
          throw new Error('ViewModelBundle returned by the repository was undefined');
        }

        // Load draft if one exists for the new receiver.
        draftStore = conversationDrafts.getOrCreateStore(
          viewModelBundle.viewModelStore.get().receiver.lookup,
        );

        // Replace `viewModelBundle`.
        viewModelStore = viewModelBundle.viewModelStore;
        viewModelController = viewModelBundle.viewModelController;
        const editFeature = viewModelStore
          .get()
          ?.supportedFeatures.get(FEATURE_MASK_FLAG.EDIT_MESSAGE_SUPPORT);
        receiverSupportsEditedMessages =
          editFeature !== undefined
            ? {supports: true, excludedNames: editFeature.notSupported}
            : {supports: false};

        // Set an `initiallyVisibleMessageId` if provided by the current route.
        initiallyVisibleMessageId = routeParams?.initialMessage?.messageId;

        // Get initial data belonging to the new conversation from the current route.
        const draft = draftStore.get();
        const forwardedMessageText = (
          await getForwardedMessageViewModelBundle()
        )?.viewModelStore.get().text?.raw;
        const preloadedFiles = getPreloadedFiles();

        // Load initial data. Note: If there is both a draft and a forwarded message, the forwarded
        // message text has priority.
        composeBarComponent?.insertText(forwardedMessageText ?? draft ?? '');
        composeBarComponent?.focus();

        if (preloadedFiles !== undefined) {
          await openMediaComposeModal(preloadedFiles);
        }
      })
      .catch((error) => {
        log.error(
          `Failed to load conversation for receiver uid ${receiver.uid}: ${ensureError(error)}`,
        );

        toast.addSimpleFailure(
          i18n.get().t('messaging.error--conversation-not-found', 'Conversation not found'),
        );

        // Navigate back to the welcome page.
        router.replaceMain(ROUTE_DEFINITIONS.main.welcome.withoutParams());
      });
  }

  async function handleClickEdit(event: CustomEvent<string>): Promise<void> {
    await editedMessage?.actions.edit(event.detail).catch((error) => {
      log.error('Failed to update message with error:', error);
    });
    composeBarMode = 'insert';

    // Clear quote, draft and compose area.
    // eslint-disable-next-line require-atomic-updates
    quote = undefined;
    draftStore.set(undefined);
    composeBarComponent?.clear();
  }

  function handleClickSend(event: CustomEvent<string | SendMessageEventDetail>): void {
    switch (typeof event.detail) {
      case 'object':
        viewModelController?.sendMessage(event.detail).catch(assertUnreachable);
        break;

      case 'string': {
        const text = event.detail;

        // Do not send empty messages.
        if (text.trim() === '') {
          return;
        }

        viewModelController
          ?.sendMessage({
            type: 'text',
            text,
            quotedMessageId: quote?.id,
          })
          .catch(assertUnreachable);
        break;
      }

      default:
        break;
    }

    // Clear quote, draft and compose area.
    // eslint-disable-next-line require-atomic-updates
    quote = undefined;
    draftStore.set(undefined);
    composeBarComponent?.clear();

    // Set Nav to Conversation Preview List.
    if ($router.nav.id !== 'conversationList') {
      router.replaceNav(ROUTE_DEFINITIONS.nav.conversationList.withoutParams());
    }

    // Dispatch an event to scroll the conversation list all the way to the top.
    conversationListEvent.post({action: 'scroll-to-top'});

    // Scroll chat view all the way to the bottom to display the sent message.
    messageListComponent
      ?.scrollToLast({
        behavior: 'instant',
        block: 'end',
      })
      .catch(assertUnreachable);
  }

  function handleCloseModal(): void {
    // Reset modal state.
    modalState = {
      type: 'none',
    };
  }

  async function getForwardedMessageViewModelBundle(): Promise<
    Remote<ConversationMessageViewModelBundle> | undefined
  > {
    if (routeParams?.forwardedMessage === undefined) {
      return undefined;
    }

    return await viewModelController?.findForwardedMessage(
      routeParams.forwardedMessage.receiverLookup,
      routeParams.forwardedMessage.messageId,
    );
  }

  function getPreloadedFiles(): File[] | undefined {
    if (routeParams?.preloadedFiles === undefined) {
      return undefined;
    }

    return routeParams.preloadedFiles.map(
      ({bytes, fileName, mediaType}) => new File([new Blob([bytes], {type: mediaType})], fileName),
    );
  }

  /**
   * Open the media compose modal, optionally with initial files.
   */
  async function openMediaComposeModal(
    initialFiles?: File[] | FileLoadResult | FileResult,
  ): Promise<void> {
    // In edit mode, we dont allow pasting files.
    if (composeBarMode === 'edit') {
      toast.addSimpleFailure(
        $i18n.t(
          'messaging.prose--paste-image-in-edit',
          'When editing a message, files cannot be pasted.',
        ),
      );
      return;
    }

    const files: File[] = (await prepareFilesForMediaComposeModal(i18n, log, initialFiles)) ?? [];
    const mediaFiles: MediaFile[] = files.map((file, index) => ({
      type: 'local',
      file,
      thumbnail: generateThumbnail(file, log),
      caption: new WritableStore(index === 0 ? composeBarComponent?.getText() : undefined),
      sanitizedFilenameDetails: getSanitizedFileNameDetails(file),
      sendAsFile: new WritableStore(false),
    }));

    if (mediaFiles.length < 1) {
      return;
    }

    // At this point we can be certain that we are going to open the modal, so we can clear the
    // current text of the `TextArea`, as it's transferred to the first media caption.
    composeBarComponent?.clear();

    modalState = {
      type: 'media-compose',
      props: {
        title: $i18n.t('dialog--compose-media-message.label--title', 'Send File to {name}', {
          name: $viewModelStore?.receiver.name,
        }),
        mediaFiles,
        visible: true,
      },
    };
  }

  /**
   * Save the message draft for the specified receiver and clear the compose area.
   */
  function saveDraftAndClearComposeBar(currentReceiverLookup?: DbReceiverLookup): void {
    draftStore = conversationDrafts.getOrCreateStore(currentReceiverLookup);

    // Save current message draft.
    const currentText = composeBarComponent?.getText();
    draftStore.set(currentText?.trim() === '' ? undefined : currentText);

    composeBarComponent?.clear();
  }

  $: reactive(handleChangeRouterState, [$router]);
  $: reactive(handleChangeConversation, [
    routeParams?.receiverLookup,
    routeParams?.initialMessage,
  ]).catch(assertUnreachable);

  /**
   * Whether the current receiver is able to be contacted.
   */
  $: isReceiverDisabled =
    ($viewModelStore?.receiver.type === 'contact' && $viewModelStore.receiver.isInvalid) ||
    ($viewModelStore?.receiver.type === 'contact' && $viewModelStore.receiver.isBlocked) ||
    ($viewModelStore?.receiver.type === 'group' && $viewModelStore.receiver.isLeft);

  onDestroy(() => {
    saveDraftAndClearComposeBar($viewModelStore?.receiver.lookup);
  });
</script>

{#if $viewModelStore !== undefined && viewModelController !== undefined}
  <DropZoneProvider
    overlay={{
      message: $i18n.t('messaging.hint--drop-files-to-send', 'Drop files here to send'),
    }}
    on:dropfiles={handleAddFiles}
  >
    <div class="conversation">
      <div class="header">
        <TopBar
          conversation={{
            archive: async () => {
              await viewModelController
                ?.archive()
                .catch((error) => log.error('Could not archive conversation', error));
            },
            clear: async () => {
              await viewModelController
                ?.clear()
                .catch((error) => log.error('Could not clear conversation', error));
            },
            isArchived: $viewModelStore.isArchived,
            isPinned: $viewModelStore.isPinned,
            pin: async () => {
              await viewModelController
                ?.pin()
                .catch((error) => log.error('Could not pin conversation', error));
            },
            totalMessagesCount: $viewModelStore.totalMessagesCount,
            unarchive: async () => {
              await viewModelController
                ?.unarchive()
                .catch((error) => log.error('Could not unarchive conversation', error));
            },
            unpin: async () => {
              await viewModelController
                ?.unpin()
                .catch((error) => log.error('Could not unpin conversation', error));
            },
          }}
          receiver={$viewModelStore.receiver}
          {services}
        />
      </div>

      {#if $viewModelStore.category === ConversationCategory.PROTECTED}
        <div class="private">
          <div class="box">
            <div class="header">
              {$i18n.t(
                'dialog--unsupported-feature-protected-conversation.label--title',
                'Private Chat',
              )}
            </div>
            <div class="content">
              {$i18n.t(
                'dialog--unsupported-feature-protected-conversation.prose--description',
                'Private chats are not supported in {appName}.',
                {appName: import.meta.env.APP_NAME},
              )}
            </div>
          </div>
        </div>
      {:else}
        <div class="messages">
          <MessageList
            bind:this={messageListComponent}
            conversation={{
              firstUnreadMessageId: $viewModelStore.firstUnreadMessageId,
              id: $viewModelStore.id,
              initiallyVisibleMessageId,
              lastMessage: $viewModelStore.lastMessage,
              markAllMessagesAsRead: async () => {
                await viewModelController
                  ?.markAllMessagesAsRead()
                  .catch((error) =>
                    log.error('Could not mark all messages as read in conversation', error),
                  );
              },
              receiver: $viewModelStore.receiver,
              setCurrentViewportMessages: viewModelController.setCurrentViewportMessages,
              unreadMessagesCount: $viewModelStore.unreadMessagesCount,
            }}
            messageSetStore={$viewModelStore.messageSetStore}
            {services}
            on:clickdelete={handleClickDeleteMessage}
            on:clickquote={handleClickQuoteMessage}
            on:clickedit={handleClickEditMessage}
          />
        </div>

        <div class="footer">
          {#if $viewModelStore.receiver.type === 'contact' && $viewModelStore.receiver.isInvalid}
            <div class="disabled-compose-bar">
              {$i18n.t(
                'messaging.error--contact-invalid',
                'You cannot send a message to this contact because it is invalid.',
              )}
            </div>
          {:else if $viewModelStore.receiver.type === 'group' && $viewModelStore.receiver.isLeft}
            <div class="disabled-compose-bar">
              {$i18n.t(
                'messaging.error--group-membership',
                'You are no longer part of this group.',
              )}
            </div>
          {:else if $viewModelStore.receiver.type === 'contact' && $viewModelStore.receiver.isBlocked}
            <div class="disabled-compose-bar">
              {$i18n.t(
                'messaging.error--contact-blocked',
                'You cannot send a message to this contact because it is blocked.',
              )}
            </div>
          {:else}
            {#if quote !== undefined}
              <div class="quote">
                {#key quote.id}
                  <div class="body">
                    <Quote {...quote.props} />
                  </div>

                  <IconButton
                    flavor="naked"
                    on:click={composeBarMode === 'edit'
                      ? handleClickEditClose
                      : handleClickCloseQuote}
                  >
                    <MdIcon theme="Filled">close</MdIcon>
                  </IconButton>
                {/key}
              </div>
            {/if}

            <ComposeBar
              bind:this={composeBarComponent}
              mode={composeBarMode}
              options={{
                showAttachFilesButton: quote === undefined,
              }}
              on:attachfiles={handleAddFiles}
              on:clicksend={handleClickSend}
              on:pastefiles={handleAddFiles}
              on:clickedit={handleClickEdit}
            />
          {/if}
        </div>
      {/if}
    </div>
  </DropZoneProvider>
{/if}

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'media-compose'}
  <MediaMessage {...modalState.props} on:close={handleCloseModal} on:clicksend={handleClickSend} />
{:else}
  {unreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .conversation {
    position: relative;
    display: grid;
    grid-template:
      'header' min-content
      'messages' minmax(0, 1fr)
      'footer' min-content
      / 100%;
    height: 100%;

    .header {
      grid-area: header;
    }

    .messages {
      grid-area: messages;
    }

    .private {
      grid-row-start: messages;
      grid-column-start: messages;
      grid-row-end: footer;
      grid-column-end: footer;

      display: flex;
      align-items: center;
      justify-content: center;

      .box {
        @extend %elevation-060;
        border-radius: rem(3px);
        overflow: hidden;

        .header {
          @extend %font-h5-400;
          background-color: #ff5722;
          padding: 20px 10px;
        }

        .content {
          padding: 10px;
          background-color: var(--t-main-background-color);
        }
      }
    }

    .footer {
      grid-area: footer;
      border-top: rem(1px) var(--t-panel-gap-color) solid;
      box-sizing: border-box;

      .quote {
        background-color: var(--cc-compose-area-quote-background-color);
        padding: rem(8px) rem(8px) rem(8px) rem(16px);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: rem(24px);

        .body {
          flex-grow: 1;
        }
      }

      .disabled-compose-bar {
        text-align: center;
        margin: 1.5rem;
        opacity: 0.5;
        font-style: italic;
      }
    }
  }
</style>
