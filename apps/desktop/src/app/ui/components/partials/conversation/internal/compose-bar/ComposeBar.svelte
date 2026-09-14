<script lang="ts">
  import {nodeIsOrContainsTarget} from '@threema/dom';
  import type {u53} from '@threema/ts-utils/integer/u53';
  import {ensureError} from '@threema/ts-utils/meta/ensure-error';
  import {onDestroy, onMount, tick, mount} from 'svelte';

  import {globals} from '~/app/globals';
  import {clickoutside} from '~/app/ui/actions/clickoutside';
  import FileInput from '~/app/ui/components/atoms/file-input/FileInput.svelte';
  import TextArea from '~/app/ui/components/atoms/textarea/TextArea.svelte';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
  import AudioRecorder from '~/app/ui/components/molecules/audio-recorder/AudioRecorder.svelte';
  import {hasMicrophone} from '~/app/ui/components/molecules/audio-recorder/helpers';
  import EmojiPicker from '~/app/ui/components/molecules/emoji-picker/EmojiPicker.svelte';
  import type {ComposeBarProps} from '~/app/ui/components/partials/conversation/internal/compose-bar/props';
  import Mention from '~/app/ui/components/partials/mention/Mention.svelte';
  import type {MentionProps} from '~/app/ui/components/partials/mention/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {FileResult} from '~/app/ui/svelte-components/utils/filelist';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';
  import type {SingleUnicodeEmoji} from '~/common/utils/emoji';

  const hotkeyManager = globals.unwrap().hotkeyManager;
  const log = globals.unwrap().uiLogging.logger('ui.component.compose-bar');

  const {
    enterKeyMode = 'submit',
    mode = 'insert',
    onattachfiles,
    onbeforeunmount,
    onclickapplyedit,
    onclicksend,
    onclickcreatepoll,
    onclickstartrecording,
    onclickdeleterecording,
    onclicksendrecording,
    onistyping,
    onpaste,
    onpastefiles,
    options = {},
    services,
    triggerWords,
  }: ComposeBarProps = $props();

  let popoverComponent = $state<SvelteNullableBinding<Popover>>(null);

  let emojiPickerComponent = $state<SvelteNullableBinding<EmojiPicker>>(null);
  let emojiButtonElement = $state<SvelteNullableBinding<HTMLDivElement>>(null);
  let isEmojiPickerVisible = $state<boolean>(false);

  let textAreaComponent = $state<SvelteNullableBinding<TextArea>>(null);
  let audioRecorderComponent = $state<SvelteNullableBinding<AudioRecorder>>(null);
  let isTextAreaEmpty = $state<boolean>(true);
  let textAreaByteLength = $state<u53 | undefined>(undefined);

  let fileInput: HTMLInputElement | null = $state(null);

  const showAddButton = $derived(options.showAddButton ?? true);
  const isTextByteLengthVisible = $derived(
    (textAreaByteLength ?? 0) >= import.meta.env.MAX_TEXT_MESSAGE_BYTES - 200 && mode === 'edit',
  );
  const isMaxTextByteLengthExceeded = $derived(
    (textAreaByteLength ?? 0) > import.meta.env.MAX_TEXT_MESSAGE_BYTES && mode === 'edit',
  );

  /**
   * Insert text content into the compose area at the current caret position.
   */
  export function insertText(text: string): void {
    textAreaComponent?.insertText(text);
  }

  /**
   * Get current text content of the compose area.
   */
  export function getText(): string | undefined {
    return textAreaComponent?.getText();
  }

  /**
   * Clear the compose area's text content.
   */
  export function clear(): void {
    textAreaComponent?.clear();
  }

  /**
   * Focuses the text area.
   */
  export function focus(): void {
    textAreaComponent?.focus();
  }

  /**
   * Insert mention label into the compose area at the current caret position.
   */
  export function insertMention(mention: MentionProps['mention']): void {
    const element = document.createElement('span');

    mount(Mention, {
      target: element,
      props: {mention},
    });

    textAreaComponent?.insertElement(element);
  }

  /**
   * Insert a `SingleUnicodeEmoji` replacing the current word.
   */
  export function insertInlineEmoji(emoji: SingleUnicodeEmoji): void {
    textAreaComponent?.replaceCurrentWord(emoji);
  }

  function handleAttachFiles(files: FileResult): void {
    onistyping?.(true);
    onattachfiles?.(files);
  }

  function handleAudioRecorderError(error: Error): void {
    if (error.name === 'NotAllowedError') {
      toast.addSimpleFailure(
        i18n
          .get()
          .t(
            'audio-recorder.error--microphone-permission-denied',
            'Microphone access is denied. Please check permissions.',
          ),
      );
      onclickdeleterecording();
    }
  }

  function handleClickEmojiButton(event: MouseEvent): void {
    event.stopPropagation();
    toggleEmojiPicker();
  }

  async function handleClickSendButton(): Promise<void> {
    textAreaByteLength = textAreaComponent?.getTextByteLength() ?? 0;
    const textAreaTextContent = textAreaComponent?.getText();

    switch (mode) {
      case 'insert':
      case 'quote':
        onistyping?.(false);

        if (textAreaTextContent !== undefined) {
          onclicksend?.({
            type: 'text',
            text: textAreaTextContent,
            byteLength: textAreaByteLength,
          });
        }
        break;

      case 'edit':
        // Prevent sending if edited message is too long.
        if (textAreaByteLength > import.meta.env.MAX_TEXT_MESSAGE_BYTES && mode === 'edit') {
          return;
        }

        if (textAreaTextContent !== undefined) {
          onclickapplyedit?.(textAreaTextContent);
        }
        break;

      case 'record': {
        if (audioRecorderComponent !== null) {
          const data = await audioRecorderComponent.getRecordedAudio();
          if (data !== undefined) {
            onclicksendrecording(data);
          } else {
            log.debug('Recorded data is empty, deleting');
            onclickdeleterecording();
          }
        }
        break;
      }

      default:
        unreachable(mode);
    }

    // Close the emoji picker and wait for DOM changes to be applied.
    closeEmojiPicker();
    await tick();

    // Reset text area content.
    textAreaComponent?.clear();
  }

  function handleClickOutsideEmojiPicker(event: MouseEvent): void {
    if (!nodeIsOrContainsTarget(emojiButtonElement, event.target)) {
      closeEmojiPicker();
    }
  }

  function handleChangeTextByteLength(byteLength: u53): void {
    textAreaByteLength = byteLength;
  }

  function handleIsTyping(isTyping: boolean): void {
    if (mode === 'insert') {
      onistyping?.(isTyping);
    }
  }

  function handlePressHotkeyControlE(): void {
    toggleEmojiPicker();
  }

  function handleSelectEmoji(emoji: SingleUnicodeEmoji): void {
    textAreaComponent?.insertText(emoji);
  }

  async function openEmojiPicker(): Promise<void> {
    isEmojiPickerVisible = true;

    await tick();
    emojiPickerComponent?.focusSearchBar();
  }

  function closeEmojiPicker(): void {
    emojiPickerComponent?.blurSearchBar();
    isEmojiPickerVisible = false;
    emojiPickerComponent?.clearSearchTerm();
    emojiPickerComponent?.scrollTo({behavior: 'instant', top: 0});
  }

  function toggleEmojiPicker(): void {
    if (isEmojiPickerVisible) {
      closeEmojiPicker();
    } else {
      openEmojiPicker().catch(assertUnreachable);
    }
  }

  function handleClickContextMenuItem(): void {
    if (popoverComponent !== null && popoverComponent !== undefined) {
      popoverComponent.close();
    }
  }

  function getContextMenuItems(): ContextMenuItem[] {
    return [
      {
        type: 'option',
        label: $i18n.t('compose-bar.label--attach-file', 'Attach File'),
        icon: {
          name: 'attach_file',
        },
        handler: () => {
          fileInput?.click();
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'option',
        label: $i18n.t('compose-bar.label--create-poll', 'Create Poll'),
        icon: {
          name: 'checklist',
        },
        handler: () => onclickcreatepoll?.(),
      },
    ];
  }

  onMount(() => {
    hotkeyManager.registerHotkey({control: true, code: 'KeyE'}, handlePressHotkeyControlE);
  });

  onDestroy(() => {
    hotkeyManager.unregisterHotkey(handlePressHotkeyControlE);
  });
</script>

<div class="container">
  <div class="left">
    {#if mode === 'record'}
      <IconButton flavor="naked" onclick={onclickdeleterecording}>
        <MdIcon theme="Outlined">delete</MdIcon>
      </IconButton>
    {:else if showAddButton}
      <ContextMenuProvider
        bind:popover={popoverComponent}
        anchorPoints={{
          reference: {
            horizontal: 'left',
            vertical: 'top',
          },
          popover: {
            horizontal: 'left',
            vertical: 'bottom',
          },
        }}
        closeOnClickOutside={true}
        onclickitem={handleClickContextMenuItem}
        triggerBehavior="toggle"
        items={getContextMenuItems()}
      >
        <IconButton flavor="naked">
          <MdIcon theme="Outlined">add</MdIcon>
        </IconButton>
      </ContextMenuProvider>
    {/if}
  </div>

  <div class="center">
    {#if mode === 'record'}
      <AudioRecorder bind:this={audioRecorderComponent} onerror={handleAudioRecorderError}
      ></AudioRecorder>
    {:else}
      <!-- A11y is not handled here, as it's already possible to focus the `TextArea` by just tabbing
    into it. This workaround to make the clickable area larger is specific to mouse-based input
    methods. -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="composearea" onclick={() => textAreaComponent?.focus()}>
        <TextArea
          bind:this={textAreaComponent}
          bind:isEmpty={isTextAreaEmpty}
          {enterKeyMode}
          {onbeforeunmount}
          onistyping={handleIsTyping}
          {onpaste}
          {onpastefiles}
          onsubmit={handleClickSendButton}
          ontextbytelengthdidchange={handleChangeTextByteLength}
          placeholder={$i18n.t('messaging.label--compose-area', 'Write a message...')}
          {services}
          {triggerWords}
        />
      </div>
    {/if}
  </div>

  <div class="right">
    {#if isTextByteLengthVisible}
      <div class="bytes-count" class:exceeded={isMaxTextByteLengthExceeded}>
        {textAreaByteLength}/{import.meta.env.MAX_TEXT_MESSAGE_BYTES}
      </div>
    {/if}

    {#if mode !== 'record'}
      <div bind:this={emojiButtonElement}>
        <IconButton flavor="naked" onclick={handleClickEmojiButton}>
          <MdIcon theme="Outlined">insert_emoticon</MdIcon>
        </IconButton>
      </div>
    {/if}

    {#if isTextAreaEmpty !== true || options.allowEmptyMessages === true || mode !== 'insert'}
      <IconButton
        disabled={isMaxTextByteLengthExceeded}
        flavor="filled"
        onclick={handleClickSendButton}
      >
        <MdIcon theme="Filled">{mode === 'edit' ? 'check' : 'arrow_upward'}</MdIcon>
      </IconButton>
    {:else}
      {#await hasMicrophone() then hasMicrophone_}
        <IconButton disabled={!hasMicrophone_} flavor="naked" onclick={onclickstartrecording}>
          <MdIcon theme="Outlined">mic</MdIcon>
        </IconButton>
      {:catch error}
        {log.debug('Enumerating for microphone devices failed: ', ensureError(error))}
      {/await}
    {/if}

    <div
      use:clickoutside={{enabled: isEmojiPickerVisible}}
      class="emoji-picker"
      data-is-visible={isEmojiPickerVisible}
      onclickoutside={({detail: {event}}) => {
        handleClickOutsideEmojiPicker(event);
      }}
    >
      <EmojiPicker
        bind:this={emojiPickerComponent}
        onselectemoji={handleSelectEmoji}
        {services}
        visible={isEmojiPickerVisible}
      />
    </div>
  </div>

  <FileInput multiple ondropfiles={handleAttachFiles} bind:fileInput />
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    position: relative;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    padding-inline: rem(8px);

    .left,
    .right {
      flex: none;
      display: flex;
      align-items: center;
      padding-block: rem(12px);
    }

    .left {
      justify-content: left;
    }

    .center {
      flex: 1 1 0;

      .composearea,
      .composearea :global(> .container) {
        width: 100%;
        height: 100%;
      }

      .composearea:hover {
        cursor: text;
      }
    }

    .right {
      position: relative;
      justify-content: right;

      .bytes-count {
        display: flex;
        place-items: center;

        &.exceeded {
          color: var(--cc-compose-bar-bytes-count-exceeded-color);
        }
      }
    }

    .emoji-picker {
      position: absolute;
      z-index: $z-index-modal;
      bottom: calc(100% + rem(10px));

      height: rem(300px);
      width: rem(280px);
      padding: rem(12px) rem(12px) rem(0px);
      background-color: var(--cc-emoji-picker-popover-background-color);
      backdrop-filter: blur(25px);
      border-radius: rem(8px);
      box-shadow: var(--cc-emoji-picker-popover-box-shadow--visible);

      &[data-is-visible='true'] {
        visibility: visible;
      }

      &[data-is-visible='false'] {
        visibility: hidden;
      }
    }
  }
</style>
