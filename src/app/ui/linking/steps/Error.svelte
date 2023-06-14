<script lang="ts">
  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {type LinkingWizardStateError} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';

  export let linkingWizardState: LinkingWizardStateError;
</script>

<template>
  <Step>
    <div class="body">
      <h1 class="title">{$i18n.t('dialog--linking-error.label--title', 'Linking Error')}</h1>
      <p class="description">
        {#if linkingWizardState.errorType === 'connection-error'}
          {$i18n.t(
            'dialog--linking-error.prose--description-connection-error',
            'A connection error occurred during linking. Please check your internet connection and try again.',
          )}
        {:else}
          {$i18n.t(
            'dialog--linking-error.prose--description-generic-error',
            'An error occurred during linking. Please try again.',
          )}
        {/if}
      </p>

      <p class="technical-details">
        Technical details: {linkingWizardState.errorMessage}
      </p>

      <div class="button">
        <Button flavor="filled" on:click={() => window.location.reload()}
          >{$i18n.t('dialog--linking-error.action--confirm', 'Retry')}</Button
        >
      </div>
    </div>
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
    grid-template:
      'title'
      '.' rem(16px)
      'description'
      'technical-details'
      '.' rem(40px)
      'button';
    justify-items: center;
    padding: rem(28px) 0;

    .title {
      grid-area: title;
      @extend %font-h5-400;
    }

    .description {
      grid-area: description;
      @extend %font-normal-400;
      text-align: center;
      user-select: text;
    }

    .technical-details {
      grid-area: technical-details;
      @extend %font-small-400;
      color: grey;
      text-align: center;
      user-select: text;
    }

    .button {
      grid-area: button;
    }
  }
</style>
