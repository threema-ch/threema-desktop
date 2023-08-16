<script lang="ts">
  import {onMount} from 'svelte';

  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import PartyPopper from '~/app/res/icon/emoji-party-popper.svg?raw';
  import {i18n} from '~/app/ui/i18n';
  import {type LinkingWizardStateSuccess} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';

  export let linkingWizardState: LinkingWizardStateSuccess;

  // eslint-disable-next-line @typescript-eslint/ban-types
  let buttonComponent: Button | null = null;

  onMount(() => {
    buttonComponent?.focus();
  });
</script>

<template>
  <Step>
    <div class="body">
      <div class="party">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html PartyPopper}
      </div>
      <h1 class="title">
        {$i18n.t('dialog--linking-success.label--title', 'Device Linked Successfully')}
      </h1>
      <p class="description">
        {#if import.meta.env.BUILD_VARIANT === 'work'}
          <SubstitutableText
            text={$i18n.t(
              'dialog--linking-success.markup--description-work',
              'You can now use Threema Work on this computer <1/>(even when your iOS device happens to be turned off).',
            )}
          >
            <br slot="1" />
          </SubstitutableText>
        {:else if import.meta.env.BUILD_VARIANT === 'consumer'}
          <SubstitutableText
            text={$i18n.t(
              'dialog--linking-success.markup--description-consumer',
              'You can now use Threema on this computer <1/>(even when your iOS device happens to be turned off).',
            )}
          >
            <br slot="1" />
          </SubstitutableText>
        {/if}
      </p>
      <div class="button">
        <Button
          bind:this={buttonComponent}
          flavor="filled"
          on:click={() => linkingWizardState.identityReady.resolve()}
          >{$i18n.t('dialog--linking-success.action--confirm', 'Start using Threema')}</Button
        >
      </div>
    </div>
  </Step>
</template>

<style lang="scss">
  @use 'component' as *;

  h1,
  p {
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

    .party {
      grid-area: party;
      height: rem(74px);
      line-height: rem(74px);
      font-size: rem(56px);

      :global(svg) {
        color: var(--t-color-primary);
      }
    }

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
