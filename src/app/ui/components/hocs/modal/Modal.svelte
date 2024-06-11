<!--
  @component 
  Renders the given content in a full-screen modal overlay. Note: Uses a `Portal` to be
  rendered outside of its current tree as a child of the main `#container`.
-->
<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
  import type {ButtonState} from '~/app/ui/components/hocs/modal/types';
  import Portal from '~/app/ui/components/hocs/portal/Portal.svelte';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';

  const hotkeyManager = globals.unwrap().hotkeyManager;

  const log = globals.unwrap().uiLogging.logger('ui.component.modal');

  type $$Props = ModalProps;

  export let actionsElement: $$Props['actionsElement'] = undefined;
  export let element: $$Props['element'] = undefined;
  export let options: NonNullable<$$Props['options']> = {};
  export let wrapper: $$Props['wrapper'];

  const target: HTMLElement | null = document.body.querySelector('#container');

  let closed = false;
  let buttonStates: ButtonState[] | undefined = undefined;

  const dispatch = createEventDispatcher<{
    open: undefined;
    close: undefined;
    submit: undefined;
  }>();

  /**
   * Close the modal.
   */
  export function close(): void {
    closeDialog(element);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }

    if ((options.allowClosingWithEsc ?? true) && event.key === 'Escape') {
      closeDialog(element);
    }

    // If a button is focused, its functionality overrides onEnterSubmit.
    if (event.key === 'Enter' && buttonStates?.some((state) => state.isFocused) === true) {
      return;
    }

    if (options.allowSubmittingWithEnter === true && event.key === 'Enter') {
      // Prohibit the Enter button to trigger anything that is beneath the modal.
      event.preventDefault();

      dispatch('submit');
    }
  }

  function handleCloseEvent(): void {
    closed = true;
    dispatch('close');
  }

  function handleClickClose(): void {
    closeDialog(element);
  }

  function handleClickSubmit(): void {
    dispatch('submit');
  }

  function handleClosedStateChange(isClosed: boolean): void {
    if (!(options.suspendHotkeysWhenVisible ?? true)) {
      return;
    }

    if (isClosed) {
      hotkeyManager.resume();
      window.removeEventListener('keydown', handleKeydown);
    } else {
      hotkeyManager.suspend();
      window.addEventListener('keydown', handleKeydown);
    }
  }

  function handleChangeButtonFocus(focused: boolean, index: u53): void {
    if (buttonStates?.[index] !== undefined) {
      buttonStates[index] = {isFocused: focused};
      return;
    }
    log.error('Cannot set focus because there is a mismatch in number of Buttons and ButtonStates');
  }

  function openDialog(dialog: typeof element): void {
    if (dialog instanceof HTMLDialogElement) {
      if (!dialog.open) {
        // TODO(DESK-1215): Move to `showModal` to benefit from browser modal defaults. This is
        // currently not used to avoid issues with the snackbar and system dialogs.
        dialog.show();
        closed = false;
        dispatch('open');
      }
    }
  }

  function closeDialog(dialog: typeof element): void {
    if (dialog instanceof HTMLDialogElement) {
      if (dialog.open) {
        dialog.close();
        closed = true;
        dispatch('close');
      }
    }
  }

  $: if (wrapper.type === 'card') {
    buttonStates = wrapper.buttons?.map((button) => ({isFocused: button.isFocused === true}));
  }

  $: handleClosedStateChange(closed);

  onMount(() => {
    openDialog(element);
  });

  onDestroy(() => {
    closeDialog(element);
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if !closed}
  <Portal {target}>
    <dialog bind:this={element} class="modal" on:close={handleCloseEvent}>
      <div class={`wrapper type-${wrapper.type}`} class:padded={wrapper.type === 'card'}>
        {#if wrapper.type === 'none'}
          {@const {actions = []} = wrapper}

          {#if actions.length > 0}
            <div bind:this={actionsElement} class="actions">
              {#each actions as action}
                <IconButton
                  flavor="naked"
                  on:click={action.onClick === 'close' ? handleClickClose : action.onClick}
                >
                  <MdIcon theme="Outlined">{action.iconName}</MdIcon>
                </IconButton>
              {/each}
            </div>
          {/if}

          <slot />
        {:else if wrapper.type === 'card'}
          {@const {
            actions = [],
            buttons = [],
            elevated = true,
            minWidth = 320,
            maxWidth,
            title,
          } = wrapper}

          <div
            class="card"
            class:elevated
            style={`--c-t-min-width: ${minWidth}px; ${maxWidth === undefined ? '--c-t-max-width: 100%;' : `--c-t-max-width: ${maxWidth}px;`}`}
          >
            {#if title !== undefined || actions.length > 0}
              <div class="header">
                {#if title !== undefined}
                  <div class="title">{title}</div>
                {/if}

                {#if actions.length > 0}
                  <div bind:this={actionsElement} class="actions">
                    {#each actions as action}
                      <IconButton
                        flavor="naked"
                        on:click={action.onClick === 'close' ? handleClickClose : action.onClick}
                      >
                        <MdIcon theme="Outlined">{action.iconName}</MdIcon>
                      </IconButton>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            <div class="content">
              <slot />
            </div>

            {#if buttons.length > 0}
              <div class="footer">
                {#each buttons as button, index}
                  <Button
                    on:elementReady={(event) => {
                      if (button.isFocused === true) {
                        event.detail.element.focus();
                      }
                    }}
                    flavor={button.type}
                    disabled={button.disabled}
                    on:focus={() => handleChangeButtonFocus(true, index)}
                    on:blur={() => handleChangeButtonFocus(false, index)}
                    on:click={() => {
                      if (button.onClick === 'close') {
                        handleClickClose();
                      } else if (button.onClick === 'submit') {
                        handleClickSubmit();
                      } else if (button.onClick !== undefined) {
                        button.onClick();
                      }
                    }}>{button.label}</Button
                  >
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          {unreachable(wrapper)}
        {/if}
      </div>
    </dialog>
  </Portal>
{/if}

<style lang="scss">
  @use 'component' as *;

  $-vars: (min-width, max-width);
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  .modal {
    margin: 0;
    padding: 0;
    border: none;
    color: var(--t-text-e1-color);
    background: transparent;

    max-width: 100vw;
    width: 100vw;
    max-height: 100vh;
    height: 100vh;

    // Temporary properties to mimic a modal.
    position: absolute;
    z-index: $z-index-modal;
    top: 0;
    left: 0;
    background-color: var(--cc-modal-dialog-background-color);
    overflow: hidden;

    .wrapper {
      display: flex;
      align-items: center;
      justify-content: center;

      width: 100%;
      height: 100%;

      &.padded {
        padding: rem(20px);
      }

      .actions {
        display: flex;
        align-items: center;
        justify-content: right;
        gap: rem(8px);
      }

      &.type-none {
        .actions {
          position: absolute;
          display: flex;
          gap: rem(8px);
          z-index: calc($z-index-modal + $z-index-plus);
          top: rem(12px);
          right: rem(8px);

          &::before {
            content: '';
            z-index: $z-index-minus;
            pointer-events: none;
            display: block;
            position: absolute;
            width: calc(100% + rem(256px));
            height: calc(100% + rem(128px));
            top: rem(-12px);
            right: rem(-8px);
            background: radial-gradient(
              farthest-corner at top right,
              rgba(var(--cc-modal-dialog-background-color-rgb-triplet), 0.625) 0%,
              rgba(var(--cc-modal-dialog-background-color-rgb-triplet), 0.375) 18.75%,
              rgba(var(--cc-modal-dialog-background-color-rgb-triplet), 0.0625) 50%,
              rgba(var(--cc-modal-dialog-background-color-rgb-triplet), 0) 62.5%
            );
          }
        }
      }

      &.type-card {
        .card {
          display: flex;
          flex-direction: column;
          overflow: hidden;

          border: none;
          border-radius: rem(8px);

          min-width: var($-temp-vars, --c-t-min-width);
          max-width: min(var($-temp-vars, --c-t-max-width), 100%);
          width: 100%;

          min-height: auto;
          max-height: 100%;
          height: fit-content;

          background-color: var(--c-modal-dialog-background-color);

          &.elevated {
            @extend %elevation-160;
          }

          .header {
            padding: rem(16px);
            display: flex;
            gap: rem(16px);
            align-items: center;
            justify-content: space-between;

            &:not(:has(.title)) {
              justify-content: end;
            }

            .title {
              @extend %font-large-400;
            }
          }

          .content {
            position: relative;
            flex: 1;
            min-width: 0;
            min-height: 0;
            max-width: 100%;
            max-height: 100%;
            overflow: auto;
          }

          .footer {
            display: flex;
            align-items: center;
            justify-content: end;
            gap: rem(8px);
            padding: rem(16px);
          }
        }
      }
    }
  }
</style>
