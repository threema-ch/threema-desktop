<script lang="ts">
  import {globals} from '~/app/globals';
  import {i18n as i18nStore} from '~/app/ui/i18n';
  import {formatDateLocalized} from '~/app/ui/utils/timestamp';

  const systemTime = globals.unwrap().systemTime;

  /**
   * Date object.
   */
  export let date: Date;

  /**
   * Format variant:
   *  - `auto`: Shortest representation possible (relative to now).
   *  - `time`: Only display time.
   *  - `extended`: Longer, more detailed, and unambiguous display of date and time.
   */
  export let format: 'auto' | 'time' | 'extended' = 'auto';

  let formattedDate: string;
  $: {
    // Re-evaluate this block on system time changes.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    $systemTime.current;

    formattedDate = formatDateLocalized(date, $i18nStore, format);
  }
</script>

<template>
  <span class="time">{formattedDate}</span>
</template>

<style lang="scss">
  @use 'component' as *;

  // Try to prevent layout shifts caused by relative time updates.
  .time {
    white-space: nowrap;
  }
</style>
