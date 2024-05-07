<!--
  @component Renders an unstyled timer which shows the current duration between the given start date
  and now. Refreshes every second.
-->
<script lang="ts">
  import {onMount} from 'svelte';

  import type {TimerProps} from '~/app/ui/components/atoms/timer/props';
  import {formatDurationBetween} from '~/app/ui/utils/timestamp';
  import {TIMER, type TimerCanceller} from '~/common/utils/timer';

  type $$Props = TimerProps;

  export let from: $$Props['from'];

  let now: Date = new Date();
  let nowUpdateCanceller: TimerCanceller | undefined;

  $: currentDuration = formatDurationBetween(from, now);

  onMount(() => {
    nowUpdateCanceller = TIMER.repeat(() => {
      now = new Date();
    }, 1000);

    return nowUpdateCanceller;
  });
</script>

<!-- Renders the given slot with the current duration, or just the duration as text if no slot is
given. -->
{#if $$slots.default}
  <slot current={currentDuration} />
{:else}
  {currentDuration}
{/if}
