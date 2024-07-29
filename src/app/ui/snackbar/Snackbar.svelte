<script lang="ts">
  import {fly} from 'svelte/transition';

  import {snackbarStore, toast} from '~/app/ui/snackbar';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import ThreemaIcon from '~/app/ui/svelte-components/blocks/Icon/ThreemaIcon.svelte';
  import ToastComponent from '~/app/ui/svelte-components/generic/Snackbar/Toast.svelte';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {TIMER, type TimerCanceller} from '~/common/utils/timer';

  const TRANSITION_TIMEOUT_MS = 800;

  let container: SvelteNullableBinding<HTMLElement> = null;
  let visible: boolean = false;
  let timerCanceller: TimerCanceller | undefined = undefined;

  function handleUpdateSnackbarStore(): void {
    if (!visible && $snackbarStore.length > 0) {
      timerCanceller?.();
      container?.showPopover();
      visible = true;
    } else if (visible && $snackbarStore.length === 0) {
      timerCanceller = TIMER.timeout(() => {
        if (visible && $snackbarStore.length === 0) {
          container?.hidePopover();
          visible = false;
        }
      }, TRANSITION_TIMEOUT_MS);
    }
  }

  $: reactive(handleUpdateSnackbarStore, $snackbarStore);
</script>

<div bind:this={container} class="container" popover="manual">
  {#each $snackbarStore as toastItem (toastItem)}
    <div
      class="toast-wrapper"
      in:fly={{y: -100, duration: TRANSITION_TIMEOUT_MS, opacity: 1}}
      out:fly={{x: 336, duration: TRANSITION_TIMEOUT_MS, opacity: 1}}
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

<style lang="scss">
  @use 'component' as *;

  .container {
    // Reset browser `popover` styles.
    background-color: transparent;
    border: none;

    display: flex;
    flex-direction: column;
    align-items: end;
    justify-content: start;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none; // TODO(DESK-453): Scrollable snackbar.

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
