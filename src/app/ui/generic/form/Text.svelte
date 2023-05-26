<script lang="ts">
  import {escapeHtmlUnsafeChars, parseText} from '~/app/ui/generic/form';
  import {type Mention} from '~/common/viewmodel/utils/mentions';

  /**
   * The text to be parsed and displayed with the requested features.
   * HTML-unsafe characters will be escaped.
   */
  export let text: string;

  /**
   * Parsed Mentions in the text.
   */
  export let mentions: Mention | Mention[] | undefined = undefined;

  $: processedText = parseText(escapeHtmlUnsafeChars(text), mentions, undefined, true, true);
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
    user-select: text;
  }
</style>
