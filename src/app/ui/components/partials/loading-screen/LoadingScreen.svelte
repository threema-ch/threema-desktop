<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {LoadingScreenProps} from '~/app/ui/components/partials/loading-screen/props';
  import Logo from '~/app/ui/components/partials/logo/Logo.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {LoadingState} from '~/common/dom/backend';
  import type {u53} from '~/common/types';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';
  import {ResolvablePromise} from '~/common/utils/resolvable-promise';
  import {TIMER} from '~/common/utils/timer';

  type $$Props = LoadingScreenProps;

  export let loadingState: $$Props['loadingState'];

  export const finishedLoading = new ResolvablePromise<void>({uncaught: 'default'});
  export const cancelledLoading = new ResolvablePromise<void>({uncaught: 'default'});

  let progress: u53 | undefined = undefined;

  function handleCompleteAnimation(): void {
    // Wait for a short time, so that the loading indicator doesn't disappear immediately.
    TIMER.sleep(750)
      .finally(() => {
        finishedLoading.resolve();
      })
      .catch(assertUnreachable);
  }

  function handleUpdateLoadingState(value: LoadingState): void {
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
        progress = value.reflectionQueueProcessed / value.reflectionQueueLength;
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

  $: handleUpdateLoadingState($loadingState);
</script>

<div class="container">
  {#if progress !== undefined}
    <div class="indicator">
      <Logo animated={true} onCompletion={handleCompleteAnimation} {progress} />
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
  }
</style>
