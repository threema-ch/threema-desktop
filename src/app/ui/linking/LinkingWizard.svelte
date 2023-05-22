<script lang="ts">
  import {type SvelteComponentDev} from 'svelte/internal';

  import {globals} from '~/app/globals';
  import {LinkingWizardState, type LinkingParams} from '~/app/ui/linking';
  import ConfirmEmoji from '~/app/ui/linking/steps/ConfirmEmoji.svelte';
  import Error from '~/app/ui/linking/steps/Error.svelte';
  import Scan from '~/app/ui/linking/steps/Scan.svelte';
  import SetPassword from '~/app/ui/linking/steps/SetPassword.svelte';
  import SuccessLinked from '~/app/ui/linking/steps/SuccessLinked.svelte';
  import Sync from '~/app/ui/linking/steps/Sync.svelte';
  import {LinkingState} from '~/common/dom/backend';
  import {unreachable} from '~/common/utils/assert';

  const log = globals.unwrap().uiLogging.logger(`ui.component.linking-wizard`);

  /**
   * The information needed to lead the user through the linking process.
   */
  export let params: LinkingParams;

  /**
   * The current connection state.
   */
  let linkingWizardState: LinkingWizardState = {
    currentStep: 'scan',
    joinUri: undefined,
  };

  /**
   * Mapping of state steps to the corresponding component.
   */
  const PROCESS_STEPS: {[Key in LinkingWizardState['currentStep']]: typeof SvelteComponentDev} = {
    'scan': Scan,
    'confirm-emoji': ConfirmEmoji,
    'set-password': SetPassword,
    'syncing': Sync,
    'success-linked': SuccessLinked,
    'error': Error,
  };

  let wizardStepComponent: typeof SvelteComponentDev;
  $: wizardStepComponent = PROCESS_STEPS[linkingWizardState.currentStep];

  // Handle backend linking state changes
  params.linkingEvents.subscribe((state: LinkingState) => {
    log.info(`Backend linking state changed to ${state.state}`);
    switch (state.state) {
      case 'initializing':
        // Initial state
        break;
      case 'waiting-for-handshake':
        linkingWizardState = {
          currentStep: 'scan',
          joinUri: state.joinUri,
        };
        break;
      case 'nominated':
        linkingWizardState = {
          currentStep: 'confirm-emoji',
          rph: state.rph,
        };
        break;
      case 'waiting-for-password':
        linkingWizardState = {currentStep: 'set-password'};
        break;
      case 'syncing':
        linkingWizardState = {currentStep: 'syncing'};
        break;
      case 'registered':
        linkingWizardState = {currentStep: 'success-linked'};
        break;
      case 'error':
        linkingWizardState = {
          currentStep: 'error',
          errorType: state.type,
          errorMessage: state.message,
        };
        break;
      default:
        unreachable(state);
    }
  });
</script>

<template>
  <svelte:component
    this={wizardStepComponent}
    {linkingWizardState}
    on:newpassword={({detail: password}) => {
      // TODO(DESK-1038): Pass password to backend
    }}
  />
</template>

<style lang="scss">
  @use 'component' as *;
</style>
