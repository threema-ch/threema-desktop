<script lang="ts">
  // TS-Block is required for component usage in typescript import
</script>

<template>
  <button on:click type="button" tabindex="-1">
    <span class="icon">
      <slot name="icon" />
    </span>

    <span class="name">
      <slot name="name" />
    </span>
  </button>
</template>

<style lang="scss">
  @use 'component' as *;

  button {
    @extend %neutral-input;
    background-color: var(--ic-swipe-area-button-background-color);
    display: grid;
    grid-template:
      'icon' 9fr
      'name' 7fr;
    place-items: center;
    cursor: pointer;

    &:hover {
      background-color: var(--ic-swipe-area-button-background-color--hover);
    }

    &:focus {
      background-color: var(--ic-swipe-area-button-background-color--hover);
      outline: var(--ic-swipe-area-button-outline--focus);
    }

    &:active {
      background-color: var(--ic-swipe-area-button-background-color--active);
    }
  }

  .icon {
    align-self: end;
    color: var(--ic-swipe-area-button-icon-color);
  }
  .name {
    @extend %font-meta-400;
    align-self: start;
    color: var(--ic-swipe-area-button-name-color);
  }
</style>
