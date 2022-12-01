<script lang="ts">
  import {createEventDispatcher, onMount} from 'svelte';

  import Text from '#3sc/components/blocks/Input/Text.svelte';
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {type ContextStore} from '~/app/components';
  import {isCspDeviceId, isD2mDeviceId, isIdentityString} from '~/common/network/types';
  import {type u64, ensureU64} from '~/common/types';
  import {type WritableStore} from '~/common/utils/store';

  export let contextStore: WritableStore<ContextStore>;
  const initialContext = contextStore.get();

  const dispatchEvent = createEventDispatcher();
  const identityStringError = 'This Threema ID is not valid';

  let threemaId = initialContext.identity ?? '';
  let threemaIdInput: Text;
  let customSafeUrl = initialContext.customUrl ?? '';
  let d2mDeviceId = isD2mDeviceId(initialContext.d2mDeviceId)
    ? initialContext.d2mDeviceId.toString()
    : '';
  let cspDeviceId = isCspDeviceId(initialContext.cspDeviceId)
    ? initialContext.cspDeviceId.toString()
    : '';
  let showIdentityStringError = false;
  let showAdvancedOptions = false;
  let urlError: string | undefined;

  async function checkThreemaId(event: Event): Promise<void> {
    // Prevent close of this modal dialog
    event.preventDefault();

    const identityString = threemaId;
    if (!isIdentityString(identityString)) {
      showIdentityStringError = true;
      return;
    }

    if (!(await initialContext.isIdentityValid(identityString))) {
      showIdentityStringError = true;
      return;
    }

    contextStore.update((currentValue) => ({
      ...currentValue,
      identity: identityString,
    }));

    dispatchEvent('next');
  }

  function parseDeviceId(value: string): u64 | undefined {
    try {
      const parsedInt = parseInt(value, 10);
      if (parsedInt !== undefined && parsedInt.toString() === value) {
        return ensureU64(BigInt(parsedInt));
      }
    } catch (e) {
      // Into the void
    }
    return undefined;
  }

  function parseUrl(url: string): string | undefined {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:') {
        urlError = 'Please enter a valid URL. https protocol is required.';
        return undefined;
      }

      return parsedUrl.toString();
    } catch (error) {
      urlError = 'Please enter a valid URL.';
      return undefined;
    }
  }

  onMount(() => {
    threemaIdInput.focus();
  });

  $: threemaId = threemaId.toUpperCase();

  $: {
    const parsedCspDeviceId = parseDeviceId(cspDeviceId);
    contextStore.update((currentValue) => ({
      ...currentValue,
      cspDeviceId: isCspDeviceId(parsedCspDeviceId) ? parsedCspDeviceId : undefined,
    }));
  }

  $: {
    const parsedD2mDeviceId = parseDeviceId(d2mDeviceId);
    contextStore.update((currentValue) => ({
      ...currentValue,
      d2mDeviceId: isD2mDeviceId(parsedD2mDeviceId) ? parsedD2mDeviceId : undefined,
    }));
  }

  $: {
    urlError = undefined;
    const parsedUrl = customSafeUrl !== '' ? parseUrl(customSafeUrl) : undefined;
    contextStore.update((currentValue) => ({
      ...currentValue,
      customUrl: parsedUrl,
    }));
  }
</script>

<template>
  <ModalDialog
    visible={true}
    closableWithEscape={false}
    on:confirm={checkThreemaId}
    on:cancel={() => dispatchEvent('prev')}
  >
    <Title slot="header" title="Enter Your Threema ID" />
    <div class="body" slot="body">
      <div class="hint">Your Threema ID is displayed on your mobile device.</div>
      <Text
        error={showIdentityStringError ? identityStringError : undefined}
        bind:this={threemaIdInput}
        label="Threema ID"
        bind:value={threemaId}
        maxlength={8}
        spellcheck={false}
        on:input={() => (showIdentityStringError = false)}
        on:keydown={(event) => {
          if (event.key === 'Enter') {
            void checkThreemaId(event);
          }
        }}
      />
      <div class="advanced">
        <span
          on:click={() => {
            showAdvancedOptions = !showAdvancedOptions;
          }}
        >
          {showAdvancedOptions ? 'Hide' : 'Show'} advanced options
        </span>
      </div>
      <div class="options">
        {#if showAdvancedOptions}
          <Text
            error={urlError}
            label="Custom Threema Safe URL"
            bind:value={customSafeUrl}
            spellcheck={false}
          />
          {#if import.meta.env.DEBUG}
            <Text
              label="D2M Device Id"
              error={d2mDeviceId.length > 0 && $contextStore.d2mDeviceId === undefined
                ? ''
                : undefined}
              bind:value={d2mDeviceId}
              spellcheck={false}
            />
            <Text
              error={cspDeviceId.length > 0 && $contextStore.cspDeviceId === undefined
                ? ''
                : undefined}
              label="CSP Device Id"
              bind:value={cspDeviceId}
              spellcheck={false}
            />
          {/if}
        {/if}
      </div>
    </div>
    <CancelAndConfirm
      slot="footer"
      let:modal
      {modal}
      confirmText="Next"
      cancelText="Back"
      confirmDisabled={threemaId.length !== 8 || showIdentityStringError}
    />
  </ModalDialog>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    width: rem(480px);
    padding: rem(16px) rem(16px) rem(40px) rem(16px);

    display: grid;
    grid-template:
      'hint'
      'input'
      'advanced';
    row-gap: rem(20px);

    .hint {
      color: var(--t-text-e2-color);
    }

    .advanced {
      margin-left: rem(8px);
      span {
        color: $consumer-green-600;
        cursor: pointer;
      }
    }
  }
</style>
