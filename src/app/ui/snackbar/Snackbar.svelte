<script lang="ts">
  import {fly} from 'svelte/transition';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ThreemaIcon from '#3sc/components/blocks/Icon/ThreemaIcon.svelte';
  import ToastComponent from '#3sc/components/generic/Snackbar/Toast.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  import {type Toast, snackbarStore, toast} from '.';

  let snackbarElement: SvelteNullableBinding<HTMLDialogElement> = null;

  function updateSnackbar(element: typeof snackbarElement, toasts: Toast[]): void {
    if (element === null) {
      return;
    }

    // Always close an open modal first (even if there are still toasts), as we need to reopen it
    // anyway for it to be in front.
    if (element.open) {
      element.close();
    }

    if (toasts.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      element.showPopover();
    }
  }

  $: updateSnackbar(snackbarElement, $snackbarStore);
</script>

<template>
  <dialog bind:this={snackbarElement} class="snackbar" popover="manual">
    {#each $snackbarStore as toastItem (toastItem)}
      <div
        class="toast-wrapper"
        in:fly={{y: -100, duration: 800, opacity: 1}}
        out:fly={{x: 336, duration: 800, opacity: 1}}
      >
        <ToastComponent
          action={toastItem.action}
          text={toastItem.message}
          on:close={() => toast.removeToast(toastItem)}
        >
          {#if toastItem.icon !== undefined}
            <div class={`toast-icon color-${toastItem.icon.color}`}>
              {#if toastItem.icon.type === 'md-icon'}
                <MdIcon theme={toastItem.icon.theme}>{toastItem.icon.name}</MdIcon>
              {:else if toastItem.icon.type === 'threema-icon'}
                <ThreemaIcon theme={toastItem.icon.theme}>{toastItem.icon.name}</ThreemaIcon>
              {/if}
            </div>
          {/if}
        </ToastComponent>
      </div>
    {/each}
  </dialog>
</template>

<style lang="scss">
  @use 'component' as *;

  .snackbar {
    // Reset default `dialog` styles
    margin: 0;
    padding: 0;
    border: none;
    background: none;

    // Other styles
    position: absolute;
    height: 100%;
    overflow-y: auto;
    top: 0;
    right: 0;
    left: auto;
    overflow: hidden;
    width: rem(328px);
    pointer-events: none; // TODO(DESK-453): scrollable snackbar

    &::backdrop {
      pointer-events: none;
    }

    .toast-wrapper {
      margin-top: rem(8px);
      padding-right: rem(8px);
      pointer-events: initial;

      .toast-icon {
        display: grid;

        &.color-red {
          color: $alert-red;
        }

        &.color-orange {
          color: $warning-orange;
        }

        &.color-green {
          color: $consumer-green-600;
        }
      }
    }

    .button {
      pointer-events: initial;
    }
  }
</style>
