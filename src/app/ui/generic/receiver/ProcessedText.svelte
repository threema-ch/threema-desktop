<script lang="ts">
  import {escapeHtmlUnsafeChars, parseText} from '~/app/ui/generic/form';
  import {type Mention} from '~/common/viewmodel/utils/mentions';

  export let text: string;
  export let mentions: Mention | Mention[] | undefined = undefined;
  export let highlights: string | string[] | undefined = undefined;
  export let shouldParseMarkup = false;
  export let shouldParseLinks = false;

  $: processedText = parseText(
    escapeHtmlUnsafeChars(text),
    mentions,
    highlights,
    shouldParseMarkup,
    shouldParseLinks,
  );
</script>

<template>
  <!-- Note: Safe because we run `escapeHtmlUnsafeChars` above. -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html processedText}
</template>

<style lang="scss">
  @use 'component' as *;

  :global(.parsed-text-highlight) {
    background-color: var(--t-color-primary);
    color: #ffffff;
  }
</style>
