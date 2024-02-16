<script lang="ts">
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import ThreemaIcon from '~/app/ui/svelte-components/blocks/Icon/ThreemaIcon.svelte';
  import type {u53} from '~/common/types';
  import {TIMER} from '~/common/utils/timer';
  import type {ReceiverBadgeType} from '~/common/viewmodel/types';

  /**
   * Unread messages counter.
   */
  export let unread: u53 | undefined = undefined;

  let debouncedUnreadCount: u53 | undefined = unread;

  const updateDebouncedUnreadCount = TIMER.debounce((newCount: u53 | undefined) => {
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
      {#if badge === 'contact-work'}
        <div
          class="badge"
          data-badge={badge}
          title={$i18n.t(
            'contacts.hint--badge-work',
            'This contact uses the business app "Threema Work."',
          )}
        >
          <ThreemaIcon theme="Filled">threema_work_contact</ThreemaIcon>
        </div>
      {:else if badge === 'contact-consumer'}
        <div
          class="badge"
          data-badge={badge}
          title={$i18n.t(
            'contacts.hint--badge-consumer',
            "This contact uses Threema's private version.",
          )}
        >
          <ThreemaIcon theme="Filled">threema_consumer_contact</ThreemaIcon>
        </div>
      {:else if badge === 'group'}
        <div class="badge" data-badge={badge}>
          <MdIcon theme="Filled">group</MdIcon>
        </div>
      {:else if badge === 'distribution-list'}
        <div class="badge" data-badge={badge}>
          <MdIcon theme="Filled">campaign</MdIcon>
        </div>
      {/if}
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

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
    height: var(--cc-profile-picture-overlay-badge-size);
    border: $-border-width solid var(--cc-profile-picture-overlay-background-color);
    display: grid;
    place-items: center;
  }

  .unread {
    @extend %bubble;
    @extend %font-meta-400;
    min-width: var(--cc-profile-picture-overlay-badge-size);
    padding: 0 $-border-width * 2;
    border-radius: $-border-radius;
    color: var(--cc-profile-picture-overlay-unread-text-color);
    background-color: var(--cc-profile-picture-overlay-unread-background-color);
    grid-area: unread;
    place-self: start center;
    transform: translate(rem(-5px), rem(-5px));
  }

  .badge {
    @extend %bubble;
    font-size: var(--cc-profile-picture-overlay-badge-icon-size);
    width: var(--cc-profile-picture-overlay-badge-size);
    height: var(--cc-profile-picture-overlay-badge-size);
    border-radius: 50%;
    color: var(--cc-profile-picture-overlay-badge-icon-color);
    background-color: var(--cc-profile-picture-overlay-background-color);
    grid-area: badge;
    place-self: end center;
    transform: translate(rem(5px), rem(5px));

    &[data-badge='contact-consumer'] {
      color: var(--cc-profile-picture-overlay-badge-icon-consumer-color);
    }

    &[data-badge='contact-work'] {
      color: var(--cc-profile-picture-overlay-badge-icon-work-color);
    }
  }
</style>
