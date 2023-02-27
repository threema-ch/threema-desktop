<script lang="ts">
  import ComposeBar from '~/app/ui/main/conversation/compose/ComposeBar.svelte';

  /**
   * Text that will be used to initialize the compose area.
   */
  export let initialText: string | undefined;

  /**
   * Whether to display the attachment button.
   */
  export let displayAttachmentButton = true;

  // Reference to the compose area component
  let composeBar: ComposeBar;

  /**
   * Insert more text content into the compose area
   */
  export function insertText(text: string): void {
    composeBar.insertText(text);
  }

  /**
   * Get current inserted text
   */
  export function getText(): string | undefined {
    return composeBar.getText();
  }

  /**
   * Remove entered text
   */
  export function clearText(): void {
    composeBar.clearText();
  }

  /**
   * Focus wrapper div
   */
  export function focus(): void {
    composeBar.focus();
  }
</script>

<template>
  <ComposeBar
    bind:this={composeBar}
    {initialText}
    {displayAttachmentButton}
    on:sendTextMessage
    on:recordAudio
    on:fileDrop
  />
</template>

<style lang="scss">
  @use 'component' as *;
</style>
