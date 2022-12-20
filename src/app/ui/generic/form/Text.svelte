<script lang="ts">
  import {escapeHtmlUnsafeChars, textProcessor} from '~/app/ui/generic/form';
  import {Mention} from '~/common/viewmodel/utils/mentions';

  /**
   * The text to be parsed and displayed with the requested features.
   * HTML-unsafe characters will be escaped.
   */
  export let text: string;

  /**
   * Parsed Mentions in the text
   */
  export let mentions: Mention[] = [];

  let processedText = escapeHtmlUnsafeChars(text);

  if (textProcessor !== undefined) {
    processedText = textProcessor(processedText, mentions);
  }
</script>

<template>
  <div>{@html processedText}</div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    overflow: hidden;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
</style>
