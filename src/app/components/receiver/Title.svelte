<script lang="ts">
  import HighlightableText from '~/app/components/receiver/HighlightableText.svelte';

  export let title: string;
  export let titleLineThrough = false;
  export let subtitle: string | undefined = undefined;
  export let filter: string | undefined = undefined;

  export let isInactive = false;
  export let isCreator = false;
  export let isArchived = false;
  export let isDraft = false;

  const hasBadge = isInactive || isCreator;
</script>

<template>
  <div class="name">
    {#if subtitle !== undefined || hasBadge}
      <div class="title" class:line-through={titleLineThrough}>
        <HighlightableText text={title} substringToHighlight={filter} />
      </div>
      <div class="subtitle">
        {#if isInactive}
          <span class="badge inactive">Inactive</span>
        {/if}
        {#if isCreator}
          <span class="badge creator">Creator</span>
        {/if}
        {#if isArchived}
          <span class="badge archived">Archived</span>
        {/if}
        {#if isDraft}
          <span class="draft">Draft:</span>
        {/if}
        {#if subtitle !== undefined}
          <HighlightableText text={subtitle} substringToHighlight={filter} />
        {/if}
      </div>
    {:else}
      <div class="display-title" class:line-through={titleLineThrough}>
        <HighlightableText text={title} substringToHighlight={filter} />
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--cc-t-background-color);
  $-fade-width: rem(48px);

  %shortened-text {
    width: 100%;
    overflow: hidden;
    white-space: nowrap;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: $-fade-width;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        var($-temp-vars, --cc-t-background-color) 80%,
        var($-temp-vars, --cc-t-background-color) 100%
      );
    }
  }

  .name {
    display: grid;
    width: 100%;
    align-self: normal;
    grid-template:
      'title' #{rem(20px)}
      'title' #{rem(20px)}
      / 100%;

    .title {
      @extend %shortened-text;
      height: rem(20px);
      justify-self: start;
      align-self: center;
      place-items: center start;

      &.line-through {
        text-decoration: line-through;
      }
    }

    .subtitle {
      @extend %shortened-text;
      height: rem(20px);
      justify-self: start;
      align-self: center;
      color: var(--t-text-e2-color);
    }

    .display-title {
      @extend %shortened-text;
      grid-area: title;
      align-self: center;
      &.line-through {
        text-decoration: line-through;
      }
    }

    .badge {
      @extend %font-meta-400;
      padding: rem(2px) rem(4px);
      border-radius: rem(4px);

      &.inactive {
        color: var(--cc-contact-preview-inactive-text-color);
        background-color: var(--cc-contact-preview-inactive-background-color);
      }

      &.creator {
        color: var(--cc-contact-preview-creator-text-color);
        background-color: var(--cc-contact-preview-creator-background-color);
      }

      &.archived {
        color: var(--cc-conversation-preview-archived-text-color);
        background-color: var(--cc-conversation-preview-archived-background-color);
      }
    }

    .draft {
      color: var(--cc-conversation-preview-draft-text-color);
    }
  }
</style>
