<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {type Readable} from 'svelte/store';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import FileTrigger from '#3sc/components/blocks/FileTrigger/FileTrigger.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import EmojiPicker from '~/app/ui/generic/emoji-picker/EmojiPicker.svelte';
  import Popover from '~/app/ui/generic/popover/Popover.svelte';
  import ComposeArea from '~/app/ui/main/conversation/compose/ComposeArea.svelte';
  import {type u53} from '~/common/types';

  /**
   * The maximum allowed byte length of the message text.
   *
   * TODO(SE-266): Update (message) size limitation
   */
  const MAX_TEXT_BYTE_LENGTH = 7000;

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

  let composeBar: HTMLElement | null;
  let composeArea: ComposeArea;
  let composeAreaIsEmpty: Readable<boolean>;
  let composeAreaTextByteLength: u53;

  // Emoji picker
  let emojiPickerWrapper: Popover;

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
    if (composeAreaTextByteLength > MAX_TEXT_BYTE_LENGTH) {
      return;
    }

    dispatch('sendTextMessage', composeArea.getText());
    composeArea.clearText();
    emojiPickerWrapper.close();
  }

  function handleTextChange(event: CustomEvent<u53>): void {
    composeAreaTextByteLength = event.detail;
  }

  $: isTextByteLengthVisible = composeAreaTextByteLength >= MAX_TEXT_BYTE_LENGTH - 200;
  $: isMaxTextByteLengthExceeded = composeAreaTextByteLength > MAX_TEXT_BYTE_LENGTH;
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
        emojiPickerWrapper.forceReposition();
      }}
    />
    <div class="icons-right">
      {#if isTextByteLengthVisible}
        <div class="bytes-count" class:exceeded={isMaxTextByteLengthExceeded}>
          {composeAreaTextByteLength}/{MAX_TEXT_BYTE_LENGTH}
        </div>
      {/if}
      <Popover
        bind:this={emojiPickerWrapper}
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
