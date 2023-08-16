<script lang="ts">
  import {escapeHtmlUnsafeChars, parseText} from '~/app/ui/generic/form';
  import {i18n} from '~/app/ui/i18n';
  import {type Mention} from '~/common/viewmodel/utils/mentions';

  export let text: string;
  export let mentions: Mention | Mention[] | undefined = undefined;
  export let highlights: string | string[] | undefined = undefined;
  export let shouldLinkMentions = false;
  export let shouldParseMarkup = false;
  export let shouldParseLinks = false;

  $: processedText = parseText($i18n.t, {
    text: escapeHtmlUnsafeChars(text),
    mentions,
    highlights,
    shouldLinkMentions,
    shouldParseMarkup,
    shouldParseLinks,
  });
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
