<script lang="ts">
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  /**
   * Whether the checkbox is checked.
   */
  export let checked = false;

  /**
   * Whether to disable the checkbox.
   */
  export let disabled = false;

  // Toggles value, if not disabled.
  function toggle(): void {
    if (!disabled) {
      checked = !checked;
    }
  }
</script>

<template>
  <div
    on:click
    on:click|preventDefault={toggle}
    on:keyup
    on:keydown
    on:keydown={(event) => {
      if (['Space', 'Enter', 'NumpadEnter'].includes(event.code)) {
        toggle();
      }
    }}
    role="checkbox"
    aria-checked={checked}
    aria-disabled={disabled}
    tabindex="0"
  >
    <span>
      <MdIcon theme="Filled"
        >{#if checked}check_box{:else}check_box_outline_blank{/if}</MdIcon
      >
    </span>
    <input type="checkbox" bind:checked {...$$restProps} />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    @extend %neutral-input;
    display: grid;
    place-items: center;
    user-select: none;
    padding: var(--c-checkbox-padding, default);
    border: 1px solid transparent;
    border-radius: 50%;

    span {
      display: grid;
      place-items: center;
      font-size: em(24px);
      color: var(--c-checkbox-color, default);
    }

    &:not([aria-disabled='true']) {
      cursor: pointer;

      &:hover {
        background-color: var(--c-checkbox-outer-background-color--hover, default);
      }

      &:focus-visible {
        background-color: var(--c-checkbox-outer-background-color--focus, default);
        border-color: var(--c-checkbox-outer-border-color--focus, default);
      }

      &:active {
        background-color: var(--c-checkbox-outer-background-color--active, default);
      }
    }

    &[aria-disabled='true'] {
      opacity: var(--c-checkbox-opacity--disabled, default);
    }
  }

  input {
    display: none;
  }
</style>
