<script lang="ts">
  import Checkbox from '#3sc/components/blocks/Checkbox/Checkbox.svelte';
  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import RecipientAvatar from '~/app/ui/generic/receiver/Avatar.svelte';
  import HighlightableText from '~/app/ui/generic/receiver/HighlightableText.svelte';

  import {type Receiver} from '.';

  /**
   * Determine whether the receiver is clickable.
   */
  export let clickable = true;
  /**
   * Determine whether the receiver is currently selectable via displayed checkbox.
   */
  export let selectable = false;
  /**
   * Determine whether the receiver is currently selected.
   */
  export let selected = false;
  /**
   * Currently filtered value, which will be highlighted
   */
  export let filter: string | undefined = undefined;
  /**
   * Receiver bag
   */
  export let receiver: Receiver;

  let title: string;
  let titleLineThrough: boolean | undefined;
  let subTitle: string | undefined;

  let isInactive = false;
  let isCreator = false;
  let isArchived = false;
  let isDraft = false;
  let hasBadge = false;

  function extractDetails(receiverParam: Receiver): void {
    title = receiverParam.title.text;
    titleLineThrough = receiverParam.title.lineThrough;
    subTitle = receiverParam.subtitle?.text;

    switch (receiverParam.type) {
      case 'contact':
        isInactive = receiverParam.subtitle?.badges?.isInactive ?? false;
        isCreator = receiverParam.subtitle?.badges?.isCreator ?? false;
        isArchived = receiverParam.subtitle?.badges?.isArchived ?? false;
        isDraft = receiverParam.subtitle?.badges?.isDraft ?? false;
        break;
      default:
        // No-op
        break;
    }

    hasBadge = isInactive || isCreator || isArchived || isDraft;
  }

  $: extractDetails(receiver);
</script>

<template>
  <div class="receiver" data-type={receiver.type} class:selectable class:clickable on:click>
    {#if selectable}
      <div class="checkbox">
        <Checkbox checked={selected} />
      </div>
    {/if}

    <RecipientAvatar {...receiver.avatar} />

    <div class="name">
      {#if subTitle !== undefined || hasBadge}
        <div class="title" class:line-through={titleLineThrough}>
          <HighlightableText text={title} substringToHighlight={filter} />
        </div>
        {#if receiver.type === 'group'}
          {@const membersCount = receiver.membersCount}
          <div class="count">
            {membersCount} Member{#if membersCount > 1}s{/if}
          </div>
        {/if}
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
          {#if subTitle !== undefined}
            <HighlightableText text={subTitle} substringToHighlight={filter} />
          {/if}
        </div>
      {:else}
        <div class="display-title" class:line-through={titleLineThrough}>
          <HighlightableText text={title} substringToHighlight={filter} />
        </div>
      {/if}
    </div>

    {#if receiver.type === 'contact'}
      <div class="verification-level">
        <VerificationDots
          colors={receiver.verificationDot.color}
          verificationLevel={receiver.verificationDot.level}
        />
      </div>
      <div class="identity">
        <HighlightableText text={receiver.identity} substringToHighlight={filter} />
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  $-checkbox-size: rem(40px);
  $-avatar-size: rem(68px);
  $-fade-width: rem(48px);
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

  .receiver {
    padding: rem(14px) rem(16px) rem(14px) rem(8px);
    width: 100%;
    scroll-snap-align: end;
    display: grid;
    grid-template:
      'avatar name  additional-top    ' rem(20px)
      'avatar name  additional-bottom ' rem(20px)
      / #{$-avatar-size} 1fr auto;
    align-items: center;

    &[data-type='contact'] {
      grid-template:
        'avatar name  verification-level' rem(20px)
        'avatar name  identity' rem(20px)
        / #{$-avatar-size} 1fr auto;

      .verification-level {
        height: rem(20px);
        grid-area: verification-level;
        justify-self: end;
        padding-left: rem(5px);
        @include def-var(--c-verification-dots-size, rem(6px));
      }
      .identity {
        @extend %font-small-400;
        height: rem(20px);
        grid-area: identity;
        justify-self: end;
        padding-left: rem(5px);
        color: var(--t-text-e2-color);
      }
    }

    &[data-type='group'] {
      grid-template:
        'avatar name  ' rem(20px)
        'avatar name  ' rem(20px)
        / #{$-avatar-size} 1fr auto;

      .name {
        grid-template:
          'title count' #{rem(20px)}
          'subtitle subtitle' #{rem(20px)}
          / 1fr auto;
        .count {
          @extend %font-small-400;
          grid-area: count;
          justify-self: end;
          color: var(--t-text-e2-color);
        }
      }
    }

    .checkbox {
      grid-area: checkbox;
      display: grid;
      place-items: center;
      @include def-var(--c-checkbox-padding, rem(7px));
    }

    &.clickable {
      cursor: pointer;
    }

    &.selectable {
      grid-template:
        'checkbox avatar name  additional-top     ' rem(20px)
        'checkbox avatar name  additional-bottom  ' rem(20px)
        / #{$-checkbox-size} #{$-avatar-size} 1fr auto;
    }

    .name {
      display: grid;
      width: 100%;
      align-self: normal;
      grid-template:
        'title' #{rem(20px)}
        'subtitle' #{rem(20px)}
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
        grid-area: subtitle;
        justify-self: start;
        align-self: center;
        color: var(--t-text-e2-color);
      }

      .display-title {
        @extend %shortened-text;
        grid-area: 1 / 1 / 3 / 2;

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
  }
</style>
