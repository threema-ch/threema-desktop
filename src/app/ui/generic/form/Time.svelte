<script lang="ts">
  import {formatDateLocalized} from '~/app/ui/generic/form';
  import {i18n as i18nStore} from '~/app/ui/i18n';
  import {type I18nType} from '~/app/ui/i18n-types';

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

  function formatDate(it: Date, i18n: I18nType): string {
    if (format === 'time') {
      return new Intl.DateTimeFormat(i18n.locale, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(it);
    }

    if (format === 'extended') {
      return new Intl.DateTimeFormat(i18n.locale, {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(it);
    }

    return formatDateLocalized(date, $i18nStore);
  }
</script>

<template>
  {formatDate(date, $i18nStore)}
</template>
