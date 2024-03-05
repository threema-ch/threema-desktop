<script lang="ts">
  import {onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import type {
    LinkingParams,
    LinkingWizardConfirmEmojiProps,
    LinkingWizardErrorProps,
    LinkingWizardScanProps,
    LinkingWizardSetPasswordProps,
    LinkingWizardSuccessProps,
    LinkingWizardSyncingProps,
  } from '~/app/ui/linking';
  import ConfirmEmoji from '~/app/ui/linking/steps/ConfirmEmoji.svelte';
  import Error from '~/app/ui/linking/steps/Error.svelte';
  import Scan from '~/app/ui/linking/steps/Scan.svelte';
  import SetPassword from '~/app/ui/linking/steps/SetPassword.svelte';
  import SuccessLinked from '~/app/ui/linking/steps/SuccessLinked.svelte';
  import Sync from '~/app/ui/linking/steps/Sync.svelte';
  import type {LinkingState} from '~/common/dom/backend';
  import {unreachable} from '~/common/utils/assert';

  const log = globals.unwrap().uiLogging.logger(`ui.component.linking-wizard`);

  /**
   * The information needed to lead the user through the linking process.
   */
  export let params: LinkingParams;

  /**
   * A mapping of linking wizard components to their respective component prop types.
   */
  type LinkingWizardState =
    | {
        component: 'scan';
        props: LinkingWizardScanProps;
      }
    | {
        component: 'confirmEmoji';
        props: LinkingWizardConfirmEmojiProps;
      }
    | {
        component: 'setPassword';
        props: LinkingWizardSetPasswordProps;
      }
    | {
        component: 'sync';
        props: LinkingWizardSyncingProps;
      }
    | {
        component: 'successLinked';
        props: LinkingWizardSuccessProps;
      }
    | {
        component: 'error';
        props: LinkingWizardErrorProps;
      };

  /**
   * The state of the current step.
   */
  let linkingWizardState: LinkingWizardState = {
    component: 'scan',
    props: {
      joinUri: undefined,
    },
  };

  // Handle backend linking state changes
  onMount(() =>
    params.linkingState.subscribe((state: LinkingState) => {
      log.info(`Backend linking state changed to ${state.state}`);
      switch (state.state) {
        case 'initializing':
          // Initial state
          break;
        case 'waiting-for-handshake':
          linkingWizardState = {
            component: 'scan',
            props: {
              joinUri: state.joinUri,
            },
          };
          break;
        case 'nominated':
          linkingWizardState = {
            component: 'confirmEmoji',
            props: {
              rph: state.rph,
            },
          };
          break;
        case 'waiting-for-password':
          linkingWizardState = {
            component: 'setPassword',
            props: {
              userPassword: params.userPassword,
            },
          };
          break;
        case 'syncing':
          linkingWizardState = {
            component: 'sync',
            props: {
              phase: state.phase,
            },
          };
          break;
        case 'registered':
          linkingWizardState = {
            component: 'successLinked',
            props: {
              identityReady: params.identityReady,
            },
          };
          break;
        case 'error':
          linkingWizardState = {
            component: 'error',
            props: {
              errorType: state.type,
              errorMessage: state.message,
            },
          };
          break;
        default:
          unreachable(state);
      }
    }),
  );
</script>

<template>
  {#if linkingWizardState.component === 'scan'}
    <Scan {...linkingWizardState.props} />
  {:else if linkingWizardState.component === 'confirmEmoji'}
    <ConfirmEmoji {...linkingWizardState.props} />
  {:else if linkingWizardState.component === 'setPassword'}
    <SetPassword {...linkingWizardState.props} />
  {:else if linkingWizardState.component === 'sync'}
    <Sync {...linkingWizardState.props} />
  {:else if linkingWizardState.component === 'successLinked'}
    <SuccessLinked {...linkingWizardState.props} />
  {:else if linkingWizardState.component === 'error'}
    <Error {...linkingWizardState.props} />
  {:else}
    {unreachable(linkingWizardState)}
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;
</style>
