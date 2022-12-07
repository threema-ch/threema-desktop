<script lang="ts">
  import {type TextProcessor, escapeHtmlUnsafeChars} from '~/app/ui/generic/form';

  /**
   * The text to be parsed and displayed with the requested features.
   * HTML-unsafe characters will be escaped.
   */
  export let text: string;

  /**
   * Optional text processor function. HTML-unsafe characters will be escaped in
   * the original string before applying this text processor function, and not
   * after. I.e. if the output of this text processor function contains HTML, it
   * will be injected in the template as is and must therefore be trusted.
   */
  export let textProcessor: TextProcessor | undefined = undefined;

  let processedText = escapeHtmlUnsafeChars(text);

  if (textProcessor !== undefined) {
    processedText = textProcessor(processedText);
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
