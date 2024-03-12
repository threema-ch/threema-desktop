<script lang="ts">
  import {tick} from 'svelte';

  import type {InputProps} from '~/app/ui/components/atoms/input/props';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {assertUnreachable} from '~/common/utils/assert';

  type $$Props = InputProps;

  // TODO(DESK-1368): Add dynamic `type` attribute to make this component usable for various
  // scenarios (e.g., as a password input).
  export let autofocus: NonNullable<$$Props['autofocus']> = false;
  export let disabled: NonNullable<$$Props['disabled']> = false;
  export let error: $$Props['error'] = undefined;
  export let help: $$Props['help'] = undefined;
  export let id: $$Props['id'];
  export let label: $$Props['label'] = undefined;
  export let maxlength: $$Props['maxlength'] = undefined;
  export let spellcheck: $$Props['spellcheck'] = undefined;
  export let value: $$Props['value'] = '';

  let inputElement: SvelteNullableBinding<HTMLInputElement> = null;

  /** Select input */
  export function select(): void {
    inputElement?.select();
  }

  /**
   * Bring focus to this input.
   */
  export function focus(): void {
    if (!disabled) {
      tick()
        .then(() => inputElement?.focus())
        .catch(assertUnreachable);
    }
  }

  /**
   * Bring focus to this input and select its contents.
   */
  export function focusAndSelect(): void {
    if (!disabled) {
      tick()
        .then(() => {
          inputElement?.focus();
          inputElement?.select();
        })
        .catch(assertUnreachable);
    }
  }
</script>

<div
  class="container"
  data-has-error={error !== undefined}
  data-has-label={label !== undefined}
  data-is-empty={value !== ''}
  data-is-disabled={disabled}
>
  <label class="input" for={id}>
    <span class="content">
      {#if label !== undefined}
        <span class="label">{label}</span>
      {/if}

      <input
        bind:this={inputElement}
        bind:value
        {autofocus}
        {disabled}
        {id}
        {maxlength}
        placeholder={label}
        {spellcheck}
        type="text"
        on:input
        on:keyup
        on:keydown
        on:paste
        on:blur
        on:focus
      />
    </span>
  </label>

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

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;
    row-gap: em(4px);

    .input {
      // Fixed height, regardless of the presence of a `label`, `input`, or both.
      height: rem(56px);

      display: flex;
      align-items: center;
      justify-content: stretch;

      padding: em(9px) em(16px);
      background-color: var(--c-input-text-background-color);
      border-radius: var(--c-input-text-border-radius);
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

      .content {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        width: 100%;

        .label {
          @extend %font-small-400;

          color: var(--c-input-text-label-color);
          user-select: none;
        }

        input {
          @extend %font-normal-400;

          padding: 0;
          min-width: 0;
          border: none;
          outline: none;
          color: var(--c-input-text-input-color);
          background-color: transparent;
          margin-top: em(-2px);
          text-align: var(--c-input-text-input-text-align);
          letter-spacing: var(--c-input-text-input-letter-spacing);

          &::placeholder {
            color: var(--c-input-text-label-color);
          }
        }
      }
    }

    .text {
      @extend %font-small-400;

      color: var(--c-input-text-help-color);
    }

    &[data-has-error='true'] {
      .input {
        border-color: var(--c-input-text-error-color);
      }

      .text {
        color: var(--c-input-text-error-color);
      }
    }

    // If the input has a label but is empty, toggle between displaying the placeholder or label
    // depending on whether the input is focused.
    &[data-has-label='true'][data-is-empty='false'] {
      .input:focus-within {
        input::placeholder {
          color: transparent;
        }
      }

      .input:not(:focus-within) {
        .label {
          display: none;
        }
      }
    }

    &[data-is-disabled='true'] {
      .input {
        background-color: var(--c-input-text-background-color--disabled) !important;
        cursor: default;

        .content {
          .label {
            color: var(--c-input-text-label-color--disabled);
          }

          input {
            color: var(--c-input-text-input-color--disabled);
          }
        }
      }
    }
  }
</style>
