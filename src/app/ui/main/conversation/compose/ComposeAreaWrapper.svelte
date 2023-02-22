<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {type Readable} from 'svelte/store';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import EmojiPicker from '~/app/ui/generic/emoji-picker/EmojiPicker.svelte';
  import ComposeArea from '~/app/ui/main/conversation/compose/ComposeArea.svelte';

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

  // Reference to the compose area component
  let composeArea: ComposeArea;
  let composeAreaIsEmpty: Readable<boolean>;

  // Emoji picker
  let emojiPicker: EmojiPicker;
  let emojiPickerPosition = {x: 0, y: 0};

  // TODO(DESK-196): Record audio messages
  // function recordAudio(): void {
  //   dispatch('recordAudio');
  // }

  /**
   * Show emoji picker if it's invisible.
   */
  function showEmojiPicker(event: MouseEvent): void {
    const isVisible: boolean = emojiPicker.isVisible();
    if (isVisible) {
      return;
    }

    // Show emoji picker at top left of button
    const emojiButton = event.currentTarget as HTMLElement;
    const rect = emojiButton.getBoundingClientRect();
    emojiPickerPosition = {x: rect.left, y: rect.top};
    emojiPicker.show();

    // Prevent click event from bubbling up to the body element, where the emoji picker would
    // immediately be closed again.
    event.stopPropagation();
  }

  function sendTextMessage(): void {
    dispatch('sendTextMessage', composeArea.getText());
    composeArea.clearText();
    emojiPicker.hide();
  }

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
</script>

<template>
  <div class="emoji-picker">
    <EmojiPicker
      bind:this={emojiPicker}
      {...emojiPickerPosition}
      on:insertEmoji={(event) => composeArea.insertText(event.detail)}
    />
  </div>

  <div class="wrapper">
    <div class="icons-left">
      {#if displayAttachmentButton}
        <!-- TODO(DESK-933): Re-enable file trigger -->
        <!--<FileTrigger on:fileDrop multiple>-->
        <IconButton flavor="naked" class="wip">
          <MdIcon theme="Outlined">attach_file</MdIcon>
        </IconButton>
        <!--</FileTrigger>-->
      {/if}
    </div>
    <ComposeArea
      {initialText}
      bind:this={composeArea}
      bind:isEmpty={composeAreaIsEmpty}
      on:submit={sendTextMessage}
    />
    <div class="icons-right">
      <IconButton flavor="naked" on:click={showEmojiPicker}>
        <MdIcon theme="Outlined">insert_emoticon</MdIcon>
      </IconButton>
      {#if $composeAreaIsEmpty}
        <!-- <IconButton flavor="naked" on:click={recordAudio} class="wip">
        <MdIcon theme="Outlined">mic_none</MdIcon>
      </IconButton> -->
      {:else}
        <IconButton flavor="filled" on:click={sendTextMessage}>
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
</style>
