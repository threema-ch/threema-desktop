<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import type {AnyToastAction} from '.';

  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';

  export let text: string;

  export let action: AnyToastAction | undefined;

  const dispatch = createEventDispatcher();

  let clickHandler: () => void;
  $: {
    switch (action?.type) {
      case 'action':
        clickHandler = (): void => {
          if (action?.type === 'action') {
            action.callback(() => dispatch('close'));
          }
        };
        break;

      case 'dismissible':
        clickHandler = (): void => {
          dispatch('close');
        };
        break;

      default:
        clickHandler = () => {
          // Into the void :]
        };
        break;
    }
  }
</script>

<template>
  <div class="toast" data-icon={$$slots.default} data-action={action !== undefined}>
    {#if $$slots.default}
      <div class="icon">
        <slot />
      </div>
    {/if}
    <div class="content">
      {text}
    </div>
    {#if action !== undefined}
      <div class="action" data-type={action.type}>
        {#if action.type === 'dismissible'}
          <IconButton flavor="naked" on:click={clickHandler}>
            <MdIcon theme="Filled">close</MdIcon>
          </IconButton>
        {:else}
          <Button flavor="naked" on:click={clickHandler}>{action.text}</Button>
        {/if}
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .toast {
    display: grid;
    grid-template: 'content' / auto;
    border-radius: var(--c-snackbar-toast-border-radius);
    background-color: var(--c-snackbar-toast-background-color);
    color: var(--c-snackbar-toast-color);
    box-shadow: var(--c-snackbar-toast-box-shadow);

    .content {
      grid-area: content;
      padding: em(10px) em(16px);
    }

    .icon {
      grid-area: icon;
      padding: em(8px);
      align-self: start;
      --c-icon-font-size: var(--c-snackbar-toast-icon-font-size);
      display: grid;
    }

    .action {
      grid-area: action;
      display: grid;

      &[data-type='dismissible'] {
        align-self: start;
        --c-icon-button-naked-icon-color: var(--c-snackbar-toast-color);
      }

      &[data-type='action'] {
        align-self: end;
        color: var(--c-snackbar-toast-action-color);
      }
    }

    &[data-action='true'] {
      grid-template: 'content action' / auto min-content;
    }

    &[data-icon='true'] {
      grid-template: 'icon content' / min-content auto;

      .content {
        padding: em(10px) em(16px) em(10px) 0;
      }

      &[data-action='true'] {
        grid-template: 'icon content action' / min-content auto min-content;
      }
    }
  }
</style>
