<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount} from 'svelte';
  import {type Readable} from 'svelte/store';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import FileTrigger from '#3sc/components/blocks/FileTrigger/FileTrigger.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {globals} from '~/app/globals';
  import EmojiPicker from '~/app/ui/generic/emoji-picker/EmojiPicker.svelte';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ComposeArea from '~/app/ui/main/conversation/compose/ComposeArea.svelte';
  import {type u53} from '~/common/types';

  const hotkeyManager = globals.unwrap().hotkeyManager;

  /**
   * Text that will be used to initialize the compose area.
   */
  export let initialText: string | undefined;

  /**
   * Whether to display the attachment button.
   */
  export let displayAttachmentButton = true;

  // Component event dispatcher
  const dispatch = createEventDispatcher<{
    recordAudio: undefined;
    sendTextMessage: string;
  }>();

  let composeBar: HTMLElement | undefined;
  let composeArea: ComposeArea;
  let composeAreaIsEmpty: Readable<boolean>;
  let composeAreaTextByteLength: u53;

  // Emoji picker
  // eslint-disable-next-line @typescript-eslint/ban-types
  let emojiPickerPopover: Popover | null;

  /**
   * Insert more text content into the compose area
   */
  export function insertText(text: string): void {
    composeArea.insertText(text);
  }

  /**
   * Get current inserted text
   */
  export function getText(): string {
    return composeArea.getText();
  }

  /**
   * Remove entered text
   */
  export function clearText(): void {
    composeArea.clearText();
  }

  /**
   * Focus wrapper div
   */
  export function focus(): void {
    composeArea.focus();
  }

  // TODO(DESK-196): Record audio messages
  // function recordAudio(): void {
  //   dispatch('recordAudio');
  // }

  function sendTextMessage(): void {
    composeAreaTextByteLength = composeArea.getTextByteLength();

    // Prevent send if message is too long
    if (composeAreaTextByteLength > import.meta.env.MAX_TEXT_MESSAGE_BYTES) {
      return;
    }

    dispatch('sendTextMessage', composeArea.getText());
    composeArea.clearText();
    emojiPickerPopover?.close();
  }

  function handleTextChange(event: CustomEvent<u53>): void {
    composeAreaTextByteLength = event.detail;
  }

  $: isTextByteLengthVisible =
    composeAreaTextByteLength >= import.meta.env.MAX_TEXT_MESSAGE_BYTES - 200;
  $: isMaxTextByteLengthExceeded =
    composeAreaTextByteLength > import.meta.env.MAX_TEXT_MESSAGE_BYTES;

  function handleHotkeyControlE(): void {
    emojiPickerPopover?.toggle();
  }

  onMount(() => {
    hotkeyManager.registerHotkey({control: true, code: 'KeyE'}, handleHotkeyControlE);
  });

  onDestroy(() => {
    hotkeyManager.unregisterHotkey(handleHotkeyControlE);
  });
</script>

<template>
  <div class="wrapper" bind:this={composeBar}>
    <div class="icons-left">
      {#if displayAttachmentButton}
        <FileTrigger on:fileDrop multiple>
          <IconButton flavor="naked">
            <MdIcon theme="Outlined">attach_file</MdIcon>
          </IconButton>
        </FileTrigger>
      {/if}
    </div>
    <ComposeArea
      {initialText}
      bind:this={composeArea}
      bind:isEmpty={composeAreaIsEmpty}
      on:textByteLengthChanged={handleTextChange}
      on:submit={sendTextMessage}
      on:filePaste
      on:heightDidChange={() => {
        emojiPickerPopover?.forceReposition();
      }}
      placeholder={$i18n.t('messaging.label--compose-area', 'Write a message...')}
    />
    <div class="icons-right">
      {#if isTextByteLengthVisible}
        <div class="bytes-count" class:exceeded={isMaxTextByteLengthExceeded}>
          {composeAreaTextByteLength}/{import.meta.env.MAX_TEXT_MESSAGE_BYTES}
        </div>
      {/if}
      <Popover
        bind:this={emojiPickerPopover}
        reference={composeBar}
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
      >
        <IconButton slot="trigger" flavor="naked">
          <MdIcon theme="Outlined">insert_emoticon</MdIcon>
        </IconButton>

        <EmojiPicker
          slot="popover"
          on:insertEmoji={(event) => composeArea.insertText(event.detail)}
        />
      </Popover>
      {#if $composeAreaIsEmpty}
        <!-- <IconButton flavor="naked" on:click={recordAudio} class="wip">
        <MdIcon theme="Outlined">mic_none</MdIcon>
      </IconButton> -->
      {:else}
        <IconButton
          flavor="filled"
          on:click={sendTextMessage}
          disabled={isMaxTextByteLengthExceeded}
        >
          <MdIcon theme="Filled">arrow_upward</MdIcon>
        </IconButton>
      {/if}
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .wrapper {
    display: grid;
    grid-template: 100% / auto 1fr auto;
    align-items: end;
    padding: rem(12px) rem(8px);
  }

  .icons-left,
  .icons-right {
    display: flex;
  }

  .icons-right {
    .bytes-count {
      display: flex;
      place-items: center;

      &.exceeded {
        color: var(--cc-compose-bar-bytes-count-exceeded-color);
      }
    }
  }
</style>
