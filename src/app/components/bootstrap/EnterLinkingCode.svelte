<script lang="ts">
  import {createEventDispatcher, onMount} from 'svelte';

  import Text from '#3sc/components/blocks/Input/Text.svelte';
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {type ContextStore} from '~/app/components';
  import {isLinkingCode} from '~/app/components/bootstrap';
  import {type SafeCredentials} from '~/common/dom/safe';
  import {type u53} from '~/common/types';
  import {type WritableStore} from '~/common/utils/store';

  /**
   * This store holds the linking context across multiple instances of the bootstrap component.
   */
  export let contextStore: WritableStore<ContextStore>;

  const initialContext = contextStore.get();

  const dispatchEvent = createEventDispatcher();

  let inputOne: Text;
  let inputTwo: Text;
  let inputThree: Text;
  let inputFour: Text;

  const initialParts = initialContext.linkingCodeParts;

  let partOne = initialParts[0];
  let partTwo = initialParts[1];
  let partThree = initialParts[2];
  let partFour = initialParts[3];

  let currentLinkingCode = `${partOne}${partTwo}${partThree}${partFour}`;

  let showCodeError = false;
  let isValidLinkingCodeFormat = false;
  let isLinkingCodeBeingValidated = false;

  function submitLinkingCode(event: Event): void {
    event.preventDefault();

    if (isLinkingCodeBeingValidated) {
      return;
    }

    isLinkingCodeBeingValidated = true;
    setTimeout(performLinkingCodeValidation, 0);
  }

  /**
   * Validate the entered linking code and update the {@link contextStore}.
   * If the linking code is valid, dispatch the 'next' event.
   */
  async function performLinkingCodeValidation(): Promise<void> {
    if (initialContext.identity === undefined) {
      dispatchEvent('prev');
      return;
    }

    const linkingCode = isLinkingCode(currentLinkingCode) ? currentLinkingCode : undefined;

    contextStore.update((currentValue) => ({
      ...currentValue,
      linkingCode,
    }));

    if (linkingCode === undefined) {
      showCodeError = true;
      return;
    }

    const currentSafeCredentials: SafeCredentials = {
      identity: initialContext.identity,
      password: linkingCode,
      customSafeServer: initialContext.customSafeServer,
    };

    const isValidLinkingCode = await initialContext.isSafeBackupAvailable(currentSafeCredentials);

    if (!isValidLinkingCode) {
      showCodeError = true;
      return;
    }

    dispatchEvent('next');
  }

  /**
   * Clean up the user input by removing all characters except for uppercase letters and digits.
   */
  function cleanupUserInput(inputString: string): string {
    return inputString.toUpperCase().replace(/[^0-9A-Z]/u, '');
  }

  let inputLength = 0;

  /**
   * This function is invoked on every "input"-event on one of the four code input fields.
   *
   * @param event The input event
   * @param nextInput The next input field (if any)
   */
  function handleCodeInput(event: Event, nextInput?: Text): void {
    showCodeError = false;
    isLinkingCodeBeingValidated = false;

    contextStore.update((currentStoreValue) => ({
      ...currentStoreValue,
      errorMessage: undefined,
    }));

    const source = event.target as HTMLInputElement;
    const previousLength = inputLength;
    const currentLength = cleanupUserInput(source.value).length;
    inputLength = currentLength;
    if (currentLength === 4 && nextInput !== undefined) {
      if (currentLength > previousLength || (currentLength === 4 && previousLength === 4)) {
        nextInput.focus();
      }
    }
  }

  function handleBackspace(event: KeyboardEvent, inputIndex: u53, prevInput: Text): void {
    const source = event.target as HTMLInputElement;
    const currentLength = cleanupUserInput(source.value).length;
    if (currentLength === 0) {
      prevInput.focus();
      switch (inputIndex) {
        case 1:
          partOne = partOne.substring(0, partOne.length - 1);
          break;
        case 2:
          partTwo = partTwo.substring(0, partTwo.length - 1);
          break;
        case 3:
          partThree = partThree.substring(0, partThree.length - 1);
          break;
        default: // Ignore
      }
    }
  }

  /**
   * Handle pasting in first input element.
   */
  function handlePaste(ev: ClipboardEvent): void {
    // If no clipboard data is available, do nothing
    if (ev.clipboardData === null) {
      return;
    }

    // Only process if all four input boxes are empty
    if (currentLinkingCode.length !== 0) {
      return;
    }

    // Get text data from clipboard
    const items: DataTransferItemList = ev.clipboardData.items;
    let textItem: DataTransferItem | undefined;
    // Note: Unfortunately `DataTransferItemList` not implement iterator, so for-of is not possible
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'string' && item.type === 'text/plain') {
        textItem = item;
        break;
      }
    }
    if (textItem === undefined) {
      return;
    }
    const text = ev.clipboardData.getData('text/plain').toUpperCase();

    // Paste, if valid!
    if (isLinkingCode(text)) {
      ev.preventDefault();
      partOne = text.substring(0, 4);
      partTwo = text.substring(4, 8);
      partThree = text.substring(8, 12);
      partFour = text.substring(12, 16);
      inputFour.focus();
    }
  }

  $: {
    partOne = cleanupUserInput(partOne);
    partTwo = cleanupUserInput(partTwo);
    partThree = cleanupUserInput(partThree);
    partFour = cleanupUserInput(partFour);

    contextStore.update((currentValue) => ({
      ...currentValue,
      linkingCodeParts: [partOne, partTwo, partThree, partFour],
    }));

    currentLinkingCode = `${partOne}${partTwo}${partThree}${partFour}`;
    isValidLinkingCodeFormat = isLinkingCode(currentLinkingCode);
  }

  onMount(() => {
    inputOne.focus();
  });
