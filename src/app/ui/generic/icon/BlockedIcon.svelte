<script lang="ts">
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
</script>

<template>
  <span>
    <MdIcon title={$i18n.t('contacts.label--blocked', 'Blocked')} theme="Filled">block</MdIcon>
  </span>
</template>

<style lang="scss">
  @use 'component' as *;

  span {
    color: red;
    font-weight: 900;
  }
</style>
