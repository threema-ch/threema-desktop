<script lang="ts">
  import Checkbox from '#3sc/components/blocks/Checkbox/Checkbox.svelte';
  import RecipientProfilePicture from '~/app/ui/generic/receiver/ProfilePicture.svelte';
  import RecipientTitle from '~/app/ui/generic/receiver/Title.svelte';

  import {type ReceiverProfilePicture, type ReceiverTitle} from '.';

  /**
   * Determine whether the contact is clickable.
   */
  export let clickable = true;
  /**
   * Determine whether the contact is currently selectable via displayed checkbox.
   */
  export let selectable = false;
  /**
   * Determine whether the contact is currently selected.
   */
  export let selected = false;
  /**
   * Currently filtered value, which will be highlighted
   */
  export let filter: string | undefined = undefined;
  /**
   * Profile picture data bag
   */
  export let profilePicture: ReceiverProfilePicture;
  /**
   * Title data bag
   */
  export let title: ReceiverTitle;
</script>

<template>
  <div class="receiver" class:selectable class:clickable on:click>
    {#if selectable}
      <div class="checkbox">
        <Checkbox checked={selected} />
      </div>
    {/if}

    <RecipientProfilePicture {...profilePicture} />

    <RecipientTitle {...title} {filter} />

    <div class="additional-top">
      <slot name="additional-top" />
    </div>
    <div class="additional-bottom">
      <slot name="additional-bottom" />
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  $-checkbox-size: rem(40px);
  $-profile-picture-size: rem(68px);
  $-fade-width: rem(48px);

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

    .checkbox {
      grid-area: checkbox;
      display: grid;
      place-items: center;
      @include def-var(--c-checkbox-padding, rem(7px));
    }

    .additional-top {
      height: rem(20px);
      grid-area: additional-top;
      justify-self: end;
      padding-left: rem(5px);
    }

    .additional-bottom {
      @extend %font-small-400;
      height: rem(20px);
      grid-area: additional-bottom;
      justify-self: end;
      padding-left: rem(5px);
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
  }
</style>
