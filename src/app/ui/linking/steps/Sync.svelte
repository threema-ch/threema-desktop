<script lang="ts">
  import {i18n} from '~/app/ui/i18n';
  import type {LinkingWizardSyncingProps} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import CircularProgress from '~/app/ui/svelte-components/blocks/CircularProgress/CircularProgress.svelte';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = LinkingWizardSyncingProps;

  export let phase: $$Props['phase'];
</script>

<template>
  <Step>
    <div class="body">
      <div class="progress">
        <CircularProgress variant="indeterminate" />
      </div>
      <h1>
        {#if phase === 'receiving'}
          {$i18n.t('dialog--linking-sync.label--title-receiving', 'Receiving Data')}
        {:else if phase === 'loading'}
          {$i18n.t('dialog--linking-sync.label--title-loading', 'Loading Data')}
        {:else if phase === 'restoring'}
          {$i18n.t('dialog--linking-sync.label--title-restoring', 'Restoring Messages')}
        {:else if phase === 'encrypting'}
          {$i18n.t(
            'dialog--linking-sync.label--title-encrypting',
            'Encrypting Data with Your Password',
          )}
        {:else}
          {unreachable(phase)}
          Syncing
        {/if}
      </h1>
    </div>

    <footer>
      <a href={import.meta.env.URLS.overview.full} target="_blank" rel="noreferrer noopener"
        >{$i18n.t('dialog--linking-sync.action--need-help', 'Need help?')}</a
      >
    </footer>
  </Step>
</template>

<style lang="scss">
  @use 'component' as *;

  h1 {
    padding: 0;
    margin: 0;
  }

  .body {
    display: grid;
    justify-items: center;
    gap: rem(16px);
    margin-top: rem(112px);
    margin-bottom: rem(68px);

    h1 {
      @extend %font-large-400;
      text-align: center;
    }

    .progress {
      width: rem(48px);
      height: rem(48px);
    }
  }

  footer {
    margin-top: rem(24px);

    a {
      color: var(--t-text-e2-color);
      text-decoration: none;
    }
  }
</style>
