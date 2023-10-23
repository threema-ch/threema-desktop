<script lang="ts">
  import {fly} from 'svelte/transition';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ThreemaIcon from '#3sc/components/blocks/Icon/ThreemaIcon.svelte';
  import ToastComponent from '#3sc/components/generic/Snackbar/Toast.svelte';

  import {snackbarStore, toast} from '.';
</script>

<template>
  <div class="snackbar">
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
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .snackbar {
    z-index: $z-index-alert;
    position: absolute;
    height: 100%;
    overflow-y: auto;
    top: 0;
    right: 0;
    overflow: hidden;
    width: rem(328px);
    pointer-events: none; // TODO(DESK-453): scrollable snackbar

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
