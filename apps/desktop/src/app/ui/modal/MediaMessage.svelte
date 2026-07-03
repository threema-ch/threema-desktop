<!--
  @component The modal window used for sending files, images and other media.
-->
<script lang="ts">
  import {nodeIsOrContainsTarget} from '@threema/dom';
  import {type u53, ensureU53} from '@threema/ts-utils/integer/u53';
  import {ensureError} from '@threema/ts-utils/meta/ensure-error';
  import {onDestroy, onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import type {AppServicesForSvelte} from '~/app/types';
  import {clickoutside} from '~/app/ui/actions/clickoutside';
  import type {TextAreaProps} from '~/app/ui/components/atoms/textarea/props';
  import DropZoneProvider from '~/app/ui/components/hocs/drop-zone-provider/DropZoneProvider.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import EmojiPicker from '~/app/ui/components/molecules/emoji-picker/EmojiPicker.svelte';
  import {showFileResultErrorToast} from '~/app/ui/components/partials/conversation/helpers';
  import Tooltip from '~/app/ui/generic/popover/Tooltip.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {
    generateThumbnail,
    type MediaFile,
    resizeImage,
    validateMediaFiles,
    type ValidationResult,
  } from '~/app/ui/modal/media-message';
  import ActiveMediaFile from '~/app/ui/modal/media-message/ActiveMediaFile.svelte';
  import Caption from '~/app/ui/modal/media-message/Caption.svelte';
  import ConfirmClose from '~/app/ui/modal/media-message/ConfirmClose.svelte';
  import Miniatures from '~/app/ui/modal/media-message/Miniatures.svelte';
  import {toast} from '~/app/ui/snackbar';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import CircularProgress from '~/app/ui/svelte-components/blocks/CircularProgress/CircularProgress.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import TitleAndClose from '~/app/ui/svelte-components/blocks/ModalDialog/Header/TitleAndClose.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import {type FileLoadResult, validateFiles} from '~/app/ui/utils/file';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {Dimensions} from '~/common/types';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';
  import {isAudioFileType} from '~/common/utils/audio';
  import type {SingleUnicodeEmoji} from '~/common/utils/emoji';
  import {getSanitizedFileNameDetails} from '~/common/utils/file';
  import {isSupportedImageType} from '~/common/utils/image';
  import {WritableStore} from '~/common/utils/store';
  import {isVideoFileType} from '~/common/utils/video';
  import type {SendFileBasedMessageInformation} from '~/common/viewmodel/conversation/main/controller/types';

  const log = globals.unwrap().uiLogging.logger('ui.component.media-message-modal');
  const hotkeyManager = globals.unwrap().hotkeyManager;

  interface Props {
    readonly enterKeyMode?: TextAreaProps['enterKeyMode'];
    readonly mediaFiles: MediaFile[];
    /**
     * Whether or not more files can be attached to the message.
     */
    readonly moreFilesAttachable?: boolean;
    readonly onclicksend: (
      details: SendFileBasedMessageInformation,
    ) => Promise<unknown>[] | undefined;
    readonly onclose: () => void;
    readonly services: Pick<AppServicesForSvelte, 'backend' | 'electron' | 'emojis'>;
    readonly title: string;
    readonly visible: boolean;
  }

  let {
    enterKeyMode = 'submit',
    mediaFiles,
    moreFilesAttachable = true,
    onclicksend,
    onclose,
    services,
    title,
    visible = $bindable(),
  }: Props = $props();

  let modalComponent = $state<SvelteNullableBinding<Modal>>(null);
  let modalDialogComponent = $state<SvelteNullableBinding<ModalDialog>>(null);
  let sendButtonTooltipComponent = $state<SvelteNullableBinding<Tooltip>>(null);
  let captionComponent = $state<SvelteNullableBinding<Caption>>(null);

  let submitButtonLoading = $state(false);

  let emojiButtonElement = $state<SvelteNullableBinding<HTMLDivElement>>(null);
  let isEmojiPickerVisible = $state<boolean>(false);

  let activeMediaFileIndex = $state<u53>(0);
  let confirmCloseDialogVisible = $state<boolean>(false);

  /**
   * Handle change events of the caption textarea.
   *
   * @param event Event data including the current length of text in bytes.
   */
  function handleTextChange(event: u53): void {
    saveCurrentCaption();
  }

  /**
   * Save caption text to the `mediaFile.caption` store.
   */
  function saveCurrentCaption(): void {
    mediaFiles[activeMediaFileIndex]?.caption.set(captionComponent?.getText());
  }

  /**
   * Save caption text to the `mediaFile.caption` store and clear the caption textarea.
   */
  function saveAndClearCurrentCaption(): void {
    saveCurrentCaption();
    captionComponent?.clearText();
  }

  /**
   * Remove the active media file and switch to the next one.
   */
  function removeActiveMediaFile(): void {
    saveAndClearCurrentCaption();

    // Remove and trigger Svelte reactivity.
    mediaFiles = [
      ...mediaFiles.slice(0, activeMediaFileIndex),
      ...mediaFiles.slice(activeMediaFileIndex + 1),
    ];

    if (mediaFiles.length > 0) {
      // Set new active media file.
      setNewActiveMediaFile(Math.max(activeMediaFileIndex - 1, 0));
    } else {
      // Close the modal if all files have been removed.
      visible = false;
      onclose?.();
    }
  }

  /**
   * Set the next active media file (eg, by click on preview of user), if it is undefined, hide
   * dialog.
   */
  function setNewActiveMediaFile(index: u53): void {
    const mediaFile = mediaFiles[index];
    if (mediaFile !== undefined) {
      activeMediaFileIndex = index;

      captionComponent?.insertText(mediaFile.caption.get() ?? '');
      captionComponent?.focus();
    }
  }

  async function sendMessages(): Promise<void> {
    saveCurrentCaption();

    const isValid = validateMediaFiles(mediaFiles).every(([_, result]) => result.status === 'ok');
    if (!isValid) {
      log.error('No media messages were sent because some files or messages contain errors');
      return;
    }

    // Prepare files to be sent.
    const mapped = await Promise.all(
      mediaFiles.map(async (mediaFile) => {
        try {
          const isImage = isSupportedImageType(mediaFile.file.type);
          const isVideo = isVideoFileType(mediaFile.file.type);
          const isAudio = isAudioFileType(mediaFile.file.type);

          // If file is an image, downsize it to save bandwidth and strip metadata.
          let fileBlob: Blob;
          let dimensions: Dimensions | undefined;
          let sendAsFile = mediaFile.sendAsFile.get();
          if (isImage && !sendAsFile) {
            const resizeResult = await resizeImage(mediaFile.file);
            if (resizeResult === undefined) {
              log.warn(`Could not resize image with type ${mediaFile.file.type}, sending as file`);
              fileBlob = mediaFile.file;
              sendAsFile = true;
            } else {
              fileBlob = resizeResult.blob;
              dimensions = resizeResult.dimensions;
            }
          } else if (isAudio) {
            fileBlob = mediaFile.file;
            // Audio files should always be sent as file.
            sendAsFile = true;
          } else if (isVideo && !sendAsFile) {
            fileBlob = mediaFile.file;
            // The original dimensions of the thumbnail are equal to the dimensions of the video.
            dimensions = (await mediaFile.thumbnail)?.originalDimensions;
          } else {
            fileBlob = mediaFile.file;
          }

          const thumbnailBlob = (await mediaFile.thumbnail)?.blob;
          return {
            bytes: new Uint8Array(await fileBlob.arrayBuffer()),
            thumbnailBytes:
              thumbnailBlob !== undefined
                ? new Uint8Array(await thumbnailBlob.arrayBuffer())
                : undefined,
            caption: mediaFile.caption.get(),
            fileName: mediaFile.file.name,
            fileSize: ensureU53(fileBlob.size),
            mediaType: fileBlob.type,
            thumbnailMediaType: thumbnailBlob?.type,
            dimensions,
            sendAsFile,
          };
        } catch (error: unknown) {
          log.warn('Error while reading uploaded file: ', ensureError(error));
          toast.addSimpleFailure(
            $i18n.t(
              'dialog--compose-media-message.error--failed-to-send-one-file',
              'The file {fileName} could not be sent. Please try again.',
              {
                fileName: mediaFile.file.name,
              },
            ),
          );
          return undefined;
        }
      }),
    );

    const files: SendFileBasedMessageInformation['files'] = mapped.filter(
      (file) => file !== undefined,
    );

    submitButtonLoading = true;

    const promises = onclicksend?.({
      type: 'files',
      files,
    });

    if (promises !== undefined) {
      await Promise.all(promises).catch((error) => {
        log.error('Sending media files failed with error: ', error);
        toast.addSimpleFailure(
          $i18n.t(
            'dialog--compose-media-message.error--failed-to-send',
            'Failed to send media files',
          ),
        );
      });
    }

    submitButtonLoading = false;

    visible = false;
    onclose?.();
  }

  function attachMoreFiles(fileResult: FileLoadResult): void {
    switch (fileResult.status) {
      case 'empty':
      case 'inaccessible':
        showFileResultErrorToast(fileResult.status, i18n, log);
        return;

      case 'partial':
        showFileResultErrorToast(fileResult.status, i18n, log);
        break;

      case 'ok':
        break;

      default:
        unreachable(fileResult);
    }

    const currentCount = mediaFiles.length;
    const newMediaFiles = fileResult.files.map(
      (file): MediaFile => ({
        type: 'local',
        file,
        thumbnail: generateThumbnail(file, log),
        caption: new WritableStore<string | undefined>(undefined),
        sanitizedFilenameDetails: getSanitizedFileNameDetails(file),
        sendAsFile: new WritableStore(false),
      }),
    );

    mediaFiles = [...mediaFiles, ...newMediaFiles];

    saveAndClearCurrentCaption();
    setNewActiveMediaFile(currentCount);
  }

  function closeWithOptionalConfirmation(): void {
    const needsConfirmation = mediaFiles.length > 1 || captionComponent?.getText() !== '';

    if (needsConfirmation) {
      confirmCloseDialogVisible = true;
    } else {
      close();
    }
  }

  function handleDropFiles(files: FileLoadResult): void {
    attachMoreFiles(files);
  }

  /**
   * Handle files pasted from the clipboard by attaching them to the media message.
   */
  function handlePasteFiles(files: File[]): void {
    if (!moreFilesAttachable || files.length === 0) {
      return;
    }

    validateFiles(files)
      .then((result) => attachMoreFiles(result))
      .catch(assertUnreachable);
  }

  /**
   * Handle paste events that were not already handled by the caption's text area (e.g., when
   * another element of the modal is focused).
   */
  function handleWindowPaste(event: ClipboardEvent): void {
    // Pastes into the caption are handled (and default-prevented) by its `TextArea` component.
    if (event.defaultPrevented || confirmCloseDialogVisible) {
      return;
    }

    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length > 0) {
      event.preventDefault();
      handlePasteFiles(files);
    }
  }

  function handleSelectEmoji(emoji: SingleUnicodeEmoji): void {
    captionComponent?.insertText(emoji);
  }

  function handleClickEmojiButton(event: MouseEvent): void {
    event.stopPropagation();
    isEmojiPickerVisible = !isEmojiPickerVisible;
  }

  function handleClickOutsideEmojiPicker(event: MouseEvent): void {
    if (!nodeIsOrContainsTarget(emojiButtonElement, event.target)) {
      isEmojiPickerVisible = false;
    }
  }

  /**
   * Close this media message modal.
   */
  function close(): void {
    visible = false;
    onclose?.();
  }

  const validatedMediaFiles = $derived(validateMediaFiles(mediaFiles));

  let activeMediaFile: MediaFile | undefined = $state();
  let activeValidationResult: ValidationResult | undefined = $state();
  $effect(() => {
    const file = validatedMediaFiles[activeMediaFileIndex];

    if (file !== undefined) {
      [activeMediaFile, activeValidationResult] = file;
    }
  });

  const activeCaption = $derived(activeMediaFile?.caption);
  $effect(() => {
    reactive(() => {
      // We need to do this assignemnt so that the validation is triggered again.
      mediaFiles = [...mediaFiles];
    }, [$activeCaption]);
  });

  const isSendingEnabled = $derived(
    validatedMediaFiles.every(([_, result]) => result.status === 'ok'),
  );

  function handleHotkeyControlE(): void {
    isEmojiPickerVisible = !isEmojiPickerVisible;
  }

  function handleTriggerMouseEnter(event: MouseEvent): void {
    sendButtonTooltipComponent?.open();
  }

  function handleTriggerMouseLeave(event: MouseEvent): void {
    sendButtonTooltipComponent?.close();
  }

  onMount(() => {
    captionComponent?.focus();
    hotkeyManager.registerHotkey({control: true, code: 'KeyE'}, handleHotkeyControlE);
    window.addEventListener('paste', handleWindowPaste);
  });

  onDestroy(() => {
    hotkeyManager.unregisterHotkey(handleHotkeyControlE);
    window.removeEventListener('paste', handleWindowPaste);
  });
