<script lang="ts">
  import {i18n} from '~/app/ui/i18n';
  import ComposeArea from '~/app/ui/main/conversation/compose/ComposeArea.svelte';
  import type {u53} from '~/common/types';

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
   * Return the current byte length of the compose area's text content. This operation can be
   * expensive, and should only be used sparingly.
   */
  export function getTextByteLength(): u53 {
    return composeArea.getTextByteLength();
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
      on:submit
      on:textByteLengthChanged
      bind:this={composeArea}
      placeholder={$i18n.t(
        'dialog--compose-media-message.label--media-message-caption',
        'Add a caption to this media format',
      )}
      {initialText}
    />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;
  div {
    font-size: rem(14px);
    --cc-compose-area-margin: 0;
    --cc-compose-area-padding: 0;
  }
</style>
