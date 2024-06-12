<script lang="ts">
  import {onMount} from 'svelte';

  import PartyPopper from '~/app/res/icon/emoji-party-popper.svg?raw';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {LinkingWizardSuccessProps} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';

  type $$Props = LinkingWizardSuccessProps;

  export let identityReady: $$Props['identityReady'];

  let buttonComponent: Button | null = null;

  onMount(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
        <SubstitutableText
          text={$i18n.t(
            'dialog--linking-success.markup--description',
            '{threema} can now be used on this computer <1/>(even when your iOS device is turned off or isn’t connected to the Internet).',
            {threema: import.meta.env.MOBILE_APP_NAME},
          )}
        >
          <br slot="1" />
        </SubstitutableText>
      </p>
      <div class="button">
        <Button bind:this={buttonComponent} flavor="filled" on:click={() => identityReady.resolve()}
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
