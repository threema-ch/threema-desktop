<script lang="ts">
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import CircularProgress from '~/app/ui/svelte-components/blocks/CircularProgress/CircularProgress.svelte';
  import type {Modal} from '~/app/ui/svelte-components/blocks/ModalDialog';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {unreachable} from '~/common/utils/assert';

  interface ConfirmOnlyProps {
    readonly cancelText?: undefined;
    readonly focusOnMount?: 'confirm' | undefined;
    readonly confirmDisabled?: boolean;
  }

  interface CancelAndConfirmProps {
    readonly cancelText: string;
    readonly focusOnMount?: 'cancel' | 'confirm' | undefined;
    readonly cancelDisabled?: boolean;
    readonly confirmDisabled?: boolean;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type $$Props = (ConfirmOnlyProps | CancelAndConfirmProps) & {
    readonly modal: Modal;
    readonly confirmText: string;
    readonly buttonsState?: 'default' | 'loading';
  };

  export let modal: Modal;

  /**
   * The text for the confirm button.
   */
  export let confirmText: string;

  /**
   * The text for the cancel button.
   * If no text is defined, no cancel button will be shown.
   */
  export let cancelText: string | undefined = undefined;

  export let cancelDisabled: SvelteNullableBinding<boolean> = false;
  export let confirmDisabled: SvelteNullableBinding<boolean> = false;

  /**
   * The states of the buttons.
   */
  export let buttonsState = 'default';

  /**
   * Which button to focus on mount of the component, if any.
   */
  export let focusOnMount: 'cancel' | 'confirm' | undefined = undefined;

  let cancelButton: HTMLElement | undefined = undefined;
  let confirmButton: HTMLElement | undefined = undefined;

  /**
   * Depending on the {@link focusOnMountValue} parameter, focus the cancel button, the confirm
   * button, or none at all.
   */
  function focusButton(
    focusOnMountValue: 'cancel' | 'confirm',
    cancelButtonValue: HTMLElement | undefined,
    confirmButtonValue: HTMLElement | undefined,
  ): void {
    switch (focusOnMountValue) {
      case 'cancel':
        cancelButtonValue?.focus();
        break;
      case 'confirm':
        confirmButtonValue?.focus();
        break;
      default:
        unreachable(focusOnMountValue);
    }
  }

  $: if (focusOnMount !== undefined) {
    focusButton(focusOnMount, cancelButton, confirmButton);
  }
</script>

<template>
  <div class="footer">
    {#if cancelText !== undefined}
      <Button
        on:elementReady={(event) => {
          cancelButton = event.detail.element;
        }}
        flavor="naked"
        disabled={buttonsState === 'loading' || cancelDisabled === true}
        on:click={modal.cancel}>{cancelText}</Button
      >
    {/if}
    <Button
      on:elementReady={(event) => {
        confirmButton = event.detail.element;
      }}
      flavor="filled"
      disabled={buttonsState === 'loading' || confirmDisabled === true}
      on:click={modal.confirm}
    >
      <div class="confirm-button-content" data-button-state={buttonsState}>
        <div class="progress">
          <CircularProgress variant="indeterminate" color="white" />
        </div>
        <div class="label">
          {confirmText}
        </div>
      </div>
    </Button>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .confirm-button-content {
    display: grid;

    .progress,
    .label {
      grid-row: 1;
      grid-column: 1;
    }

    .progress {
      display: none;
      height: rem(20px);
    }

    &[data-button-state='loading'] {
      .progress {
        display: block;
      }

      .label {
        opacity: 0.4;
      }
    }
  }

  .footer {
    padding: rem(16px);
    display: grid;
    grid-template: 'cancel ok' auto / 1fr auto;
    column-gap: rem(8px);
    justify-items: end;
  }
</style>