</script>

<template>
  <ModalDialog
    visible={true}
    closableWithEscape={false}
    on:confirm={submitLinkingCode}
    on:cancel={() => dispatchEvent('prev')}
  >
    <Title slot="header" title="Enter Linking Code" />
    <div class="body" slot="body">
      <div class="hint">Your Linking Code is displayed on your mobile device.</div>
      <div class="code-parts">
        <Text
          error={showCodeError ? '' : undefined}
          bind:this={inputOne}
          bind:value={partOne}
          spellcheck={false}
          on:paste={handlePaste}
          on:input={(event) => handleCodeInput(event, inputTwo)}
          on:keydown={(event) => {
            if (event.key === 'Enter') {
              inputTwo.focus();
            }
          }}
          maxlength={4}
        />
        <Text
          error={showCodeError ? '' : undefined}
          bind:this={inputTwo}
          bind:value={partTwo}
          spellcheck={false}
          on:input={(event) => handleCodeInput(event, inputThree)}
          on:keydown={(event) => {
            if (event.key === 'Enter') {
              inputThree.focus();
            } else if (event.key === 'Backspace') {
              handleBackspace(event, 1, inputOne);
            }
          }}
          maxlength={4}
        />
        <Text
          error={showCodeError ? '' : undefined}
          bind:this={inputThree}
          bind:value={partThree}
          spellcheck={false}
          on:input={(event) => handleCodeInput(event, inputFour)}
          on:keydown={(event) => {
            if (event.key === 'Enter') {
              inputFour.focus();
            } else if (event.key === 'Backspace') {
              handleBackspace(event, 2, inputTwo);
            }
          }}
          maxlength={4}
        />
        <Text
          error={showCodeError ? '' : undefined}
          bind:this={inputFour}
          bind:value={partFour}
          spellcheck={false}
          on:input={(event) => handleCodeInput(event)}
          on:keydown={(event) => {
            if (event.key === 'Enter') {
              submitLinkingCode(event);
            } else if (event.key === 'Backspace') {
              handleBackspace(event, 3, inputThree);
            }
          }}
          maxlength={4}
        />
      </div>
      {#if showCodeError}
        {#if initialContext.customSafeServer === undefined}
          <div class="error">Please enter a valid link code.</div>
        {:else}
          <div class="error">
            Please enter a valid link code and ensure that your custom Safe server credentials and
            configuration (including CORS) are correct.
          </div>
        {/if}
      {:else if $contextStore.error !== undefined}
        <div class="error">
          <div>{$contextStore.error.message}</div>
          <div class="error-details">Technical Details: {$contextStore.error.details}</div>
        </div>
      {/if}
    </div>
    <CancelAndConfirm
      slot="footer"
      let:modal
      {modal}
      confirmText="Next"
      cancelText="Back"
      confirmDisabled={!isValidLinkingCodeFormat || showCodeError || isLinkingCodeBeingValidated}
    />
  </ModalDialog>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    width: rem(480px);
    padding: rem(16px) rem(16px) rem(20px) rem(16px);

    display: grid;
    grid-template:
      'hint'
      'code-parts'
      'error';
    row-gap: rem(20px);

    .hint {
      color: var(--t-text-e2-color);
    }

    .code-parts {
      grid-area: code-parts;
      display: grid;
      grid-template:
        '1 2 3 4' /
        1fr 1fr 1fr 1fr;
      column-gap: rem(8px);

      --c-input-text-input-text-align: center;
      --c-input-text-input-letter-spacing: #{rem(5px)};
    }

    .error {
      color: $alert-red;
    }

    .error-details {
      @extend %font-small-400;
    }
  }
</style>
