<script lang="ts">
  import {type SvelteComponentDev} from 'svelte/internal';

  import {isLinkingCode} from '~/app/ui/bootstrap';
  import BootstrapWelcome from '~/app/ui/bootstrap/BootstrapWelcome.svelte';
  import EnterLinkingCode from '~/app/ui/bootstrap/EnterLinkingCode.svelte';
  import EnterNewPassword from '~/app/ui/bootstrap/EnterNewPassword.svelte';
  import EnterThreemaId from '~/app/ui/bootstrap/EnterThreemaId.svelte';
  import {
    type BootstrapParams,
    type ContextStore,
    type ProcessStep,
  } from '~/app/ui/bootstrap/process-step';
  import SuccessLinked from '~/app/ui/bootstrap/SuccessLinked.svelte';
  import {randomU64} from '~/common/crypto/random';
  import {type InitialBootstrapData} from '~/common/dom/backend/controller';
  import {randomBytes} from '~/common/dom/crypto/random';
  import {ensureCspDeviceId, ensureD2mDeviceId, isIdentityString} from '~/common/network/types';
  import {ResolvablePromise} from '~/common/utils/resolvable-promise';
  import {WritableStore} from '~/common/utils/store';

  /**
   * The information needed to lead the user through the bootstrap process.
   */
  export let params: BootstrapParams;

  const PROCESS_STEPS: {[Key in ProcessStep]: typeof SvelteComponentDev} = {
    welcome: BootstrapWelcome,
    enterThreemaId: EnterThreemaId,
    enterLinkingCode: EnterLinkingCode,
    enterNewPassword: EnterNewPassword,
    successLinked: SuccessLinked,
  };

  let currentStep =
    params.currentIdentity !== undefined ? PROCESS_STEPS.enterLinkingCode : PROCESS_STEPS.welcome;

  const contextStore = new WritableStore<ContextStore>({
    isIdentityValid: params.isIdentityValid,
    isSafeBackupAvailable: params.isSafeBackupAvailable,
    identity: params.currentIdentity,
    error: params.error,
    linkingCode: undefined,
    linkingCodeParts: ['', '', '', ''],
    customSafeServer: undefined,
    cspDeviceId: undefined,
    d2mDeviceId: undefined,
    newPassword: undefined,
  });

  /**
   * A promise that can be awaited. It will resolve to {@link InitialBootstrapData} once the user
   * has successfully completed the linking process.
   */
  export const initialBootstrapData: ResolvablePromise<InitialBootstrapData> =
    new ResolvablePromise();

  function nextStep(): void {
    switch (currentStep) {
      case PROCESS_STEPS.welcome:
        currentStep = PROCESS_STEPS.enterThreemaId;
        break;

      case PROCESS_STEPS.enterThreemaId:
        currentStep = PROCESS_STEPS.enterLinkingCode;
        break;

      case PROCESS_STEPS.enterLinkingCode:
        currentStep = PROCESS_STEPS.enterNewPassword;
        break;

      case PROCESS_STEPS.enterNewPassword: {
        const currentStorageValues = contextStore.get();
        const currentIdentity = currentStorageValues.identity;
        const currentLinkingCode = currentStorageValues.linkingCode;
        const currentNewPassword = currentStorageValues.newPassword;

        if (
          !isIdentityString(currentIdentity) ||
          !isLinkingCode(currentLinkingCode) ||
          currentNewPassword === undefined
        ) {
          return;
        }

        const d2mDeviceId =
          currentStorageValues.d2mDeviceId ?? ensureD2mDeviceId(randomU64({randomBytes}));
        const cspDeviceId =
          currentStorageValues.cspDeviceId ?? ensureCspDeviceId(randomU64({randomBytes}));

        initialBootstrapData.resolve({
          identity: currentIdentity,
          password: currentLinkingCode,
          customSafeServer: currentStorageValues.customSafeServer,
          d2mDeviceId,
          cspDeviceId,
          newPassword: currentNewPassword,
        });
        break;
      }

      default:
        break;
    }
  }

  function prevStep(): void {
    switch (currentStep) {
      case PROCESS_STEPS.enterThreemaId:
        currentStep = PROCESS_STEPS.welcome;
        break;

      case PROCESS_STEPS.enterLinkingCode:
        currentStep = PROCESS_STEPS.enterThreemaId;
        break;

      case PROCESS_STEPS.enterNewPassword:
        currentStep = PROCESS_STEPS.enterLinkingCode;
        break;

      default:
        break;
    }
  }
</script>

<template>
  <div class="wrapper">
    <svelte:component this={currentStep} on:next={nextStep} on:prev={prevStep} {contextStore} />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .wrapper {
    height: 100vh;
    display: grid;
    grid-template: 'app' min-content;
    place-content: center;
    color: var(--t-text-e1-color);
    background-color: var(--t-pairing-background-color);
  }
</style>
