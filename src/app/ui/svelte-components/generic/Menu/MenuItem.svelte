<script lang="ts">
  /**
   * Whether the item is disabled. Note: "pseudo" will look similar to a disabled item, but will
   * still be clickable.
   */
  export let disabled: boolean | 'pseudo' = false;

  /**
   * Whether the item is selected or not.
   */
  export let selected = false;
</script>

<template>
  <button
    on:click
    on:keydown
    on:mouseenter
    on:mouseleave
    on:keyup
    disabled={disabled === true}
    tabindex={disabled === true ? -1 : 0}
    class:disabled={disabled === 'pseudo'}
    class:is-selected={selected}
    type="button"
  >
    {#if $$slots.icon}
      <div class="icon">
        <slot name="icon" />
      </div>
    {/if}
    <div class="text">
      <slot />
    </div>
  </button>
</template>

<style lang="scss">
  @use 'component' as *;

  button {
    flex: 1 0 auto;

    display: flex;
    flex-direction: row;
    align-items: center;

    padding: var(--c-menu-item-padding, default);
    gap: var(--c-menu-item-gap, default);
    user-select: none;
    border: em(1px) solid transparent;
    background-color: transparent;
    color: var(--c-menu-item-text-color, default);
    outline: unset;
    font-size: inherit;
    white-space: nowrap;

    .icon {
      display: grid;
      grid-area: icon;
      color: var(--c-menu-item-icon-color);
    }

    .text {
      grid-area: text;
      text-align: left;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: rem(14px);
    }

    &:not(:disabled) {
      cursor: pointer;

      &:hover {
        background-color: var(--c-menu-item-background-color--hover, default);
      }

      &:focus-visible {
        background-color: var(--c-menu-item-background-color--focus, default);
        border: #{em(1px)} solid var(--c-menu-item-border-color--focus, default);
      }

      &.is-selected,
      &:active {
        background-color: var(--c-menu-item-background-color--active, default);
      }
    }

    &:disabled,
    &.disabled {
      opacity: var(--c-menu-item-opacity--disabled, default);
    }
  }
</style>
