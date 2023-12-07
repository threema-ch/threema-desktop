<script lang="ts">
  import {globals} from '~/app/globals';
  import type {DateTimeProps} from '~/app/ui/components/atoms/datetime/props';
  import {enumToBool} from '~/app/ui/components/partials/settings/internal/appearance-settings/helpers';
  import {i18n} from '~/app/ui/i18n';
  import {reactive} from '~/app/ui/utils/svelte';
  import {formatDateLocalized} from '~/app/ui/utils/timestamp';
  import {DEFAULT_TIME_FORMAT} from '~/common/model/types/settings';

  const systemTime = globals.unwrap().systemTime;

  type $$Props = DateTimeProps;

  export let date: $$Props['date'];
  export let format: NonNullable<$$Props['format']> = 'auto';
  export let services: $$Props['services'];

  const {
    settings: {appearance},
  } = services;

  let formattedDate: string;

  let is12hTime: boolean;
  $: is12hTime = enumToBool(appearance.get().view.timeFormat ?? DEFAULT_TIME_FORMAT);

  $: reactive(() => {
    formattedDate = formatDateLocalized(date, $i18n, format, {hour12: is12hTime});
  }, [$systemTime.current]);
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
