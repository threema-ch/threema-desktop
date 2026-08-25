<script lang="ts">
  import {ensureArrayBufferBackedView} from '@threema/ts-utils/byte/array-buffer-backed-view';
  import {UTF8} from '@threema/ts-utils/codec/utf8';
  import {ensureError} from '@threema/ts-utils/meta/ensure-error';
  import {getGraphemeClusters} from '@threema/ts-utils/string/get-grapheme-clusters';
  import {TIMER} from '@threema/ts-utils/timer/global-timer';
  import {onDestroy, onMount, tick, untrack} from 'svelte';

  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import AvailabilityBanner from '~/app/ui/components/atoms/availability-banner/AvailabilityBanner.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
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
  import InlineEmojiSeachList from '~/app/ui/components/partials/conversation/internal/inline-emoji-search-list/InlineEmojiSearchList.svelte';
  import MessageList from '~/app/ui/components/partials/conversation/internal/message-list/MessageList.svelte';
  import {getTextContent} from '~/app/ui/components/partials/conversation/internal/message-list/internal/regular-message/helpers';
  import {transformMessageFileProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/regular-message/transformers';
  import type {
    AnyMessageListMessageStore,
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
  import CreatePollModal from '~/app/ui/components/partials/modals/create-poll-modal/CreatePollModal.svelte';
  import ReceiverPreviewList from '~/app/ui/components/partials/receiver-preview-list/ReceiverPreviewList.svelte';
  import type {InteractionEvent} from '~/app/ui/components/partials/receiver-preview-list/types';
  import {i18n} from '~/app/ui/i18n';
  import MediaMessage from '~/app/ui/modal/MediaMessage.svelte';
  import {type MediaFile, generateThumbnail} from '~/app/ui/modal/media-message';
  import {toast} from '~/app/ui/snackbar';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {FileResult} from '~/app/ui/svelte-components/utils/filelist';
  import type {FileLoadResult} from '~/app/ui/utils/file';
  import {isNotesGroup} from '~/app/ui/utils/receiver';
  import {type SvelteNullableBinding, reactive, svelteUnreachable} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import {
    ConversationCategory,
    MessageDirection,
    ReceiverType,
    WorkAvailabilityStatusCategory,
  } from '~/common/enum';
  import {EDIT_MESSAGE_GRACE_PERIOD_IN_MINUTES} from '~/common/network/protocol/constants';
  import {FEATURE_MASK_FLAG, type MessageId} from '~/common/network/types';
  import {assertUnreachable, unreachable, unwrap} from '~/common/utils/assert';
  import type {SingleUnicodeEmoji} from '~/common/utils/emoji';
  import type {Remote} from '~/common/utils/endpoint';
  import {getSanitizedFileNameDetails} from '~/common/utils/file';
  import {EVERYONE_IDENTITY_STRING} from '~/common/utils/mentions';
  import {
    WritableStore,
    ReadableStore,
    type IQueryableStore,
    type StoreUnsubscriber,
    type IQueryableStoreValue,
  } from '~/common/utils/store';
  import {getLongestValidMatchingGraphemeSequence} from '~/common/utils/string';
  import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
  import type {
    SendFileBasedMessageInformation,
    SendPollBasedMessageInformation,
    TextMessageWithByteLength,
  } from '~/common/viewmodel/conversation/main/controller/types';
  import type {FeatureSupport} from '~/common/viewmodel/conversation/main/store/types';
  import {
    isContactReceiverData,
    type AnyReceiverData,
    type ContactReceiverData,
  } from '~/common/viewmodel/utils/receiver';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.conversation-view');

  const {services}: ConversationViewProps = $props();

  const {
    router,
    backend,
    settings: {
      views: {chat},
    },
  } = services;

  // Unsubscriber for the view model store.
  let viewModelStoreUnsubscriber = $state<StoreUnsubscriber | undefined>(undefined);
  // Params of the current route.
  let routeParams = $state<ConversationRouteParams | undefined>(undefined);

  // ViewModelBundle of the current conversation.
  let viewModelStore = $state<IQueryableStore<RemoteConversationViewModelStoreValue | undefined>>(
    new ReadableStore(undefined),
  );

  let viewModelController: Remote<ConversationViewModelBundle>['viewModelController'] | undefined =
    undefined;
  let isViewModelLoaded = $state<boolean>(false);

  // The message to bring into view initially.
  let initiallyVisibleMessageId = $state<MessageId | undefined>(undefined);

  // Initialize an empty draft store, which will be replaced with the actual store as soon as the
  // receiver of the current conversation is known.
  let draftStore = $state<ConversationDraftStore>(conversationDrafts.getOrCreateStore(undefined));

  let messageListComponent = $state<SvelteNullableBinding<MessageList>>(null);
  let composeBarComponent = $state<SvelteNullableBinding<ComposeBar>>(null);
  let focusMoverProviderComponent = $state<SvelteNullableBinding<FocusMoverProvider>>(null);

  let composeBarState = $state<ComposeBarState>({
    type: 'insert',
    quotedMessage: undefined,
    editedMessage: undefined,
    mentionString: undefined,
    emojiSearchString: undefined,
  });

  let modalState = $state.raw<ModalState>({type: 'none'});

  let deleteMessageFeatureSupport = $state<FeatureSupport>({supported: false});
  let editMessageFeatureSupport = $state<FeatureSupport>({supported: false});
  let emojiReactionsFeatureSupport = $state<FeatureSupport>({supported: false});

  // Setup `isTyping` timer to 5s.
  const resetIsTypingTimer = TIMER.debounce(() => {
    dispatchIsTyping(false);
  }, 5000);

  // Set and dispatch `isTyping` event.
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

  function handleClickDeleteMessageLocally(
    message: IQueryableStoreValue<AnyMessageListMessageStore>,
  ): void {
    switch (message.type) {
      case 'deleted-message':
      case 'regular-message':
        viewModelController?.removeMessage(message.id).catch((error: unknown) => {
          log.error(`Could not delete message with id ${message.id}`, error);
          toast.addSimpleFailure(
            $i18n.t('messaging.error--delete-message', 'Could not delete message'),
          );
        });
        break;

      case 'status-message':
        viewModelController?.removeStatusMessage(message.id).catch((error: unknown) => {
          log.error(`Could not delete status message with id ${message.id}`, error);
          toast.addSimpleFailure(
            $i18n.t('messaging.error--delete-status-message', 'Could not delete status message'),
          );
        });
        break;

      default:
        unreachable(message);
    }
  }

  function handleClickDeleteMessageForEveryone(message: MessageListRegularMessage): void {
    if (message.status.deleted !== undefined) {
      log.warn('Tried to delete an already deleted message on all devices');
      return;
    }

    viewModelController?.markMessageAsDeleted(message.id).catch((error: unknown) => {
      log.error(`Could not delete message with id ${message.id}`, error);
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
      true,
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
        poll: quotedMessageProps.pollData,
        sender: quotedMessageProps.sender,
      },
    };
  }

  function handleClickQuoteMessage(message: MessageListRegularMessage): void {
    if (composeBarState.type === 'edit') {
      composeBarComponent?.clear();
    }
    const quotedMessage = getComposeBarQuoteComponent(message);
    if (quotedMessage === undefined) {
      composeBarState = {
        type: 'insert',
        quotedMessage: undefined,
        editedMessage: undefined,
        mentionString: undefined,
        emojiSearchString: undefined,
      };
      return;
    }
    composeBarState = {
      type: 'quote',
      quotedMessage,
      editedMessage: undefined,
      mentionString: undefined,
      emojiSearchString: undefined,
    };
    composeBarComponent?.focus();
  }

  function handleClickEditMessage(messageProperties: MessageListRegularMessage): void {
    if (!editMessageFeatureSupport.supported) {
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
    } else if (editMessageFeatureSupport.notSupportedNames.length > 0) {
      const numNotSupported = editMessageFeatureSupport.notSupportedNames.length;
      toast.addSimpleWarning(
        $i18n.t(
          'messaging.prose--edit-not-supported-partial',
          'The following group members will not be able to see your edits: {names}{n, plural, =0 {.} other { and {n} more.}} To see edits, they need to install the latest {shortAppName} version.',
          {
            names: editMessageFeatureSupport.notSupportedNames.slice(0, 5).join(', '),
            n: `${numNotSupported > 5 ? numNotSupported - 5 : 0}`,
            shortAppName: import.meta.env.SHORT_APP_NAME,
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
        emojiSearchString: undefined,
      };
      return;
    }
    composeBarState = {
      type: 'edit',
      editedMessage,
      quotedMessage,
      mentionString: undefined,
      emojiSearchString: undefined,
    };
  }

  function handleClickCloseQuote(): void {
    composeBarState = {
      type: 'insert',
      editedMessage: undefined,
      quotedMessage: undefined,
      mentionString: undefined,
      emojiSearchString: undefined,
    };
    draftStore.set(undefined);
  }

  function handleClickCloseInlineMentionPicker(current: ComposeBarState): void {
    composeBarState = {
      ...current,
      mentionString: undefined,
    };
  }

  function handleClickCloseInlineEmojiPicker(current: ComposeBarState): void {
    composeBarState = {
      ...current,
      emojiSearchString: undefined,
    };
  }

  function handleClickEditClose(): void {
    resetComposeBar();
    draftStore.set(undefined);
  }

  function handleAddFiles(files: FileResult | File[]): void {
    resetIsTypingTimer();
    dispatchIsTyping(true);
    if (!isReceiverDisabled) {
      openMediaComposeModal(files).catch(assertUnreachable);
    }
  }

  function handleClickCreatePoll(): void {
    modalState = {type: 'create-poll'};
  }

  function handleClickStartRecording(): void {
    composeBarState = {
      type: 'record',
      quotedMessage: undefined,
      editedMessage: undefined,
      mentionString: undefined,
      emojiSearchString: undefined,
    };
  }

  function handleClickDeleteRecording(): void {
    resetComposeBar();
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
      isViewModelLoaded = false;
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
      saveDraftAndClearComposeBar();
      composeBarState = {
        type: 'insert',
        editedMessage: undefined,
        quotedMessage: undefined,
        mentionString: undefined,
        emojiSearchString: undefined,
      };
    }

    // Because Svelte `$state` uses proxies under the hood, the current value needs to be unwrapped
    // to make it serializable for sending it to the backend.
    const unproxiedReceiver = $state.snapshot(receiver) as unknown as DbReceiverLookup;
    await backend.viewModel
      .conversation(unproxiedReceiver)
      .then(async (viewModelBundle) => {
        if (viewModelBundle === undefined) {
          throw new Error('ViewModelBundle returned by the repository was undefined');
        }

        // If viewmodel value becomes undefined (meaning that the conversation has been deleted),
        // navigate away to the welcome screen.
        viewModelStoreUnsubscriber?.();
        viewModelStoreUnsubscriber = viewModelBundle.viewModelStore.subscribe((value) => {
          if (value === undefined) {
            router.goToWelcome();
          }
        });

        // Unpack bundle.
        viewModelStore = viewModelBundle.viewModelStore;
        viewModelController = viewModelBundle.viewModelController;
        isViewModelLoaded = true;

        // Check supported features.
        deleteMessageFeatureSupport = viewModelStore
          .get()
          ?.supportedFeatures.get(FEATURE_MASK_FLAG.DELETED_MESSAGES_SUPPORT) ?? {supported: false};
        editMessageFeatureSupport = viewModelStore
          .get()
          ?.supportedFeatures.get(FEATURE_MASK_FLAG.EDIT_MESSAGE_SUPPORT) ?? {supported: false};
        emojiReactionsFeatureSupport = viewModelStore
          .get()
          ?.supportedFeatures.get(FEATURE_MASK_FLAG.EMOJI_REACTION_SUPPORT) ?? {supported: false};

        // Set an `initiallyVisibleMessageId` if provided by the current route.
        initiallyVisibleMessageId = routeParams?.initialMessage?.messageId;

        // Load draft if one exists for the new receiver.
        if ($viewModelStore !== undefined) {
          draftStore = conversationDrafts.getOrCreateStore($viewModelStore.receiver.lookup);
        }
        const draft = draftStore.get();

        const preloadedFiles = getPreloadedFiles();

        // Load initial data.

        // Compose bar state
        if (draft?.extended?.type === 'edit') {
          composeBarState = {
            type: 'edit',
            editedMessage: draft.extended.edit,
            quotedMessage: draft.extended.quote,
            mentionString: undefined,
            emojiSearchString: undefined,
          };
        } else if (draft?.extended?.type === 'quote') {
          composeBarState = {
            type: 'quote',
            quotedMessage: draft.extended.quote,
            editedMessage: undefined,
            mentionString: undefined,
            emojiSearchString: undefined,
          };
        }

        // We need to tick here to make sure that the compose bar is properly mounted.
        await tick();

        // Text
        insertComposeBarText($viewModelStore?.receiver, draft?.text ?? '');

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
          $i18n.t('messaging.error--conversation-not-found', 'Conversation not found'),
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
      emojiSearchString: undefined,
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

  async function handleClickApplyEdit(text: string): Promise<void> {
    if (composeBarState.editedMessage === undefined) {
      log.warn('Cannot edit message because no message to edit is set.');
      return;
    }
    if (text === composeBarState.editedMessage.text?.raw) {
      resetComposeBar();
      draftStore.set(undefined);
      return;
    }

    // For file messages, we allow empty captions.
    if (text.trim() === '' && composeBarState.quotedMessage?.props.file === undefined) {
      log.warn('Cannot change message to empty message');
      resetComposeBar();
      draftStore.set(undefined);
      return;
    }

    await composeBarState.editedMessage.actions.edit(text).catch((error: unknown) => {
      log.error('Failed to update message with error:', error);
    });
    resetComposeBar();
    draftStore.set(undefined);
  }

  function handleClickSendRecording(
    message: SendFileBasedMessageInformation,
  ): ReturnType<typeof handleClickSend> {
    if (import.meta.env.BUILD_PLATFORM === 'linux') {
      toast.addSimple(
        $i18n.t(
          'messaging.hint--audio-fallback-to-file',
          'Audio sent as a file due to missing codec support on Linux',
        ),
      );
    }

    return handleClickSend(message);
  }

  function handleClickSend(
    message:
      | TextMessageWithByteLength
      | SendFileBasedMessageInformation
      | SendPollBasedMessageInformation,
  ): Promise<unknown>[] | undefined {
    const resultPromises: Promise<unknown>[] = [];
    switch (message.type) {
      case 'poll':
      case 'files': {
        const promise = viewModelController?.sendMessage(message).catch(assertUnreachable);
        if (promise !== undefined) {
          resultPromises.push(promise);
        }
        break;
      }

      case 'text': {
        const {byteLength, text} = message;

        // Do not send empty messages.
        if (text.trim() === '') {
          return undefined;
        }

        // If the message is small, just send it.
        if (byteLength <= import.meta.env.MAX_TEXT_MESSAGE_BYTES) {
          const promise = viewModelController
            ?.sendMessage({
              type: 'text',
              text,
              quotedMessageId: composeBarState.quotedMessage?.id,
            })
            .catch(assertUnreachable);
          if (promise !== undefined) {
            resultPromises.push(promise);
          }
          break;
        }

        // Otherwise we need to slice the message.
        const encodedUtf8Text = UTF8.encode(text);
        const graphemeClusteredText = getGraphemeClusters(text, text.length);
        let stringIndex = 0;
        let graphemeIndex = 0;
        for (let byteIndex = 0; byteIndex < byteLength; ) {
          // We walk back until we find a string segment that matches, meaning that no
          // grapheme-cluster was cut.
          const chunkingResult = getLongestValidMatchingGraphemeSequence(
            byteIndex,
            byteIndex + import.meta.env.MAX_TEXT_MESSAGE_BYTES,
            stringIndex,
            graphemeIndex,
            graphemeClusteredText,
            text,
            encodedUtf8Text,
            log,
          );

          if (chunkingResult === undefined) {
            toast.addSimpleFailure(
              $i18n.t('messaging.error--chunking-failed', 'Could not send message'),
            );
            return undefined;
          }

          stringIndex += chunkingResult.text.length;
          byteIndex = chunkingResult.newStartByteIndex;
          graphemeIndex = chunkingResult.newGraphemeStartIndex;
          const promise = viewModelController
            ?.sendMessage({
              type: 'text',
              text: chunkingResult.text,
              quotedMessageId: composeBarState.quotedMessage?.id,
            })
            .catch(assertUnreachable);

          if (promise !== undefined) {
            resultPromises.push(promise);
          }
        }
        break;
      }

      default:
        return unreachable(message);
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

    return resultPromises;
  }

  function handleCloseModal(): void {
    // Reset modal state.
    modalState = {
      type: 'none',
    };
  }

  function getPreloadedFiles(): File[] | undefined {
    if (routeParams?.preloadedFiles === undefined) {
      return undefined;
    }

    return routeParams.preloadedFiles.map(
      ({bytes, fileName, mediaType}) =>
        new File([new Blob([ensureArrayBufferBackedView(bytes)], {type: mediaType})], fileName),
    );
  }

  function handleClickDeleteMessage(
    message: IQueryableStoreValue<AnyMessageListMessageStore>,
  ): void {
    if (message.type === 'status-message') {
      handleClickDeleteMessageLocally(message);
      return;
    }

    modalState = {
      type: 'delete-message',
      props: message,
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

  function handleClickInlineEmoji(emoji: SingleUnicodeEmoji): void {
    composeBarComponent?.insertInlineEmoji(emoji);
    composeBarState = {
      ...composeBarState,
      emojiSearchString: undefined,
    };
  }

  function handleInteraction(event: InteractionEvent): void {
    const receiverFromEvent = event.receiver;

    if (event.type !== 'click' || !isContactReceiverData(receiverFromEvent)) {
      return;
    }

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
          member.lookup.type === receiverFromEvent.lookup.type &&
          member.lookup.uid === receiverFromEvent.lookup.uid,
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
        enterKeyMode: $chat.onEnterSubmit ? 'submit' : 'newline',
      },
    };
  }

  /**
   * Save the message draft for the specified receiver and clear the compose area.
   */
  function saveDraftAndClearComposeBar(): void {
    const currentReceiverLookup = $viewModelStore?.receiver.lookup;
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
    const messageToEditStore = messagesStore
      ?.get()
      .find(
        (message): message is IQueryableStore<MessageListRegularMessage> =>
          message.get().type === 'regular-message' && message.get().id === lastMessage.id,
      );

    const messageToEdit = messageToEditStore?.get();

    // Don't support editing audio and poll messages.
    if (messageToEdit?.file?.type === 'audio' || messageToEdit?.pollData !== undefined) {
      return;
    }

    if (
      messageToEdit?.status.sent !== undefined &&
      (Date.now() - messageToEdit.status.sent.at.getTime() <
        EDIT_MESSAGE_GRACE_PERIOD_IN_MINUTES * 60000 ||
        isNotesGroup($viewModelStore.receiver)) &&
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
      // Note: Order is important here, because if e.g. editing is active and the emoji picker is
      // open at the same time:
      // - First ESC should close the emoji picker.
      // - Second ESC should exit edit mode.
      if (composeBarState.mentionString !== undefined) {
        handleClickCloseInlineMentionPicker(composeBarState);
      } else if (composeBarState.emojiSearchString !== undefined) {
        handleClickCloseInlineEmojiPicker(composeBarState);
      } else if (composeBarState.type === 'quote') {
        handleClickCloseQuote();
      } else if (composeBarState.editedMessage !== undefined) {
        handleClickEditClose();
      }

      composeBarComponent?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      if (
        composeBarState.mentionString !== undefined ||
        composeBarState.emojiSearchString !== undefined
      ) {
        // If the mention or emoji editor is currently open, `"ArrowUp"` should focus the last item.
        // After that, the `FocusMoverProvider` handles cycling.
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

    if (
      event.key === 'ArrowDown' &&
      (composeBarState.mentionString !== undefined ||
        composeBarState.emojiSearchString !== undefined)
    ) {
      // If the mention or emoji editor is currently open, `"ArrowDown"` should focus the first
      // item. After that, the `FocusMoverProvider` handles cycling.
      focusMoverProviderComponent?.focusChild('first');
    }
  }

  function handleIsTyping(isTyping: boolean): void {
    resetIsTypingTimer();
    dispatchIsTyping(isTyping);
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

  function handleMatchInlineEmojiSearch(
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
          emojiSearchString: update.value,
        };
        break;

      case 'end':
        composeBarState = {
          ...composeBarState,
          emojiSearchString: undefined,
        };
        break;

      default:
        unreachable(update);
    }
  }

  $effect(() => {
    reactive(handleChangeRouterState, [$router]);
  });

  $effect(() => {
    reactive(handleChangeConversation, [
      routeParams?.receiverLookup,
      routeParams?.initialMessage,
    ]).catch(assertUnreachable);
  });

  /**
   * Whether the current receiver is able to be contacted.
   */
  const isReceiverDisabled = $derived(
    ($viewModelStore?.receiver.type === 'contact' && $viewModelStore.receiver.isInvalid) ||
      ($viewModelStore?.receiver.type === 'contact' && $viewModelStore.receiver.isBlocked) ||
      ($viewModelStore?.receiver.type === 'group' && $viewModelStore.receiver.isLeft),
  );

  const messagesStore = $derived(
    $viewModelStore === undefined
      ? undefined
      : messageSetStoreToMessageListMessagesStore($viewModelStore.messageSetStore, $i18n),
  );

  $effect(() => {
    if (
      $viewModelStore?.receiver.type === 'contact' &&
      $viewModelStore.receiver.acquaintanceLevel === 'group-or-deleted'
    ) {
      router.goToWelcome();
    }
  });

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown);
    viewModelStoreUnsubscriber?.();
  });
</script>

{#if $viewModelStore !== undefined && isViewModelLoaded && messagesStore !== undefined}
  <DropZoneProvider
    overlay={{
      message: $i18n.t('messaging.hint--drop-files-to-send', 'Drop files here to send'),
    }}
    ondropfiles={handleAddFiles}
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
          onclickjoincall={({intent}) =>
            handleclickjoincall(unwrap($viewModelStore).receiver.lookup, intent)}
          receiver={$viewModelStore.receiver.type !== 'group'
            ? $viewModelStore.receiver
            : {
                ...$viewModelStore.receiver,
                delete: async () => {
                  if (viewModelController === undefined) {
                    return false;
                  }
                  return await viewModelController.group.deleteGroup();
                },
              }}
          {services}
        />
      </div>

      {#if import.meta.env.BUILD_FLAVOR === 'work-sandbox' || import.meta.env.BUILD_FLAVOR === 'work-live'}
        {#if $viewModelStore.receiver.type === 'contact' && $viewModelStore.receiver.workAvailabilityStatus !== undefined && $viewModelStore.receiver.workAvailabilityStatus.category !== WorkAvailabilityStatusCategory.NONE}
          <div class="availability">
            <AvailabilityBanner
              status={$viewModelStore.receiver.workAvailabilityStatus.category}
              description={$viewModelStore.receiver.workAvailabilityStatus.description}
              expandOnHover
            ></AvailabilityBanner>
          </div>
        {/if}
      {/if}

      {#if $viewModelStore.category === ConversationCategory.PROTECTED}
        <div class="infoBox">
          <div class="content">
            <div class="icon">
              <MdIcon theme="Filled">lock</MdIcon>
            </div>
            <Text
              text={$i18n.t(
                'dialog--unsupported-feature-protected-conversation.label--title',
                'This Chat Is Private',
              )}
              size="body-large"
              family="primary"
              alignment="center"
            />
            <Text
              text={$i18n.t(
                'dialog--unsupported-feature-protected-conversation.prose--description',
                'Private chats are currently not supported on {shortAppName} for desktop. To access this conversation, please use the {shortAppName} app on your smartphone.',
                {
                  shortAppName: import.meta.env.SHORT_APP_NAME,
                },
              )}
              size="body"
              alignment="center"
            />
          </div>
        </div>
      {:else}
        <div class="messages">
          <MessageList
            bind:this={messageListComponent}
            conversation={{
              editMessageFeatureSupport,
              emojiReactionsFeatureSupport,
              firstUnreadMessageId: $viewModelStore.firstUnreadMessageId,
              id: $viewModelStore.id,
              initiallyVisibleMessageId,
              isTyping: $viewModelStore.isTyping,
              lastMessage: $viewModelStore.lastMessage,
              markAllMessagesAsRead: () => {
                viewModelController
                  ?.markAllMessagesAsRead()
                  .catch((error) =>
                    log.error('Could not mark all messages as read in conversation', error),
                  );
              },
              receiver: {
                ...$viewModelStore.receiver,
                closePoll: async (lookup) => {
                  await viewModelController?.sendPollCloseMessage(lookup).catch(assertUnreachable);
                },
              },
              // Unwrap is fine because we check it above. This is needed because of svelte 5.
              setCurrentViewportMessages: unwrap(untrack(() => viewModelController))
                .setCurrentViewportMessages,
              unreadMessagesCount: $viewModelStore.unreadMessagesCount,
            }}
            {messagesStore}
            onclickdelete={handleClickDeleteMessage}
            onclickedit={handleClickEditMessage}
            onclickquote={handleClickQuoteMessage}
            {services}
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
                    onclick={composeBarState.type === 'edit'
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
                    onclick={handleClickMentionEveryone}
                    receiver={$viewModelStore.receiver}
                    {services}
                  />
                  <ReceiverPreviewList
                    highlights={composeBarState.mentionString}
                    items={getFilteredMentionReceiverPreviewListItems(
                      $viewModelStore.receiver,
                      composeBarState.mentionString,
                    )}
                    oninteraction={handleInteraction}
                    {services}
                  />
                </FocusMoverProvider>
              </div>
            {:else if composeBarState.mentionString === undefined && composeBarState.emojiSearchString !== undefined}
              <div class="emoji-list">
                <FocusMoverProvider bind:this={focusMoverProviderComponent}>
                  <InlineEmojiSeachList
                    onclickitem={handleClickInlineEmoji}
                    {services}
                    searchTerm={composeBarState.emojiSearchString}
                  />
                </FocusMoverProvider>
              </div>
            {/if}
            <ComposeBar
              {services}
              bind:this={composeBarComponent}
              onbeforeunmount={saveDraftAndClearComposeBar}
              enterKeyMode={$chat.onEnterSubmit ? 'submit' : 'newline'}
              mode={composeBarState.type}
              onattachfiles={handleAddFiles}
              onclickapplyedit={handleClickApplyEdit}
              onclickcreatepoll={handleClickCreatePoll}
              onclickstartrecording={handleClickStartRecording}
              onclickdeleterecording={handleClickDeleteRecording}
              onclicksendrecording={handleClickSendRecording}
              onclicksend={handleClickSend}
              onistyping={handleIsTyping}
              onpaste={(text) => insertComposeBarText($viewModelStore.receiver, text)}
              onpastefiles={handleAddFiles}
              options={{
                showAddButton: composeBarState.quotedMessage === undefined,
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
                {
                  prefix: ':',
                  onMatch(value) {
                    handleMatchInlineEmojiSearch({type: 'update', value});
                  },
                  onMatchEnd() {
                    handleMatchInlineEmojiSearch({type: 'end'});
                  },
                },
              ]}
            />
          {/if}
        </div>
      {/if}
    </div>
  </DropZoneProvider>

  {#if modalState.type === 'none'}
    <!-- No modal is displayed in this state. -->
  {:else if modalState.type === 'media-compose'}
    <MediaMessage
      onclose={handleCloseModal}
      onclicksend={handleClickSend}
      {services}
      {...modalState.props}
    />
  {:else if modalState.type === 'delete-message'}
    {@const receiver = $viewModelStore?.receiver}

    <DeleteMessageModal
      featureSupport={deleteMessageFeatureSupport}
      isNotesGroup={isNotesGroup(receiver)}
      message={{...modalState.props}}
      onclickdeleteforeveryone={handleClickDeleteMessageForEveryone}
      onclickdeletelocally={handleClickDeleteMessageLocally}
      onclose={handleCloseModal}
      showDeleteForEveryoneButton={!(receiver?.type === 'group' && receiver.isLeft)}
    />
  {:else if modalState.type === 'create-poll'}
    <CreatePollModal onsend={handleClickSend} onclose={handleCloseModal} {services} />
  {:else}
    {svelteUnreachable(modalState)}
  {/if}
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
    overflow: clip;

    &:has(.availability) {
      grid-template:
        'header' rem(64px)
        'availability' min-content
        'messages' minmax(0, 1fr)
        'footer' min-content
        / 100%;

      .messages :global(> .chat > .list) {
        padding-top: calc(rem(64px) + rem(8px) + rem(52px));
        scroll-padding-top: calc(rem(64px) + rem(8px) + rem(52px));
      }

      .messages :global(> .chat > .empty-chat > .notice) {
        margin-top: calc(rem(64px) + rem(16px) + rem(52px));
      }
    }

    .header {
      z-index: 2;

      grid-area: header;

      background-color: var(--cc-conversation-header-background-color);
      backdrop-filter: blur(10px);

      border-bottom: 1px solid var(--t-panel-gap-color);
    }

    .availability {
      z-index: 1;

      grid-area: availability;
      padding: rem(8px) rem(8px) 0;
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

    .infoBox {
      z-index: 2;

      grid-row-start: messages;
      grid-column-start: messages;
      grid-row-end: footer;
      grid-column-end: footer;

      display: flex;
      align-items: center;
      justify-content: center;

      .content {
        display: flex;
        flex-flow: column;
        align-items: center;
        justify-content: center;
        gap: rem(8px);
        max-width: min(rem(450px), 90%);
      }

      .icon {
        font-size: rem(24px);
      }
    }

    .footer {
      z-index: 2;
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

      .emoji-list,
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

        &:global(:has(> *:empty)) {
          border-bottom: none;
        }
      }

      .quote ~ .emoji-list,
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
