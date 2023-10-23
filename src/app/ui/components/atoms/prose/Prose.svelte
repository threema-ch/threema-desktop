<!--
  @component
  Renders longer snippets of text.
-->
<script lang="ts">
  import type {ProseProps} from '~/app/ui/components/atoms/prose/props';

  type $$Props = ProseProps;

  export let content: $$Props['content'];
  export let selectable: NonNullable<$$Props['selectable']> = false;
  export let wrap: NonNullable<$$Props['wrap']> = true;
</script>

<span class="prose" class:wrap class:selectable>
  {#if 'sanitizedHtml' in content}
    <!-- As text is expected to be escaped, `no-at-html-tags` can be ignored. -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html content.sanitizedHtml}
  {:else}
    {content.text}
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
