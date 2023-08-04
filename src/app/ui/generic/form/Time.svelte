<script lang="ts">
  import {getDateTimeIsoString, getTimeIsoString} from '.';

  /**
   * Date object.
   */
  export let date: Date;

  /**
   * Format variant:
   *  - `datetime`: Display date and time.
   *  - `time`: only display time.
   */
  export let format: 'datetime' | 'time' = 'datetime';

  function formatDate(dateParam: Date): string {
    if (new Date().toDateString() === dateParam.toDateString() || format === 'time') {
      // Display only the time for same day dates
      return getTimeIsoString(dateParam);
    } else {
      // Display the date and time if date is not today
      return getDateTimeIsoString(dateParam);
    }
  }
</script>

<template>
  {formatDate(date)}
</template>
