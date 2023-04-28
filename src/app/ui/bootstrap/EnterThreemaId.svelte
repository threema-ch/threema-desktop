<script lang="ts">
  import {createEventDispatcher, onMount} from 'svelte';

  import Password from '#3sc/components/blocks/Input/Password.svelte';
  import Text from '#3sc/components/blocks/Input/Text.svelte';
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {globals} from '~/app/globals';
  import {type ContextStore} from '~/app/ui/bootstrap/process-step';
  import {i18n} from '~/app/ui/i18n';
  import {isCspDeviceId, isD2mDeviceId, isIdentityString} from '~/common/network/types';
  import {ensureU64, type u64} from '~/common/types';
  import {type WritableStore} from '~/common/utils/store';

  const log = globals.unwrap().uiLogging.logger('ui.component.enter-threema-id');

  // Context
  export let contextStore: WritableStore<ContextStore>;
  const initialContext = contextStore.get();

  // Event dispatcher
  const dispatchEvent = createEventDispatcher();

  // Data input holders
  let threemaId = initialContext.identity ?? '';
  let threemaIdInput: Text;
  let customSafeUrl = initialContext.customSafeServer?.url ?? '';
  let customSafeUsername = initialContext.customSafeServer?.auth?.username ?? '';
  let customSafePassword = initialContext.customSafeServer?.auth?.password ?? '';
  let d2mDeviceId = isD2mDeviceId(initialContext.d2mDeviceId)
    ? initialContext.d2mDeviceId.toString()
    : '';
  let cspDeviceId = isCspDeviceId(initialContext.cspDeviceId)
    ? initialContext.cspDeviceId.toString()
    : '';

  // Error messages
  let showIdentityStringError = false;
  let urlError: string | undefined;

  // Advanced options
  let showAdvancedOptions = false;

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
    } catch (error) {
      log.error('Could not parse device id');
    }
    return undefined;
  }

  function parseUrl(url: string): string | undefined {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:') {
        urlError = i18n
          .get()
          .t(
            'dialog--setup-threema-id.error--url-protocol',
            'Please enter a valid URL. https protocol is required.',
          );
        return undefined;
      }

      return parsedUrl.toString();
    } catch (error) {
      const message = i18n
        .get()
        .t('dialog--setup-threema-id.error--url', 'Please enter a valid URL.');

      log.error(message);
      urlError = message;
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

  function updateCustomSafeServer(username: string, password: string): void {
    urlError = undefined;

    const parsedUrl = customSafeUrl !== '' ? parseUrl(customSafeUrl) : undefined;
    const hasUsernamePassword = username !== '' && password !== '';

    let customSafeServer: ContextStore['customSafeServer'] = undefined;
    if (parsedUrl !== undefined) {
      customSafeServer = {
        url: parsedUrl,
        auth: hasUsernamePassword ? {username, password} : undefined,
      };
    }

    contextStore.update((currentValue) => ({
      ...currentValue,
      customSafeServer,
    }));
  }
  $: updateCustomSafeServer(customSafeUsername, customSafePassword);
</script>

<template>
  <ModalDialog
    visible={true}
    closableWithEscape={false}
    on:confirm={checkThreemaId}
    on:cancel={() => dispatchEvent('prev')}
  >
    <Title
      slot="header"
      title={$i18n.t('dialog--setup-threema-id.label--title', 'Enter Your Threema ID')}
    />
    <div class="body" slot="body">
      <div class="hint">
        {$i18n.t(
          'dialog--setup-threema-id.prose--instructions',
          'Your Threema ID is displayed on your mobile device.',
        )}
      </div>
      <Text
        error={showIdentityStringError
          ? $i18n.t('dialog--setup-threema-id.error--invalid-id', 'This Threema ID is not valid')
          : undefined}
        bind:this={threemaIdInput}
        label={$i18n.t('dialog--setup-threema-id.label--threema-id', 'Threema ID')}
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
          on:keydown={(ev) => {
            if (ev.key === 'Enter' || ev.key === 'Space') {
              showAdvancedOptions = !showAdvancedOptions;
            }
          }}
        >
          {showAdvancedOptions
            ? $i18n.t(
                'dialog--setup-threema-id.action--hide-advanced-options',
                'Hide advanced options',
              )
            : $i18n.t(
                'dialog--setup-threema-id.action--show-advanced-options',
                'Show advanced options',
              )}
        </span>
      </div>
      <div class="options">
        {#if showAdvancedOptions}
          <Text
            error={urlError}
            label={$i18n.t(
              'dialog--setup-threema-id.label--custom-threema-safe-url',
              'Custom Threema Safe URL',
            )}
            bind:value={customSafeUrl}
            spellcheck={false}
          />
          <Text
            label={$i18n.t(
              'dialog--setup-threema-id.label--custom-threema-safe-username',
              'Custom Threema Safe Username (Optional)',
            )}
            bind:value={customSafeUsername}
            spellcheck={false}
          />
          <Password
            label={$i18n.t(
              'dialog--setup-threema-id.label--custom-threema-safe-password',
              'Custom Threema Safe Password (Optional)',
            )}
            bind:value={customSafePassword}
          />
          {#if import.meta.env.DEBUG}
            <Text
              label={$i18n.t('dialog--setup-threema-id.label--d2m-device-id', 'D2M Device Id')}
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
              label={$i18n.t('dialog--setup-threema-id.label--csp-device-id', 'CSP Device Id')}
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
      confirmText={$i18n.t('dialog--setup-threema-id.action--confirm', 'Next')}
      cancelText={$i18n.t('dialog--setup-threema-id.action--cancel', 'Back')}
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
