<script lang="ts">
  import {tick} from 'svelte';

  import type {u53} from '~/common/types';
  import {assertUnreachable} from '~/common/utils/assert';

  /**
   * The user input.
   */
  export let value: string;
  /**
   * The hinting label of the Input element.
   */
  export let label: string | undefined = undefined;
  /**
   * May occurred error description.
   */
  export let error: string | undefined = undefined;
  /**
   * Any helping description.
   */
  export let help: string | undefined = undefined;
  /**
   * Define the max char length of the input
   */
  export let maxlength: u53 | undefined = undefined;
  /**
   * Determinate if input can be changed by the user.
   */
  export let disabled = false;
  /**
   * Determinate if input should be, if possible, checked for spelling errors.
   */
  export let spellcheck = true;

  // The raw text input element
  let input: HTMLInputElement | null = null;

  // Defines if the raw text input element will be shown
  let showInput: boolean;
  $: showInput = value !== '' || document.activeElement === input || label === undefined;

  /**
   * Change focus to this text input.
   */
  export function focus(): void {
    if (!disabled) {
      showInput = true;
      tick()
        .then(() => input?.focus())
        .catch(assertUnreachable);
    }
  }
</script>

<template>
  <div class="container" data-error={error !== undefined}>
    <div
      class="input"
      data-label={label !== undefined}
      data-input={showInput}
      data-disabled={disabled}
      on:click={() => input?.focus()}
    >
      <label on:mousedown={focus}>
        <span>{label}</span>
        <input
          on:input
          on:keyup
          on:keydown
          on:paste
          bind:this={input}
          on:blur={() => {
            if (!disabled) {
              showInput = label === undefined || value !== '';
            }
          }}
          on:focus={() => {
            if (!disabled) {
              showInput = true;
            }
          }}
          type="text"
          placeholder={label}
          bind:value
          {disabled}
          {spellcheck}
          {maxlength}
        />
      </label>
    </div>
    {#if error !== undefined || help !== undefined}
      <div class="text">
        {#if error !== undefined}
          {error}
        {:else}
          {help}
        {/if}
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    grid-template:
      'input' auto
      'text' auto
      / auto;
    row-gap: em(4px);

    .input {
      grid-area: input;
      padding: em(9px) em(16px);
      border-radius: var(--c-input-text-border-radius);
      background-color: var(--c-input-text-background-color);
      border-style: solid;
      border-width: em(1px);
      border-color: transparent;
      cursor: text;

      &:hover {
        background-color: var(--c-input-text-background-color--hover);
      }

      &:focus-within {
        background-color: var(--c-input-text-background-color--active);
      }

      label {
        @extend %font-small-400;
        display: grid;
        grid-template:
          'label' auto
          'value' auto
          / auto;
        color: var(--c-input-text-label-color);

        span {
          grid-area: label;
          user-select: none;
          cursor: text;
        }

        input {
          @extend %font-normal-400;
          width: 100%;
          color: var(--c-input-text-input-color);
          grid-area: value;
          border: none;
          outline: none;
          background-color: transparent;
          padding: 0;
          margin-top: em(-2px);
          text-align: var(--c-input-text-input-text-align);
          letter-spacing: var(--c-input-text-input-letter-spacing);

          &::placeholder {
            color: transparent;
          }
        }
      }

      &[data-input='false'] {
        padding: em(17px) em(16px);

        label {
          @extend %font-normal-400;
          grid-template:
            'label' auto
            / 100%;
          grid-area: label;
          position: relative;
          cursor: text;

          input {
            opacity: 0;
            position: absolute;
            top: 0;
            left: 0;
            width: 0;
            height: 0;
          }
        }
      }

      &[data-label='false'] {
        padding: em(17px) em(16px);

        label {
          span {
            display: none;
          }
          input {
            margin-top: 0;
          }
        }
      }

      &[data-disabled='true'] {
        background-color: var(--c-input-text-background-color--disabled) !important;

        label {
          color: var(--c-input-text-label-color--disabled);
          cursor: default;

          span {
            cursor: default;
          }

          input {
            color: var(--c-input-text-input-color--disabled);
          }
        }
      }
    }

    .text {
      @extend %font-small-400;
      grid-area: text;
      color: var(--c-input-text-help-color);
    }

    &[data-error='true'] {
      .input {
        border-color: var(--c-input-text-error-color);
      }
      .text {
        color: var(--c-input-text-error-color);
      }
    }
  }
</style>
