<script lang="ts">
  import {type SvelteComponentDev} from 'svelte/internal';

  import {globals} from '~/app/globals';
  import {type LinkingParams, type LinkingState, type ProcessStep} from '~/app/ui/linking';
  import ConfirmEmoji from '~/app/ui/linking/steps/ConfirmEmoji.svelte';
  import Error from '~/app/ui/linking/steps/Error.svelte';
  import Scan from '~/app/ui/linking/steps/Scan.svelte';
  import SuccessLinked from '~/app/ui/linking/steps/SuccessLinked.svelte';
  import {bytesToHex} from '~/common/utils/byte';

  const log = globals.unwrap().uiLogging.logger(`ui.component.linking-wizard`);

  /**
   * The information needed to lead the user through the linking process.
   */
  export let params: LinkingParams;

  /**
   * The function to run when the `LinkingWizard` has been successfully completed.
   */
  export let onComplete: () => void;

  /**
   * The current connection state.
   */
  let linkingState: LinkingState = {
    connectionState: 'connecting',
    currentStep: 'scan',
  };

  /**
   * Mapping of process steps to the corresponding component.
   */
  const PROCESS_STEPS: {[Key in ProcessStep]: typeof SvelteComponentDev} = {
    scan: Scan,
    confirmEmoji: ConfirmEmoji,
    successLinked: SuccessLinked,
    error: Error,
  };

  let wizardStepComponent: typeof SvelteComponentDev;
  $: wizardStepComponent = PROCESS_STEPS[linkingState.currentStep];

  // Handle connection events
  params.connected
    .then(() => {
      if (linkingState.connectionState !== 'nominated') {
        log.info('Connected, waiting for handshake');
        linkingState = {
          ...linkingState,
          connectionState: 'waiting-for-handshake',
          currentStep: 'scan',
        };
      }
    })
    .catch((error) => {
      log.error(`Connection error: ${error}`);
      linkingState = {
        ...linkingState,
        connectionState: 'failed',
        currentStep: 'error',
      };
    });

  // Handle nomination events
  params.nominated
    .then((rendzevousPathHash) => {
      log.info('Nominated, waiting for confirmation');
      log.info(`Rendezvous path hash: ${bytesToHex(rendzevousPathHash)}`);
      linkingState = {
        ...linkingState,
        connectionState: 'nominated',
        currentStep: 'confirmEmoji',
        rendzevousPathHash,
      };
    })
    .catch((error) => {
      log.error(`Nomination failed: ${error}`);
      linkingState = {
        ...linkingState,
        connectionState: 'failed',
        currentStep: 'error',
      };
    });
</script>

<template>
  <svelte:component this={wizardStepComponent} {params} {linkingState} on:confirm={onComplete} />
</template>

<style lang="scss">
  @use 'component' as *;
</style>
