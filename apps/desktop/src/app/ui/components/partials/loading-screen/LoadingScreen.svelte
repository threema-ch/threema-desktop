<script lang="ts">
  import {clamp} from '@threema/ts-utils/integer/clamp';
  import type {u53} from '@threema/ts-utils/integer/u53';
  import {ResolvablePromise} from '@threema/ts-utils/promise/resolvable-promise';
  import {TIMER} from '@threema/ts-utils/timer/global-timer';

  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {LoadingScreenProps} from '~/app/ui/components/partials/loading-screen/props';
  import Logo from '~/app/ui/components/partials/logo/Logo.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {LoadingState} from '~/common/dom/backend';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';

  const {uiLogging} = globals.unwrap();
  const {loadingState}: LoadingScreenProps = $props();

  export const finishedLoading = new ResolvablePromise<void>({uncaught: 'default'});
  export const cancelledLoading = new ResolvablePromise<void>({uncaught: 'default'});
  const log = uiLogging.logger('ui.component.loading-screen');

  let progress = $state<u53 | undefined>(undefined);

  function handleCompleteAnimation(): void {
    // Wait for a short time, so that the loading indicator doesn't disappear immediately.
    TIMER.sleep(750)
      .finally(() => {
        finishedLoading.resolve();
      })
      .catch(assertUnreachable);
  }

  function handleUpdateLoadingState(value: LoadingState): void {
    log.debug(`Updating loadingState to ${value.state}`);
    switch (value.state) {
      case 'pending':
      case 'initializing':
        progress = undefined;
        break;

      case 'cancelled':
        progress = undefined;
        cancelledLoading.resolve();
        break;

      case 'processing-reflection-queue': {
        if (value.reflectionQueueLength === 0) {
          progress = undefined;
          return;
        }
        // TODO(DESK-2164): Test in vitest/storybook as component test.
        progress = clamp(value.reflectionQueueProcessed / value.reflectionQueueLength, {
          min: 0,
          max: 1,
        });
        break;
      }

      case 'ready':
        if (progress === undefined) {
          // If there was no progress indicator, the loading screen can be closed directly.
          finishedLoading.resolve();
          return;
        }
        // Set `progress` to `1` to trigger the animation, just in case (if it wasn't already).
        progress = 1;
        break;

      default:
        unreachable(value);
    }
  }

  $effect(() => {
    handleUpdateLoadingState($loadingState);
  });
</script>

<div class="container" data-build-platform={import.meta.env.BUILD_PLATFORM}>
  {#if progress !== undefined}
    <div class="indicator">
      <Logo animated={true} oncompletion={handleCompleteAnimation} {progress} />
    </div>

    <Text
      alignment="center"
      color="mono-low"
      size="body"
      text={$i18n.t('status.prose--startup-processing-reflection-queue', 'Syncing messages...')}
      wrap={false}
    />
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: rem(10px);

    color: var(--t-text-e1-color);
    background-color: var(--t-main-background-color);
    height: 100vh;

    .indicator {
      width: rem(96px);
      height: rem(121px);
    }

    &[data-build-platform='macos'] {
      &::before {
        position: absolute;
        content: '';
        left: 0;
        right: 0;
        top: 0;
        height: rem(64px);

        // Use as drag area for the Electron window.
        -webkit-app-region: drag;
      }
    }
  }
</style>
