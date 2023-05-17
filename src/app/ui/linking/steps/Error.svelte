<script lang="ts">
  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {type LinkingParams, type LinkingState} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let params: LinkingParams;
  export let linkingState: LinkingState;
  unusedProp(params, linkingState);
</script>

<template>
  <Step>
    <div class="body">
      <h1 class="title">{$i18n.t('dialog--linking-error.label--title', 'Linking Error')}</h1>
      <p class="description">
        {$i18n.t(
          'dialog--linking-error.prose--description',
          'An error occurred during linking. Please try again.',
        )}
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
      'party'
      '.' rem(16px)
      'title'
      '.' rem(16px)
      'description'
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
      @extend %font-large-400;
      text-align: center;
    }

    .button {
      grid-area: button;
    }
  }
</style>
