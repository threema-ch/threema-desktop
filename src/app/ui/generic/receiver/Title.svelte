<script lang="ts">
  import {type ReceiverTitle} from '~/app/ui/generic/receiver';
  import ProcessedText from '~/app/ui/generic/receiver/ProcessedText.svelte';
  import {i18n} from '~/app/ui/i18n';

  export let title: string;
  export let subtitle: ReceiverTitle['subtitle'] = {text: undefined};
  export let filter: string | undefined = undefined;

  // Whether to display this title as disabled (strikethrough).
  export let isDisabled = false;

  export let isInactive = false;
  export let isInvalid = false;
  export let isCreator = false;
  export let isArchived = false;
  export let isDraft = false;

  let hasBadge = false;
  $: hasBadge = isInactive || isCreator;
</script>

<template>
  <div class="name">
    {#if subtitle !== undefined || hasBadge}
      <div class="title" class:disabled={isDisabled} class:inactive={isInactive}>
        <ProcessedText text={title} highlights={filter} />
      </div>
      <div class="subtitle">
        {#if isInactive}
          <span class="badge inactive">{$i18n.t('contacts.label--status-inactive')}</span>
        {/if}
        {#if isInvalid}
          <span class="badge invalid">{$i18n.t('contacts.label--status-invalid')}</span>
        {/if}
        {#if isCreator}
          <span class="badge creator">{$i18n.t('contacts.label--status-creator')}</span>
        {/if}
        {#if isArchived}
          <span class="badge archived">{$i18n.t('contacts.label--status-archived')}</span>
        {/if}
        {#if isDraft}
          <span class="draft">{$i18n.t('messaging.label--prefix-draft')}</span>
        {/if}
        {#if subtitle !== undefined}
          <ProcessedText
            text={subtitle instanceof Object ? subtitle.text ?? '' : subtitle}
            mentions={subtitle instanceof Object ? subtitle.mentions ?? [] : []}
            highlights={filter}
            shouldLinkMentions={false}
            shouldParseLinks={false}
            shouldParseMarkup={true}
          />
        {/if}
      </div>
    {:else}
      <div class="display-title" class:disabled={isDisabled} class:inactive={isInactive}>
        <ProcessedText text={title} highlights={filter} />
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

      &.disabled {
        text-decoration: line-through;
      }

      &.inactive {
        color: var(--t-text-e2-color);
      }
    }

    .subtitle {
      @extend %shortened-text;
      justify-self: start;
      align-self: center;
      color: var(--t-text-e2-color);
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: rem(4px);

      .badge {
        @extend %font-meta-400;
        padding: rem(2px) rem(4px);
        border-radius: rem(4px);
        line-height: rem(12px);
        color: var(--cc-contact-status-tag-text-color);
        background-color: var(--cc-contact-status-tag-background-color);
      }
    }

    .display-title {
      @extend %shortened-text;
      grid-area: title;
      align-self: center;

      &.disabled {
        text-decoration: line-through;
      }
    }

    .draft {
      color: var(--cc-conversation-preview-draft-text-color);
    }
  }
</style>
