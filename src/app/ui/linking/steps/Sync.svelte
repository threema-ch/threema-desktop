<script lang="ts">
  import CircularProgress from '#3sc/components/blocks/CircularProgress/CircularProgress.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {type LinkingWizardState} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let linkingWizardState: LinkingWizardState;
  unusedProp(linkingWizardState);
</script>

<template>
  <Step>
    <div class="body">
      <div class="progress">
        <CircularProgress variant="indeterminate" />
      </div>
      <h1>
        {$i18n.t('dialog--linking-sync.label--title', 'Receiving Data')}
      </h1>
    </div>

    <footer>
      <a href="https://threema.ch/faq/md_overview" target="_blank" rel="noreferrer noopener"
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
