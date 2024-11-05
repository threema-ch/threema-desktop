<script lang="ts">
  import {onDestroy, onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import DropZoneProvider from '~/app/ui/components/hocs/drop-zone-provider/DropZoneProvider.svelte';
  import FocusMoverProvider from '~/app/ui/components/hocs/focus-mover-provider/FocusMoverProvider.svelte';
  import Quote from '~/app/ui/components/molecules/message/internal/quote/Quote.svelte';
  import {
    type ConversationDraftStore,
    conversationDrafts,
    type Draft,
  } from '~/app/ui/components/partials/conversation/drafts';
  import {
    getFilteredMentionReceiverPreviewListItems,
    getParsedTextChunks,
    prepareFilesForMediaComposeModal,
  } from '~/app/ui/components/partials/conversation/helpers';
  import ComposeBar from '~/app/ui/components/partials/conversation/internal/compose-bar/ComposeBar.svelte';
  import DeleteMessageModal from '~/app/ui/components/partials/conversation/internal/delete-message-modal/DeleteMessageModal.svelte';
  import EveryoneMentionListItem from '~/app/ui/components/partials/conversation/internal/everyone-mention-list-item/EveryoneMentionListItem.svelte';
  import MessageList from '~/app/ui/components/partials/conversation/internal/message-list/MessageList.svelte';
  import {getTextContent} from '~/app/ui/components/partials/conversation/internal/message-list/internal/regular-message/helpers';
  import {transformMessageFileProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/regular-message/transformers';
  import type {
    AnyMessageListMessage,
    MessageListRegularMessage,
  } from '~/app/ui/components/partials/conversation/internal/message-list/props';
  import TopBar from '~/app/ui/components/partials/conversation/internal/top-bar/TopBar.svelte';
  import type {ConversationViewProps} from '~/app/ui/components/partials/conversation/props';
  import {messageSetStoreToMessageListMessagesStore} from '~/app/ui/components/partials/conversation/transformers';
  import type {
    ComposeBarState,
    ConversationRouteParams,
    EditedMessage,
    ModalState,
    QuotedMessage,
    RemoteConversationViewModelStoreValue,
  } from '~/app/ui/components/partials/conversation/types';
  import {conversationListEvent} from '~/app/ui/components/partials/conversation-nav/helpers';
  import ReceiverPreviewList from '~/app/ui/components/partials/receiver-preview-list/ReceiverPreviewList.svelte';
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
  import {ConversationCategory, MessageDirection, ReceiverType} from '~/common/enum';
  import {extractErrorMessage} from '~/common/error';
  import {EDIT_MESSAGE_GRACE_PERIOD_IN_MINUTES} from '~/common/network/protocol/constants';
  import {FEATURE_MASK_FLAG, type MessageId} from '~/common/network/types';
  import {assertUnreachable, ensureError, unreachable, unwrap} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import {getSanitizedFileNameDetails} from '~/common/utils/file';
  import {
    WritableStore,
    ReadableStore,
    type IQueryableStore,
    type StoreUnsubscriber,
  } from '~/common/utils/store';
  import {TIMER} from '~/common/utils/timer';
  import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
  import type {SendMessageEventDetail} from '~/common/viewmodel/conversation/main/controller/types';
  import type {ConversationRegularMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/regular-message';
  import type {FeatureSupport} from '~/common/viewmodel/conversation/main/store/types';
  import {EVERYONE_IDENTITY_STRING} from '~/common/viewmodel/utils/mentions';
  import type {AnyReceiverData, ContactReceiverData} from '~/common/viewmodel/utils/receiver';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.conversation-view');

  type $$Props = ConversationViewProps;

  export let services: $$Props['services'];

  const {
    router,
    backend,
    settings: {chat},
  } = services;

  // Unsubscriber for the view model store
  let viewModelStoreUnsubscriber: StoreUnsubscriber | undefined = undefined;
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

  let messageListComponent: SvelteNullableBinding<MessageList> = null;
  let composeBarComponent: SvelteNullableBinding<ComposeBar> = null;
  let focusMoverProviderComponent: SvelteNullableBinding<FocusMoverProvider> = null;

  let composeBarState: ComposeBarState = {
    type: 'insert',
    quotedMessage: undefined,
    editedMessage: undefined,
    mentionString: undefined,
  };

  let modalState: ModalState = {type: 'none'};

  let receiverSupportsEditedMessages: FeatureSupport;
  let receiverSupportsDeletedMessages: FeatureSupport;

  // Setup isTyping timer to 5s
  const resetIsTypingTimer = TIMER.debounce(() => {
    dispatchIsTyping(false);
  }, 5000);

  // Set and dispatch isTyping event
  function dispatchIsTyping(isTyping: boolean): void {
    viewModelController?.sendIsTyping(isTyping).catch(assertUnreachable);
  }

  function handleclickjoincall(
    receiverLookup: DbReceiverLookup,
    intent: 'join' | 'join-or-create',
  ): void {
    if (receiverLookup.type !== ReceiverType.GROUP) {
      return;
    }
    router.go({activity: ROUTE_DEFINITIONS.activity.call.withParams({receiverLookup, intent})});
  }

  function handleClickDeleteMessageLocally(event: CustomEvent<AnyMessageListMessage>): void {
    switch (event.detail.type) {
      case 'deleted-message':
      case 'regular-message':
        viewModelController?.removeMessage(event.detail.id).catch((error: unknown) => {
          log.error(`Could not delete message with id ${event.detail.id}`, error);
          toast.addSimpleFailure(
            $i18n.t('messaging.error--delete-message', 'Could not delete message'),
          );
        });
        break;

      case 'status-message':
        viewModelController?.removeStatusMessage(event.detail.id).catch((error: unknown) => {
          log.error(`Could not delete status message with id ${event.detail.id}`, error);
          toast.addSimpleFailure(
            $i18n.t('messaging.error--delete-status-message', 'Could not delete status message'),
          );
        });
        break;

      default:
        unreachable(event.detail);
    }
  }

  function handleClickDeleteMessageForEveryone(
    event: CustomEvent<MessageListRegularMessage>,
  ): void {
    if (event.detail.status.deleted !== undefined) {
      log.warn('Tried to delete an already deleted message on all devices');
      return;
    }

    viewModelController?.markMessageAsDeleted(event.detail.id).catch((error: unknown) => {
      log.error(`Could not delete message with id ${event.detail.id}`, error);
      toast.addSimpleFailure($i18n.t('messaging.error--delete-message'));
    });
  }

  function getComposeBarQuoteComponent(
    quotedMessageProps: MessageListRegularMessage,
  ): QuotedMessage | undefined {
    const conversationReceiverLookup = viewModelStore.get()?.receiver.lookup;

    if (conversationReceiverLookup === undefined) {
      return undefined;
    }

    const sanitizedHtml = getTextContent(
      quotedMessageProps.text?.raw,
      quotedMessageProps.text?.mentions,
      $i18n.t,
    );

    composeBarComponent?.focus();

    return {
      id: quotedMessageProps.id,
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
          quotedMessageProps.file,
          quotedMessageProps.id,
          conversationReceiverLookup,
          services,
        ),
        onError: (error) =>
          log.error(
            `An error occurred in a child component: ${extractErrorMessage(error, 'short')}`,
          ),
        sender: quotedMessageProps.sender,
      },
    };
  }

  function handleClickQuoteMessage(event: CustomEvent<MessageListRegularMessage>): void {
    if (composeBarState.type === 'edit') {
      composeBarComponent?.clear();
    }
    const quotedMessage = getComposeBarQuoteComponent(event.detail);
    if (quotedMessage === undefined) {
      composeBarState = {
        type: 'insert',
        quotedMessage: undefined,
        editedMessage: undefined,
        mentionString: undefined,
      };
      return;
    }
    composeBarState = {
      type: 'insert',
      quotedMessage,
      editedMessage: undefined,
      mentionString: undefined,
    };
    composeBarComponent?.focus();
  }

  function handleClickEditMessage(messageProperties: MessageListRegularMessage): void {
    if (!receiverSupportsEditedMessages.supported) {
      if ($viewModelStore?.receiver.type === 'contact') {
        toast.addSimpleFailure(
          $i18n.t(
            'messaging.prose--edit-not-supported',
            'Cannot edit the message because the recipient’s app version does not support this feature.',
          ),
        );
      } else if ($viewModelStore?.receiver.type === 'group') {
        toast.addSimpleFailure(
          $i18n.t(
            'messaging.prose--edit-not-supported-group',
            'Cannot edit the message because no group member supports this feature.',
          ),
        );
      }

      return;
    } else if (receiverSupportsEditedMessages.notSupportedNames.length > 0) {
      const numNotSupported = receiverSupportsEditedMessages.notSupportedNames.length;
      toast.addSimpleWarning(
        $i18n.t(
          'messaging.prose--edit-not-supported-partial',
          'The following group members will not be able to see your edits: {names}{n, plural, =0 {.} other { and {n} more.}} To see edits, they need to install the latest Threema version.',
          {
            names: receiverSupportsEditedMessages.notSupportedNames.slice(0, 5).join(', '),
            n: `${numNotSupported > 5 ? numNotSupported - 5 : 0}`,
          },
        ),
      );
    }

    // Insert text to edit into the compose area.
    composeBarComponent?.clear();
    insertComposeBarText($viewModelStore?.receiver, messageProperties.text?.raw ?? '');

    const editedMessage: EditedMessage = {
      id: messageProperties.id,
      actions: messageProperties.actions,
      text: messageProperties.text,
    };
    const quotedMessage = getComposeBarQuoteComponent(messageProperties);
    if (quotedMessage === undefined) {
      composeBarState = {
        type: 'insert',
        quotedMessage: undefined,
        editedMessage: undefined,
        mentionString: undefined,
      };
      return;
    }
    composeBarState = {type: 'edit', editedMessage, quotedMessage, mentionString: undefined};
  }

  function handleClickCloseQuote(): void {
    composeBarState = {
      type: 'insert',
      editedMessage: undefined,
      quotedMessage: undefined,
      mentionString: undefined,
    };
    draftStore.set(undefined);
  }

  function handleClickEditClose(): void {
    resetComposeBar();
    draftStore.set(undefined);
  }

  function handleAddFiles(
    event: CustomEvent<FileResult> | CustomEvent<FileLoadResult> | CustomEvent<File[]>,
  ): void {
    resetIsTypingTimer();
    dispatchIsTyping(true);
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
    dispatchIsTyping(false);

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
      saveDraftAndClearComposeBar($viewModelStore.receiver.lookup);
      composeBarState = {
        type: 'insert',
        editedMessage: undefined,
        quotedMessage: undefined,
        mentionString: undefined,
      };
    }

    await backend.viewModel
      .conversation(receiver)
      .then(async (viewModelBundle) => {
        if (viewModelBundle === undefined) {
          throw new Error('ViewModelBundle returned by the repository was undefined');
        }

        // If viewmodel value becomes undefined (meaning that the conversation has been deleted),
        // navigate away to the welcome screen.
        viewModelStoreUnsubscriber?.();
        viewModelStoreUnsubscriber = viewModelBundle.viewModelStore.subscribe((value) => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (value === undefined) {
            router.goToWelcome();
          }
        });

        // Unpack bundle
        viewModelStore = viewModelBundle.viewModelStore;
        viewModelController = viewModelBundle.viewModelController;

        // Check for edit support
        receiverSupportsEditedMessages = viewModelStore
          .get()
          ?.supportedFeatures.get(FEATURE_MASK_FLAG.EDIT_MESSAGE_SUPPORT) ?? {supported: false};

        receiverSupportsDeletedMessages = viewModelStore
          .get()
          ?.supportedFeatures.get(FEATURE_MASK_FLAG.DELETED_MESSAGES_SUPPORT) ?? {supported: false};

        // Set an `initiallyVisibleMessageId` if provided by the current route.
        initiallyVisibleMessageId = routeParams?.initialMessage?.messageId;

        // Load draft if one exists for the new receiver.
        if ($viewModelStore !== undefined) {
          draftStore = conversationDrafts.getOrCreateStore($viewModelStore.receiver.lookup);
        }
        const draft = draftStore.get();
        const forwardedMessageText = (
          await getForwardedMessageViewModelBundle()
        )?.viewModelStore.get().text?.raw;

        const preloadedFiles = getPreloadedFiles();

        // Load initial data. Note: If there is both a draft and a forwarded message, the forwarded
        // message text has priority.

        // Compose bar state
        if (forwardedMessageText !== undefined) {
          composeBarState = {
            type: 'insert',
            editedMessage: undefined,
            quotedMessage: undefined,
            mentionString: undefined,
          };
        } else if (draft?.extended?.type === 'edit') {
          composeBarState = {
            type: 'edit',
            editedMessage: draft.extended.edit,
            quotedMessage: draft.extended.quote,
            mentionString: undefined,
          };
        } else if (draft?.extended?.type === 'quote') {
          composeBarState = {
            type: 'insert',
            quotedMessage: draft.extended.quote,
            editedMessage: undefined,
            mentionString: undefined,
          };
        }

        // Text
        insertComposeBarText($viewModelStore?.receiver, forwardedMessageText ?? draft?.text ?? '');

        // Files
        if (preloadedFiles !== undefined) {
          await openMediaComposeModal(preloadedFiles);
        }
      })
      .catch((error: unknown) => {
        log.error(
          `Failed to load conversation for receiver uid ${receiver.uid}: ${ensureError(error)}`,
        );

        toast.addSimpleFailure(
          i18n.get().t('messaging.error--conversation-not-found', 'Conversation not found'),
        );

        // Navigate back to the welcome page.
        router.go({main: ROUTE_DEFINITIONS.main.welcome.withoutParams()});
      });
  }

  function resetComposeBar(): void {
    composeBarState = {
      type: 'insert',
      editedMessage: undefined,
      quotedMessage: undefined,
      mentionString: undefined,
    };
    composeBarComponent?.clear();
  }

  function insertComposeBarText(receiver: AnyReceiverData | undefined, text: string): void {
    const chunkedText = getParsedTextChunks(receiver, text, log);
    for (const chunk of chunkedText) {
      switch (chunk.type) {
        case 'text':
          composeBarComponent?.insertText(chunk.text);
          break;

        case 'mention':
          composeBarComponent?.insertMention(chunk.mention);
          break;

        default:
          unreachable(chunk);
      }
    }
    composeBarComponent?.focus();
  }

  async function handleClickApplyEdit(event: CustomEvent<string>): Promise<void> {
    if (composeBarState.editedMessage === undefined) {
      log.warn('Cannot edit message because no message to edit is set.');
      return;
    }
    if (event.detail === composeBarState.editedMessage.text?.raw) {
      resetComposeBar();
      draftStore.set(undefined);
      return;
    }

    // For file messages, we allow empty captions.
    if (event.detail.trim() === '' && composeBarState.quotedMessage?.props.file === undefined) {
      log.warn('Cannot change message to empty message');
      resetComposeBar();
      draftStore.set(undefined);
      return;
    }

    await composeBarState.editedMessage.actions.edit(event.detail).catch((error: unknown) => {
      log.error('Failed to update message with error:', error);
    });
    resetComposeBar();
    draftStore.set(undefined);
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
            quotedMessageId: composeBarState.quotedMessage?.id,
          })
          .catch(assertUnreachable);
        break;
      }

      default:
        break;
    }

    resetComposeBar();

    // Set Nav to Conversation Preview List.
    if ($router.nav.id !== 'conversationList') {
      router.go({nav: ROUTE_DEFINITIONS.nav.conversationList.withoutParams()});
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
    Remote<ConversationRegularMessageViewModelBundle> | undefined
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

  function handleClickDeleteMessage(event: CustomEvent<AnyMessageListMessage>): void {
    if (event.detail.type === 'status-message') {
      handleClickDeleteMessageLocally(event);
      return;
    }

    modalState = {
      type: 'delete-message',
      props: event.detail,
    };
  }

  function handleClickMentionEveryone(): void {
    composeBarComponent?.insertMention({
      type: 'everyone',
      identity: EVERYONE_IDENTITY_STRING,
    });
    composeBarState = {
      ...composeBarState,
      mentionString: undefined,
    };
  }

  function handleClickMentionReceiver(event: CustomEvent<{lookup: DbReceiverLookup}>): void {
    if ($viewModelStore?.receiver.type !== 'group') {
      log.error('Mentioning is only allowed in groups');
      return;
    }

    const group = $viewModelStore.receiver;
    const receiver = group.members
      .concat(group.creator)
      .find(
        (member): member is ContactReceiverData =>
          member.type === 'contact' &&
          member.lookup.type === event.detail.lookup.type &&
          member.lookup.uid === event.detail.lookup.uid,
      );
    if (receiver === undefined) {
      log.error("Mentioned receiver couldn't be found in the current group");
      return;
    }

    composeBarComponent?.insertMention(receiver);
    composeBarState = {
      ...composeBarState,
      mentionString: undefined,
    };
  }

  /**
   * Open the media compose modal, optionally with initial files.
   */
  async function openMediaComposeModal(
    initialFiles?: File[] | FileLoadResult | FileResult,
  ): Promise<void> {
    // In edit mode, we dont allow pasting files.
    if (composeBarState.type === 'edit') {
      toast.addSimpleFailure(
        $i18n.t(
          'messaging.prose--paste-image-in-edit',
          'It’s not possible to paste a file when editing a message.',
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
        enterKeyMode: $chat.view.onEnterSubmit ? 'submit' : 'newline',
      },
    };
  }

  /**
   * Save the message draft for the specified receiver and clear the compose area.
   */
  function saveDraftAndClearComposeBar(currentReceiverLookup?: DbReceiverLookup): void {
    draftStore = conversationDrafts.getOrCreateStore(currentReceiverLookup);
    const currentText = composeBarComponent?.getText();

    if (currentText === undefined || currentText.trim() === '') {
      draftStore.set(undefined);
      return;
    }

    let extended: Draft['extended'] = undefined;

    // We allow saving an edit of a quote to the draft.
    // If so, the edit mode as well as well as the quoted message remain.
    if (composeBarState.type === 'edit') {
      extended = {
        type: 'edit',
        edit: composeBarState.editedMessage,
        quote: composeBarState.quotedMessage,
      };

      // Store only the quote to the draft.
    } else if (composeBarState.quotedMessage !== undefined) {
      extended = {
        type: 'quote',
        quote: composeBarState.quotedMessage,
      };
    }

    // Save current message draft.
    draftStore.set({
      text: currentText,
      extended,
    });

    resetComposeBar();
  }

  function handleEditLastMessage(event?: KeyboardEvent): void {
    if ($viewModelStore?.lastMessage?.direction !== MessageDirection.OUTBOUND) {
      // LastMessage cannot be edited because it's not outbound.
      return;
    }

    const lastMessage = $viewModelStore.lastMessage;
    // While searching for a match, also ensure that the message is a `MessageListRegularMessage`,
    // because that's the only type of message which can be edited.
    const messageToEdit = messagesStore
      ?.get()
      .find(
        (message): message is MessageListRegularMessage =>
          message.type === 'regular-message' && message.id === lastMessage.id,
      );

    if (
      messageToEdit?.status.sent !== undefined &&
      Date.now() - messageToEdit.status.sent.at.getTime() <
        EDIT_MESSAGE_GRACE_PERIOD_IN_MINUTES * 60000 &&
      messageToEdit.status.deleted === undefined
    ) {
      event?.preventDefault();

      handleClickEditMessage(messageToEdit);
      composeBarComponent?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (modalState.type !== 'none') {
      // Only honor key actions if no modal is open.
      return;
    }

    if (event.key === 'Escape') {
      if (composeBarState.mentionString !== undefined) {
        composeBarState = {
          ...composeBarState,
          mentionString: undefined,
        };
      } else if (composeBarState.type === 'insert') {
        handleClickCloseQuote();
      } else {
        handleClickEditClose();
      }
      composeBarComponent?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      if (composeBarState.mentionString !== undefined) {
        // If the mention editor is currently open, `"ArrowUp"` should focus the last mention. After
        // that, the `FocusMoverProvider` handles cycling.
        focusMoverProviderComponent?.focusChild('last');
      } else if (
        composeBarState.quotedMessage === undefined &&
        (composeBarComponent?.getText() === undefined || composeBarComponent.getText() === '')
      ) {
        // Else, `"ArrowUp"` triggers edit mode for `lastMessage`.
        handleEditLastMessage(event);
      }
      return;
    }

    if (event.key === 'ArrowDown' && composeBarState.mentionString !== undefined) {
      // If the mention editor is currently open, `"ArrowDown"` should focus the first mention.
      // After that, the `FocusMoverProvider` handles cycling.
      focusMoverProviderComponent?.focusChild('first');
    }
  }

  function handleIsTyping(event: CustomEvent<boolean>): void {
    resetIsTypingTimer();
    dispatchIsTyping(event.detail);
  }

  function handleMatchMention(
    update:
      | {
          readonly type: 'update';
          readonly value: string;
        }
      | {
          readonly type: 'end';
        },
  ): void {
    switch (update.type) {
      case 'update':
        composeBarState = {
          ...composeBarState,
          mentionString: update.value,
        };
        break;

      case 'end':
        composeBarState = {
          ...composeBarState,
          mentionString: undefined,
        };
        break;

      default:
        unreachable(update);
    }
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

  $: messagesStore =
    $viewModelStore === undefined
      ? undefined
      : messageSetStoreToMessageListMessagesStore($viewModelStore.messageSetStore, $i18n);

  $: if (
    $viewModelStore?.receiver.type === 'contact' &&
    $viewModelStore.receiver.acquaintanceLevel === 'group-or-deleted'
  ) {
    router.goToWelcome();
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    saveDraftAndClearComposeBar($viewModelStore?.receiver.lookup);
    window.removeEventListener('keydown', handleKeyDown);
    viewModelStoreUnsubscriber?.();
  });
</script>

{#if $viewModelStore !== undefined && viewModelController !== undefined && messagesStore !== undefined}
  <DropZoneProvider
    overlay={{
      message: $i18n.t('messaging.hint--drop-files-to-send', 'Drop files here to send'),
    }}
    on:dropfiles={handleAddFiles}
  >
    <div class="conversation">
      <div class="header">
        <TopBar
          call={$viewModelStore.call}
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
            delete: async () => {
              await viewModelController?.delete().catch(assertUnreachable);
              if (
                $router.main.id === 'conversation' &&
                $router.main.params.receiverLookup.type === $viewModelStore.receiver.lookup.type &&
                $router.main.params.receiverLookup.uid === $viewModelStore.receiver.lookup.uid
              ) {
                router.goToWelcome();
              }
            },
          }}
          receiver={$viewModelStore.receiver}
          {services}
          on:clickjoincall={({detail: {intent}}) =>
            handleclickjoincall(unwrap($viewModelStore).receiver.lookup, intent)}
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
              isEditingSupported: receiverSupportsEditedMessages.supported,
              isTyping: $viewModelStore.isTyping,
              lastMessage: $viewModelStore.lastMessage,
              markAllMessagesAsRead: () => {
                viewModelController
                  ?.markAllMessagesAsRead()
                  .catch((error) =>
                    log.error('Could not mark all messages as read in conversation', error),
                  );
              },
              receiver: $viewModelStore.receiver,
              setCurrentViewportMessages: viewModelController.setCurrentViewportMessages,
              unreadMessagesCount: $viewModelStore.unreadMessagesCount,
            }}
            {messagesStore}
            {services}
            on:clickdelete={handleClickDeleteMessage}
            on:clickquote={handleClickQuoteMessage}
            on:clickedit={(event) => handleClickEditMessage(event.detail)}
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
            {#if composeBarState.quotedMessage !== undefined}
              <div class="quote">
                {#key composeBarState.quotedMessage.id}
                  <div class="body">
                    <Quote
                      {...composeBarState.quotedMessage.props}
                      mode={composeBarState.type === 'edit' ? 'edit' : 'quote'}
                    />
                  </div>

                  <IconButton
                    flavor="naked"
                    on:click={composeBarState.type === 'edit'
                      ? handleClickEditClose
                      : handleClickCloseQuote}
                  >
                    <MdIcon theme="Filled">close</MdIcon>
                  </IconButton>
                {/key}
              </div>
            {/if}
            {#if composeBarState.mentionString !== undefined && $viewModelStore.receiver.type === 'group'}
              <div class="mention-list">
                <FocusMoverProvider bind:this={focusMoverProviderComponent}>
                  <EveryoneMentionListItem
                    receiver={$viewModelStore.receiver}
                    {services}
                    on:click={handleClickMentionEveryone}
                  />
                  <ReceiverPreviewList
                    highlights={composeBarState.mentionString}
                    items={getFilteredMentionReceiverPreviewListItems(
                      $viewModelStore.receiver,
                      composeBarState.mentionString,
                    )}
                    {services}
                    on:clickitem={handleClickMentionReceiver}
                  />
                </FocusMoverProvider>
              </div>
            {/if}
            <ComposeBar
              bind:this={composeBarComponent}
              mode={composeBarState.type}
              options={{
                showAttachFilesButton: composeBarState.quotedMessage === undefined,
                allowEmptyMessages:
                  composeBarState.type === 'edit' &&
                  composeBarState.quotedMessage.props.file !== undefined,
              }}
              triggerWords={[
                {
                  prefix: '@',
                  onMatch(value) {
                    handleMatchMention({type: 'update', value});
                  },
                  onMatchEnd() {
                    handleMatchMention({type: 'end'});
                  },
                },
              ]}
              onPaste={(text) => insertComposeBarText($viewModelStore.receiver, text)}
              enterKeyMode={$chat.view.onEnterSubmit ? 'submit' : 'newline'}
              on:attachfiles={handleAddFiles}
              on:clicksend={handleClickSend}
              on:pastefiles={handleAddFiles}
              on:clickapplyedit={handleClickApplyEdit}
              on:istyping={handleIsTyping}
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
{:else if modalState.type === 'delete-message'}
  {@const receiver = $viewModelStore?.receiver}
  <DeleteMessageModal
    message={{...modalState.props}}
    featureSupport={receiverSupportsDeletedMessages}
    showDeleteForEveryoneButton={!(receiver?.type === 'group' && receiver.isLeft)}
    on:close={handleCloseModal}
    on:clickdeletelocally={handleClickDeleteMessageLocally}
    on:clickdeleteforeveryone={handleClickDeleteMessageForEveryone}
  />
{:else}
  {unreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .conversation {
    position: relative;
    display: grid;
    grid-template:
      'header' rem(64px)
      'messages' minmax(0, 1fr)
      'footer' min-content
      / 100%;
    height: 100%;

    .header {
      z-index: 1;

      grid-area: header;

      background-color: var(--cc-conversation-header-background-color);
      backdrop-filter: blur(10px);

      border-bottom: 1px solid var(--t-panel-gap-color);
    }

    .messages {
      z-index: 0;

      grid-area: messages;

      grid-row-start: header;
      grid-column-start: header;
      grid-row-end: messages;
      grid-column-end: messages;

      & :global(> .chat > .list) {
        padding-top: calc(rem(64px) + rem(8px));
        scroll-padding-top: calc(rem(64px) + rem(8px));
      }
    }

    .private {
      z-index: 2;

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
      z-index: 1;
      grid-area: footer;

      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: end;

      max-height: 75vh;
      border-top: rem(1px) var(--t-panel-gap-color) solid;
      box-sizing: border-box;

      .quote {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: rem(24px);

        padding: rem(8px) rem(8px) rem(8px) rem(16px);
        background-color: var(--cc-compose-area-quote-background-color);

        overflow-y: auto;

        & :global(> button) {
          position: sticky;
          top: 0;
        }
      }

      .mention-list {
        overflow-y: auto;
        max-height: rem(256px);
        border-bottom: rem(1px) var(--t-panel-gap-color) solid;

        :global(> *) {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: start;
        }
      }

      .quote ~ .mention-list {
        border-top: rem(1px) var(--t-panel-gap-color) solid;
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
