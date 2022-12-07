<script lang="ts">
  import {getDateTimeIsoString, getTimeIsoString} from '.';

  /**
   * Date object.
   */
  export let date: Date;

  function formatDate(dateParam: Date): string {
    if (new Date().toDateString() === dateParam.toDateString()) {
      // Display only the time for same day dates
      return getTimeIsoString(dateParam);
    } else {
      // Display the date and time if date is not today
      return getDateTimeIsoString(dateParam);
    }
  }
</script>

<template>
  <div>
    {formatDate(date)}
  </div>
</template>
