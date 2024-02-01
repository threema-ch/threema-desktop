<script lang="ts">
  /**
   * Determine whether switch is checked.
   */
  export let checked = false;

  /**
   * Whether to disable the switch.
   */
  export let disabled = false;
</script>

<template>
  <div class="switch" class:disabled class:checked>
    <div class="track" />
    <div class="thumb" on:click={() => (checked = !checked)} />
    <input
      type="checkbox"
      on:click
      on:click={() => (checked = !checked)}
      role="switch"
      bind:checked
      aria-checked={checked}
      {...$$restProps}
    />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .switch {
    position: relative;
    width: em(29px);
    height: em(18px);
    transition: color 0.15s ease;

    .thumb {
      left: 0;
      background-color: var(--c-switch-thumb-color-off);
      position: relative;

      &::before {
        content: '';
        transform: scale(2.2222);
        left: 0;
        top: 0;
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        pointer-events: none;
      }

      &:hover {
        &::before {
          background-color: var(--c-switch-thumb-glow-color);
        }
      }

      &:active {
        &::before {
          background-color: var(--c-switch-thumb-glow-color--active);
        }
      }
    }

    &:focus-within {
      .thumb {
        &::before {
          border: solid em(0.22px) var(--c-switch-thumb-glow-border-color);
        }
      }
    }

    .track {
      color: var(--c-switch-track-color-off);
    }

    &.checked {
      .thumb {
        left: em(11px);
        background-color: var(--c-switch-thumb-color);
      }

      .track {
        color: var(--c-switch-track-color);
      }

      &.disabled {
        .thumb {
          background-color: var(--c-switch-thumb-color--disabled);
        }

        .track {
          color: var(--c-switch-track-color--disabled);
        }
      }
    }

    &.disabled {
      pointer-events: none;

      .thumb {
        background-color: var(--c-switch-thumb-color-off--disabled);
      }

      .track {
        color: var(--c-switch-track-color-off--disabled);
      }
    }
  }

  .thumb {
    position: absolute;
    left: 0;
    width: em(18px);
    height: em(18px);
    border-radius: 50%;
    background-color: var(--c-switch-thumb-color-off);
    transition: left 0.15s ease;
    cursor: pointer;
  }

  .track {
    position: absolute;
    width: em(29px);
    height: em(12px);
    top: calc(50% - #{em(6px)});
    border-radius: em(14px);
    color: var(--c-switch-track-color-off);
    background-color: currentColor;
  }

  input {
    @extend %neutral-input;
    display: block;
    width: 100%;
    height: 100%;
    opacity: 0;
    user-select: none;
    cursor: pointer;
  }
</style>
