<script lang="ts">
  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import CircularProgress from '#3sc/components/blocks/CircularProgress/CircularProgress.svelte';
  import type {Modal} from '#3sc/components/blocks/ModalDialog';
  import {unreachable} from '#3sc/utils/assert';

  interface ConfirmOnlyProps {
    cancelText?: undefined;
    focusOnMount?: 'confirm' | undefined;
  }

  interface CancelAndConfirmProps {
    cancelText: string;
    focusOnMount?: 'cancel' | 'confirm' | undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type $$Props = (ConfirmOnlyProps | CancelAndConfirmProps) & {
    modal: Modal;
    confirmText: string;
    buttonsState?: 'default' | 'confirmDisabled' | 'loading';
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
        disabled={buttonsState === 'loading'}
        on:click={modal.cancel}>{cancelText}</Button
      >
    {/if}
    <Button
      on:elementReady={(event) => {
        confirmButton = event.detail.element;
      }}
      flavor="filled"
      disabled={buttonsState === 'confirmDisabled' || buttonsState === 'loading'}
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
