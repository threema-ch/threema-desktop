<script lang="ts">
  import type {
    VerificationLevel,
    VerificationLevelColors,
  } from '~/app/ui/svelte-components/threema/VerificationDots';

  /**
   * Verification level colors for the dots.
   */
  export let colors: VerificationLevelColors;

  /**
   * The verification level of a contact.
   */
  export let verificationLevel: VerificationLevel;
</script>

<template>
  <span class="dots" data-colors={colors} data-verification-level={verificationLevel}>
    <span class="dot" />
    <span class="dot" />
    <span class="dot" />
  </span>
</template>

<style lang="scss">
  @use 'component' as *;

  .dots {
    display: inline-grid;
    grid-template:
      'dot dot dot'
      / 1fr 1fr 1fr;
    gap: var(--c-verification-dots-gap, default);
  }

  .dot {
    font-size: var(--c-verification-dots-size, default);
    height: 1em;
    width: 1em;
    border-radius: 50%;
    background-color: var(--c-verification-dots-empty-color, default);
  }

  [data-verification-level='unverified'] {
    .dot:nth-child(1) {
      background-color: var(--c-verification-dots-unverified-color, default);
    }
  }

  [data-verification-level='server-verified'] {
    .dot {
      &:nth-child(1),
      &:nth-child(2) {
        background-color: var(--c-verification-dots-server-verified-consumer-color, default);
      }
    }
  }

  [data-verification-level='fully-verified'] {
    .dot {
      &:nth-child(1),
      &:nth-child(2),
      &:nth-child(3) {
        background-color: var(--c-verification-dots-fully-verified-consumer-color, default);
      }
    }
  }

  [data-colors='shared-work-subscription'] {
    &[data-verification-level='server-verified'] {
      .dot {
        &:nth-child(1),
        &:nth-child(2) {
          background-color: var(--c-verification-dots-server-verified-work-color, default);
        }
      }
    }

    &[data-verification-level='fully-verified'] {
      .dot {
        &:nth-child(1),
        &:nth-child(2),
        &:nth-child(3) {
          background-color: var(--c-verification-dots-fully-verified-work-color, default);
        }
      }
    }
  }
</style>
