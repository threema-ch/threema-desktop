<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount, tick} from 'svelte';
  import type {Readable} from 'svelte/store';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import FileTrigger from '#3sc/components/blocks/FileTrigger/FileTrigger.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import type {FileResult} from '#3sc/utils/filelist';
  import {globals} from '~/app/globals';
  import TextArea from '~/app/ui/components/atoms/textarea/TextArea.svelte';
  import EmojiPicker from '~/app/ui/components/molecules/emoji-picker/EmojiPicker.svelte';
  import type {ComposeBarProps} from '~/app/ui/components/partials/conversation/internal/compose-bar/props';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {u53} from '~/common/types';

  const hotkeyManager = globals.unwrap().hotkeyManager;

  type $$Props = ComposeBarProps;

  export let options: NonNullable<$$Props['options']> = {};

  const dispatch = createEventDispatcher<{
    attachfiles: FileResult;
    clicksend: string;
  }>();

  let containerElement: SvelteNullableBinding<HTMLElement> = null;

  let textAreaComponent: SvelteNullableBinding<TextArea> = null;
  let isTextAreaEmpty: Readable<boolean>;
  let textAreaByteLength: u53;

  let emojiPickerPopoverComponent: SvelteNullableBinding<Popover> = null;

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

  function handleAttachFiles(event: CustomEvent<FileResult>): void {
    dispatch('attachfiles', event.detail);
  }

  async function handleClickSendButton(): Promise<void> {
    textAreaByteLength = textAreaComponent?.getTextByteLength() ?? 0;

    // Prevent sending if message is too long.
    if (textAreaByteLength > import.meta.env.MAX_TEXT_MESSAGE_BYTES) {
      return;
    }

    const textAreaTextContent = textAreaComponent?.getText();
    if (textAreaTextContent !== undefined) {
      dispatch('clicksend', textAreaTextContent);
    }

    // Close the emoji picker and wait for DOM changes to be applied.
    emojiPickerPopoverComponent?.close();
    await tick();

    // Reset text area content.
    textAreaComponent?.clear();
  }

  function handleChangeTextByteLength(event: CustomEvent<u53>): void {
    textAreaByteLength = event.detail;
  }

  function handlePressHotkeyControlE(): void {
    emojiPickerPopoverComponent?.toggle();
  }

  $: ({showAttachFilesButton = true} = options);
  $: isTextByteLengthVisible = textAreaByteLength >= import.meta.env.MAX_TEXT_MESSAGE_BYTES - 200;
  $: isMaxTextByteLengthExceeded = textAreaByteLength > import.meta.env.MAX_TEXT_MESSAGE_BYTES;

  onMount(() => {
    hotkeyManager.registerHotkey({control: true, code: 'KeyE'}, handlePressHotkeyControlE);
  });

  onDestroy(() => {
    hotkeyManager.unregisterHotkey(handlePressHotkeyControlE);
  });
</script>

<div class="container" bind:this={containerElement}>
  <div class="left">
    {#if showAttachFilesButton}
      <FileTrigger on:fileDrop={handleAttachFiles} multiple>
        <IconButton flavor="naked">
          <MdIcon theme="Outlined">attach_file</MdIcon>
        </IconButton>
      </FileTrigger>
    {/if}
  </div>

  <div class="center">
    <TextArea
      bind:this={textAreaComponent}
      bind:isEmpty={isTextAreaEmpty}
      placeholder={$i18n.t('messaging.label--compose-area', 'Write a message...')}
      on:heightdidchange={() => {
        emojiPickerPopoverComponent?.forceReposition();
      }}
      on:pastefiles
      on:submit={handleClickSendButton}
      on:textbytelengthdidchange={handleChangeTextByteLength}
    />
  </div>

  <div class="right">
    {#if isTextByteLengthVisible}
      <div class="bytes-count" class:exceeded={isMaxTextByteLengthExceeded}>
        {textAreaByteLength}/{import.meta.env.MAX_TEXT_MESSAGE_BYTES}
      </div>
    {/if}

    <Popover
      bind:this={emojiPickerPopoverComponent}
      reference={containerElement}
      anchorPoints={{
        reference: {
          horizontal: 'right',
          vertical: 'top',
        },
        popover: {
          horizontal: 'right',
          vertical: 'bottom',
        },
      }}
      flip={false}
      offset={{
        left: -8,
        top: -8,
      }}
    >
      <IconButton slot="trigger" flavor="naked">
        <MdIcon theme="Outlined">insert_emoticon</MdIcon>
      </IconButton>

      <EmojiPicker
        slot="popover"
        on:clickemoji={(event) => textAreaComponent?.insertText(event.detail)}
      />
    </Popover>

    {#if !$isTextAreaEmpty}
      <IconButton
        flavor="filled"
        on:click={handleClickSendButton}
        disabled={isMaxTextByteLengthExceeded}
      >
        <MdIcon theme="Filled">arrow_upward</MdIcon>
      </IconButton>
    {/if}
  </div>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    align-items: end;
    justify-content: stretch;
    padding: rem(12px) rem(8px);
  }

  .left,
  .right {
    flex: none;
    display: flex;
    align-items: center;
  }

  .left {
    justify-content: left;
  }

  .center {
    flex: 1 1 0;
  }

  .right {
    justify-content: right;

    .bytes-count {
      display: flex;
      place-items: center;

      &.exceeded {
        color: var(--cc-compose-bar-bytes-count-exceeded-color);
      }
    }
  }
</style>
