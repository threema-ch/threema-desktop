<script lang="ts">
  import {globals} from '~/app/globals';
  import type {DateTimeProps} from '~/app/ui/components/atoms/datetime/props';
  import {i18n} from '~/app/ui/i18n';
  import {reactive} from '~/app/ui/utils/svelte';
  import {formatDateLocalized} from '~/app/ui/utils/timestamp';

  const systemTime = globals.unwrap().systemTime;

  type $$Props = DateTimeProps;

  export let date: $$Props['date'];
  export let format: NonNullable<$$Props['format']> = 'auto';

  let formattedDate: string;

  function updateFormattedDate(): void {
    formattedDate = formatDateLocalized(date, $i18n, format);
  }

  $: reactive(updateFormattedDate, [$systemTime.current]);
</script>

<template>
  <span class="time">{formattedDate}</span>
</template>

<style lang="scss">
  @use 'component' as *;

  .time {
    // Try to prevent layout shifts caused by relative time updates.
    white-space: nowrap;
  }
</style>
