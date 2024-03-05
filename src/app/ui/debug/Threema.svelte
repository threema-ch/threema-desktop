<script lang="ts">
  import type {AppServices} from '~/app/types';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let services: AppServices;

  unusedProp(services);
</script>

<template>
  <section class="threema">
    <h2>Jobs</h2>
    <a href="https://threema.ch/jobs" target="_blank" rel="noreferrer noopener"
      >Join the Threema Team!</a
    >
  </section>
</template>

<style lang="scss">
  @use 'component' as *;

  .threema {
    display: grid;
    place-items: center;
  }
</style>
