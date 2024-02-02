<script lang="ts">
  import BlockedIcon from '~/app/ui/generic/icon/BlockedIcon.svelte';
  import type {Receiver} from '~/app/ui/generic/receiver';
  import ProcessedText from '~/app/ui/generic/receiver/ProcessedText.svelte';
  import RecipientProfilePicture from '~/app/ui/generic/receiver/ProfilePicture.svelte';
  import {i18n} from '~/app/ui/i18n';
  import Checkbox from '~/app/ui/svelte-components/blocks/Checkbox/Checkbox.svelte';
  import VerificationDots from '~/app/ui/svelte-components/threema/VerificationDots/VerificationDots.svelte';

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
  let subtitle: string | undefined;
  let isDisabled: boolean | undefined;

  let isInactive = false;
  let isInvalid = false;
  let isCreator = false;
  let isArchived = false;
  let isDraft = false;
  let isBlocked = false;
  let hasBadge = false;

  function extractDetails(receiverParam: Receiver): void {
    title = receiverParam.title.text;
    isDisabled = receiverParam.title.isDisabled;
    subtitle = receiverParam.subtitle?.text;

    switch (receiverParam.type) {
      case 'contact':
        isInactive = receiverParam.subtitle?.badges?.isInactive ?? false;
        isInvalid = receiverParam.subtitle?.badges?.isInvalid ?? false;
        isCreator = receiverParam.subtitle?.badges?.isCreator ?? false;
        isArchived = receiverParam.subtitle?.badges?.isArchived ?? false;
        isDraft = receiverParam.subtitle?.badges?.isDraft ?? false;
        isBlocked = receiverParam.isBlocked;
        break;
      case 'user':
        isCreator = receiverParam.subtitle?.badges?.isCreator ?? false;
        break;
      default:
        isInactive = false;
        isInvalid = false;
        isCreator = false;
        isArchived = false;
        isDraft = false;
        isBlocked = false;
        break;
    }

    hasBadge = isInactive || isInvalid || isCreator || isArchived || isDraft;
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

    <RecipientProfilePicture {...receiver.profilePicture} />

    <div class="name">
      {#if subtitle !== undefined || hasBadge}
        <div class="title" class:disabled={isDisabled} class:inactive={isInactive}>
          <ProcessedText text={title} highlights={filter} />
        </div>
        {#if receiver.type === 'group'}
          {@const membersCount = receiver.membersCount}
          <div class="count">
            {$i18n.t(
              'contacts.label--group-members-count-short',
              '{n, plural, =1 {1 Member} other {# Members}}',
              {
                n: membersCount,
              },
            )}
          </div>
        {/if}
        <div class="subtitle">
          {#if isInactive}
            <span class="badge inactive"
              >{$i18n.t('contacts.label--status-inactive', 'Inactive')}</span
            >
          {/if}
          {#if isInvalid}
            <span class="badge invalid">{$i18n.t('contacts.label--status-invalid', 'Invalid')}</span
            >
          {/if}
          {#if isCreator}
            <span class="badge creator">{$i18n.t('contacts.label--status-creator', 'Creator')}</span
            >
          {/if}
          {#if isArchived}
            <span class="badge archived"
              >{$i18n.t('contacts.label--status-archived', 'Archived')}</span
            >
          {/if}
          {#if isDraft}
            <span class="draft">{$i18n.t('messaging.label--prefix-draft', 'Draft:')}</span>
          {/if}
          {#if subtitle !== undefined}
            <ProcessedText text={subtitle} highlights={filter} />
          {/if}
        </div>
      {:else}
        <div class="display-title" class:disabled={isDisabled} class:inactive={isInactive}>
          <ProcessedText text={title} highlights={filter} />
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
        {#if isBlocked}
          <span class="property" data-property="blocked">
            <BlockedIcon />
          </span>
        {/if}
        <ProcessedText text={receiver.identity} highlights={filter} />
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  $-checkbox-size: rem(40px);
  $-profile-picture-size: rem(68px);
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
    --c-profile-picture-size: #{rem(48px)};
    padding: rem(14px) rem(16px) rem(14px) rem(8px);
    width: 100%;
    scroll-snap-align: end;
    display: grid;
    grid-template:
      'profile-picture name  additional-top    ' rem(20px)
      'profile-picture name  additional-bottom ' rem(20px)
      / #{$-profile-picture-size} 1fr auto;
    align-items: center;

    &[data-type='contact'],
    &[data-type='user'] {
      grid-template:
        'profile-picture name  verification-level' rem(20px)
        'profile-picture name  identity' rem(20px)
        / #{$-profile-picture-size} 1fr auto;

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
        'profile-picture name  ' rem(20px)
        'profile-picture name  ' rem(20px)
        / #{$-profile-picture-size} 1fr auto;

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
        'checkbox profile-picture name  additional-top     ' rem(20px)
        'checkbox profile-picture name  additional-bottom  ' rem(20px)
        / #{$-checkbox-size} #{$-profile-picture-size} 1fr auto;
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

        &.disabled {
          text-decoration: line-through;
        }

        &.inactive {
          color: var(--t-text-e2-color);
        }
      }

      .subtitle {
        @extend %shortened-text;
        grid-area: subtitle;
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
          line-height: rem(12px);
          padding: rem(2px) rem(4px);
          border-radius: rem(4px);
          color: var(--cc-contact-status-tag-text-color);
          background-color: var(--cc-contact-status-tag-background-color);
        }
      }

      .display-title {
        @extend %shortened-text;
        grid-area: 1 / 1 / 3 / 2;
        align-self: center;

        &.disabled {
          text-decoration: line-through;
        }

        &.inactive {
          color: var(--t-text-e2-color);
        }
      }

      .draft {
        color: var(--cc-conversation-preview-draft-text-color);
      }
    }

    [data-property='blocked'] {
      position: relative;
      top: rem(2px);
    }
  }
</style>
