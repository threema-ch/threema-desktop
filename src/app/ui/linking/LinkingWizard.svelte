<script lang="ts">
  import {type SvelteComponentDev} from 'svelte/internal';

  import {globals} from '~/app/globals';
  import ConfirmEmoji from '~/app/ui/linking/ConfirmEmoji.svelte';
  import Error from '~/app/ui/linking/Error.svelte';
  import Scan from '~/app/ui/linking/Scan.svelte';
  import SuccessLinked from '~/app/ui/linking/SuccessLinked.svelte';

  import {type LinkingParams, type LinkingState, type ProcessStep} from '.';
  import {bytesToHex} from '~/common/utils/byte';

  const log = globals.unwrap().uiLogging.logger(`ui.component.linking-wizard`);

  /**
   * The information needed to lead the user through the linking process.
   */
  export let params: LinkingParams;

  /**
   * The current connection state.
   */
  let linkingState: LinkingState = {
    currentStep: 'scan',
    connectionState: 'connecting',
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
  <div class="wrapper">
    <svelte:component this={wizardStepComponent} {params} {linkingState} />
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
