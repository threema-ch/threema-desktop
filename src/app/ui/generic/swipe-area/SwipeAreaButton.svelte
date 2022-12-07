<script lang="ts">
  // TS-Block is required for component usage in typescript import
</script>

<template>
  <button on:click type="button">
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
    background-color: var(--c-swipe-area-button-background-color, default);
    display: grid;
    grid-template:
      'icon' 9fr
      'name' 7fr;
    place-items: center;
    cursor: pointer;

    &:hover {
      background-color: var(--c-swipe-area-button-background-color--hover, default);
    }

    &:focus {
      background-color: var(--c-swipe-area-button-background-color--hover, default);
      outline: var(--c-swipe-area-button-outline--focus, default);
    }

    &:active {
      background-color: var(--c-swipe-area-button-background-color--active, default);
    }
  }

  .icon {
    align-self: end;
    color: var(--c-swipe-area-button-icon-color, default);
  }
  .name {
    @extend %font-meta-400;
    align-self: start;
    color: var(--c-swipe-area-button-name-color, default);
  }
</style>
