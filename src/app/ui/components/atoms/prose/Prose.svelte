<!--
  @component
  Renders longer snippets of text.
-->
<script lang="ts">
  import type {ProseProps} from '~/app/ui/components/atoms/prose/props';
  import {hasProperty} from '~/common/utils/object';
  import {truncate} from '~/common/utils/string';

  type $$Props = ProseProps;

  export let content: $$Props['content'];
  export let options: NonNullable<$$Props['options']> = {};
  export let selectable: NonNullable<$$Props['selectable']> = false;
  export let wrap: NonNullable<$$Props['wrap']> = true;

  function getTruncatedText(currentText: string): string {
    if (options.truncate === undefined) {
      return currentText;
    }

    if (options.truncate.type !== 'around') {
      return truncate(currentText, options.truncate.max, options.truncate.type);
    }

    if (options.truncate.focuses !== undefined) {
      return truncate(
        currentText,
        options.truncate.max,
        options.truncate.type,
        options.truncate.focuses,
        'both',
      );
    }

    return truncate(currentText, options.truncate.max, 'both');
  }
</script>

<span class="prose" class:wrap class:selectable>
  {#if hasProperty(content, 'sanitizedHtml')}
    <!-- As text is expected to be escaped, `no-at-html-tags` can be ignored. -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html content.sanitizedHtml}
  {:else}
    <!-- eslint-disable-next-line @typescript-eslint/no-unsafe-argument -->
    {getTruncatedText(content.text)}
  {/if}
</span>

<style lang="scss">
  @use 'component' as *;

  .prose {
    &.wrap {
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    &.selectable {
      user-select: text;
    }

    :global(.md-bold) {
      @extend %markup-bold;
    }

    :global(.md-italic) {
      @extend %markup-italic;
    }

    :global(.md-strike) {
      @extend %markup-strike;
    }

    :global(.mention) {
      @extend %mention;
    }

    :global(.mention.me) {
      @extend %mention-me;
    }

    :global(.mention.all) {
      @extend %mention-all;
    }
  }
</style>
