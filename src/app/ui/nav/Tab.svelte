<script lang="ts">
  import {type ContactTab} from '.';

  export let tab: ContactTab;
  export let activeTab: ContactTab;
  export let disabled = false;
</script>

<template>
  <button
    on:click={() => (activeTab = tab)}
    {disabled}
    {...$$restProps}
    class:active={tab === activeTab}
  >
    <slot />
  </button>
</template>

<style lang="scss">
  @use 'component' as *;

  button {
    @extend %neutral-input;
    display: grid;
    place-items: center;
    height: rem(40px);
    --c-icon-font-size: #{rem(24px)};
    border: solid 1px;
    border-color: transparent;
    border-radius: rem(8px);
    color: var(--ic-contact-navigation-context-button-color);
    height: rem(40px);

    &:not([disabled]) {
      cursor: pointer;

      &:hover {
        border-color: transparent;
        background-color: var(--ic-contact-navigation-context-button-background-color--hover);
      }

      &:focus-visible {
        border-color: var(--ic-contact-navigation-context-button-border-color--focus);
        background-color: var(--ic-contact-navigation-context-button-background-color--focus);
      }

      &:active,
      &.active {
        color: var(--ic-contact-navigation-context-button-color--active);
        border-color: transparent;
        background-color: var(--ic-contact-navigation-context-button-background-color--active);

        &:focus-visible {
          border-color: var(--ic-contact-navigation-context-button-border-color--focus);
        }
      }
    }

    &[disabled] {
      opacity: var(--ic-contact-navigation-context-button-opacity--disabled);
    }
  }
</style>
