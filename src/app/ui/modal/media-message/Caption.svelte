<script lang="ts">
  import ComposeArea from '~/app/ui/main/conversation/compose/ComposeArea.svelte';

  export let initialText: string | undefined = undefined;

  let composeArea: ComposeArea;

  /**
   * Focus caption input
   */
  export function focus(): void {
    composeArea.focus();
  }

  /**
   * Get text of compose area
   */
  export function getText(): string {
    return composeArea.getText();
  }

  /**
   * Insert more text content into the compose area
   */
  export function insertText(text: string): void {
    composeArea.insertText(text);
  }

  /**
   * Clear the contents of the compose area.
   */
  export function clearText(): void {
    composeArea.clearText();
  }
</script>

<template>
  <div>
    <ComposeArea
      bind:this={composeArea}
      placeholder="Add a caption to this media format"
      {initialText}
    />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;
  div {
    font-size: rem(14px);
    color: var(--cc-media-message-active-file-caption-text-color);
    --cc-compose-area-margin: 0;
    --cc-compose-area-padding: 0;
  }
</style>
