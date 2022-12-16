<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ThreemaIcon from '#3sc/components/blocks/Icon/ThreemaIcon.svelte';
  import {type u53} from '~/common/types';
  import {debounce} from '~/common/utils/timer';
  import {type ReceiverBadgeType} from '~/common/viewmodel/types';

  /**
   * Unread messages counter.
   */
  export let unread: u53 | undefined = undefined;

  let debouncedUnreadCount = unread;

  const updateDebouncedUnreadCount = debounce((newCount: u53 | undefined) => {
    debouncedUnreadCount = newCount;
  }, 300);

  $: updateDebouncedUnreadCount(unread);

  /**
   * Receiver badge type.
   */
  export let badge: ReceiverBadgeType | undefined;
</script>

<template>
  <div class="overlay">
    {#if debouncedUnreadCount !== undefined && debouncedUnreadCount > 0}
      <div class="unread">{debouncedUnreadCount < 100 ? debouncedUnreadCount : '99+'}</div>
    {/if}

    {#if badge !== undefined}
      <div class="badge" data-badge={badge}>
        {#if badge === 'contact-work'}
          <ThreemaIcon theme="Filled">threema_work_contact</ThreemaIcon>
        {:else if badge === 'contact-consumer'}
          <ThreemaIcon theme="Filled">threema_consumer_contact</ThreemaIcon>
        {:else if badge === 'group'}
          <MdIcon theme="Filled">group</MdIcon>
        {:else if badge === 'distribution-list'}
          <MdIcon theme="Filled">campaign</MdIcon>
        {/if}
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  $-height: rem(20px);
  $-width: rem(20px);
  $-border-width: rem(2px);
  $-border-radius: rem(10px);

  .overlay {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template:
      'unread .      ' 1fr
      '.        badge' 1fr
      / 1fr 1fr;
  }

  %bubble {
    height: $-height;
    border: $-border-width solid var(--cc-avatar-overlay-background-color);
    display: grid;
    place-items: center;
  }

  .unread {
    @extend %bubble;
    @extend %font-meta-400;
    min-width: $-width;
    padding: 0 $-border-width * 2;
    border-radius: $-border-radius;
    color: var(--cc-avatar-overlay-unread-text-color);
    background-color: var(--cc-avatar-overlay-unread-background-color);
    grid-area: unread;
    place-self: start center;
  }

  .badge {
    @extend %bubble;
    font-size: rem(12px);
    width: $-width;
    height: $-height;
    border-radius: 50%;
    color: var(--cc-avatar-overlay-badge-icon-color);
    background-color: var(--cc-avatar-overlay-background-color);
    grid-area: badge;
    place-self: end center;

    &[data-badge='contact-consumer'] {
      color: var(--cc-avatar-overlay-badge-icon-consumer-color);
    }

    &[data-badge='contact-work'] {
      color: var(--cc-avatar-overlay-badge-icon-work-color);
    }
  }
</style>
