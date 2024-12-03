<script lang="ts">
  import {createEventDispatcher, onDestroy} from 'svelte';

  import GlobalOverlay from '~/app/ui/svelte-components/blocks/GlobalOverlay/GlobalOverlay.svelte';
  import type {EventName, Modal} from '~/app/ui/svelte-components/blocks/ModalDialog';

  /**
   * Determine if the modal is visible.
   */
  export let visible = false;

  /**
   * Determine if the modal is cancelable via esc keydown event.
   */
  export let closableWithEscape = true;

  /**
   * Whether the modal should be styled as elevated.
   */
  export let elevated = true;

  /**
   * Determine if the modal is scrollable.
   */
  export let scrollable = true;

  // Create event dispatcher.
  const dispatch = createEventDispatcher<{
    clickoutside: undefined;
    close: undefined;
    cancel: undefined;
    confirm: undefined;
  }>();

  function dispatchEvent(eventName: EventName): void {
    const shouldContinue = dispatch(eventName, undefined, {cancelable: true});
    if (shouldContinue) {
      visible = false;
    }
  }

  const modal: Modal = {
    clickoutside: (): void => {
      dispatch('clickoutside');
    },
    close: (): void => {
      dispatchEvent('close');
    },
    cancel: (): void => {
      dispatchEvent('cancel');
    },
    confirm: (): void => {
      dispatchEvent('confirm');
    },
  };

  function handleKeydown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }

    if (closableWithEscape && event.key === 'Escape') {
      dispatchEvent('close');
    }
  }

  $: if (visible) {
    window.addEventListener('keydown', handleKeydown);
  } else {
    window.removeEventListener('keydown', handleKeydown);
  }

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<template>
  {#if visible}
    <div class="modal-wrapper">
      <GlobalOverlay on:overlayClick={modal.clickoutside}>
        <div class="modal" class:elevated>
          <div class="header">
            <slot name="header" {modal} />
          </div>
          <div class={scrollable ? 'scrollable' : ''}>
            <slot name="body" {modal} />
          </div>
          <div class="footer">
            <slot name="footer" {modal} />
          </div>
        </div>
      </GlobalOverlay>
    </div>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  $defaultPadding: 20px;

  .modal-wrapper {
    display: grid;
    place-content: center;
    position: fixed;
    z-index: $z-index-modal;
    top: 0px;
    left: 0px;
    bottom: 0px;
    right: 0px;
    padding: var(--c-modal-dialog-padding, $defaultPadding);

    .modal {
      border-radius: rem(8px);
      background-color: var(--c-modal-dialog-background-color, default);
      display: grid;
      grid-template:
        'header' auto
        'body' 1fr
        'footer' auto
        / auto;
      max-height: calc(100vh - calc(2 * var(--c-modal-dialog-padding, $defaultPadding)));

      &.elevated {
        @extend %elevation-160;
      }

      .scrollable {
        overflow-y: auto;
      }
    }
  }
</style>