</script>

<Modal
  bind:this={modalComponent}
  wrapper={{
    type: 'none',
  }}
  options={{
    allowClosingWithEsc: false,
    suspendHotkeysWhenVisible: false,
  }}
>
  <DropZoneProvider
    overlay={{
      message: $i18n.t(
        'dialog--compose-media-message.hint--drop-files-to-add',
        'Drop files here to add',
      ),
    }}
    ondropfiles={handleDropFiles}
  >
    <div class="content">
      <ModalDialog
        bind:this={modalDialogComponent}
        bind:visible
        oncancel={closeWithOptionalConfirmation}
        onclose={closeWithOptionalConfirmation}
      >
        {#snippet snippetHeader(modal)}
          <TitleAndClose {modal} {title} />
        {/snippet}
        {#snippet snippetBody()}
          <div class="body">
            {#if activeMediaFile !== undefined && activeValidationResult !== undefined}
              <ActiveMediaFile
                mediaFile={activeMediaFile}
                onremove={removeActiveMediaFile}
                validationResult={activeValidationResult}
              />
            {/if}
          </div>
        {/snippet}
        {#snippet snippetFooter()}
          <div class="footer">
            <div class="caption">
              <Caption
                bind:this={captionComponent}
                autofocus={true}
                {enterKeyMode}
                onpastefiles={handlePasteFiles}
                onsubmit={sendMessages}
                ontextbytelengthdidchange={handleTextChange}
                initialText={activeMediaFile?.caption.get()}
                {services}
              />
            </div>
            <div bind:this={emojiButtonElement} class="emoji-button">
              <IconButton flavor="naked" onclick={handleClickEmojiButton}>
                <MdIcon theme="Outlined">insert_emoticon</MdIcon>
              </IconButton>

              <div
                use:clickoutside={{enabled: isEmojiPickerVisible}}
                class="emoji-picker"
                data-is-visible={isEmojiPickerVisible}
                onclickoutside={({detail: {event}}) => {
                  handleClickOutsideEmojiPicker(event);
                }}
              >
                <EmojiPicker
                  id="media-message"
                  {services}
                  onselectemoji={handleSelectEmoji}
                  visible={isEmojiPickerVisible}
                />
              </div>
            </div>
            <div class="miniatures">
              <Miniatures
                {activeMediaFileIndex}
                {moreFilesAttachable}
                onselect={(file) => {
                  saveAndClearCurrentCaption();
                  const index = mediaFiles.indexOf(file);
                  if (index !== -1) {
                    setNewActiveMediaFile(index);
                  }
                }}
                ondropfiles={(files) => attachMoreFiles(files)}
                {validatedMediaFiles}
              />
            </div>
            <div class="action" class:disabled={!isSendingEnabled}>
              <button
                class="send"
                style:anchor-name="--media-message-modal-send-button"
                onmouseenter={handleTriggerMouseEnter}
                onmouseleave={handleTriggerMouseLeave}
              >
                <IconButton
                  flavor="filled"
                  disabled={!isSendingEnabled || submitButtonLoading}
                  onclick={sendMessages}
                >
                  {#if submitButtonLoading}
                    <div class="progress">
                      <CircularProgress variant="indeterminate" color="current" />
                    </div>
                  {:else}
                    <MdIcon theme="Filled">arrow_upward</MdIcon>
                  {/if}
                </IconButton>
              </button>

              {#if !isSendingEnabled}
                <Tooltip
                  bind:this={sendButtonTooltipComponent}
                  anchorName="--media-message-modal-send-button"
                >
                  <p class="tooltip-content">
                    {$i18n.t(
                      'messaging.error--send-file-miscellaneous-errors',
                      'Some files contain errors',
                    )}
                  </p>
                </Tooltip>
              {/if}
            </div>
          </div>
        {/snippet}
      </ModalDialog>
    </div>
  </DropZoneProvider>

  <ConfirmClose bind:visible={confirmCloseDialogVisible} onconfirm={close} />
</Modal>

<style lang="scss">
  @use 'component' as *;

  $width: 640px;

  .content {
    position: relative;
    z-index: 0;
    width: 100vw;
    height: 100vh;
  }

  .body {
    position: relative;
    @extend %font-normal-400;

    background-color: var(--cc-media-message-background-color);
    width: rem($width);
    height: rem(368px);
  }

  .footer {
    display: grid;
    width: rem($width);
    padding-bottom: rem(16px);
    align-items: center;
    grid-template:
      'caption emoji' minmax(#{rem(64px)}, auto)
      'miniatures action' auto
      / calc(100% - #{rem(50px)}) #{rem(50px)};

    .caption {
      padding: rem(8px) rem(8px) rem(8px) rem(16px);
    }

    .emoji-button {
      position: relative;

      .emoji-picker {
        position: absolute;
        z-index: $z-index-modal;
        bottom: calc(100% + rem(8px));
        right: rem(8px);

        height: rem(300px);
        width: rem(280px);
        padding: rem(12px) rem(12px) rem(0px);
        background-color: var(--cc-emoji-picker-popover-background-color);
        backdrop-filter: blur(25px);
        border-radius: rem(8px);

        &[data-is-visible='true'] {
          display: block;
        }

        &[data-is-visible='false'] {
          display: none;
        }
      }
    }

    .miniatures {
      align-self: start;
      padding: 0 rem(16px) 0 rem(16px);
    }

    .action {
      align-self: center;
      justify-self: left;

      .tooltip-content {
        white-space: nowrap;
        padding: 0;
        margin: rem(10px);
      }

      .send {
        @include clicktarget-button-circle;

        .progress {
          height: rem(20px);
          width: rem(20px);
        }
      }

      &.disabled {
        :global(button) {
          cursor: not-allowed;
        }
      }
    }
  }
</style>
