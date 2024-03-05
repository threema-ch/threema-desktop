<script lang="ts">
  import {i18n} from '~/app/ui/i18n';
  import type {LinkingWizardConfirmEmojiProps} from '~/app/ui/linking';
  import LinkingEmojiLoader from '~/app/ui/linking/LinkingEmojiLoader.svelte';
  import Step from '~/app/ui/linking/Step.svelte';
  import {unwrap} from '~/common/utils/assert';

  type $$Props = LinkingWizardConfirmEmojiProps;

  export let rph: $$Props['rph'];
</script>

<template>
  <Step>
    <header>
      <h1>
        {$i18n.t(
          'dialog--linking-confirm-emoji.label--title',
          'Confirm emojis on your mobile device',
        )}
      </h1>
    </header>

    <div class="body">
      <div class="emojis">
        <span class="emoji"><LinkingEmojiLoader byte={unwrap(rph[0])} /></span>
        <span class="emoji"><LinkingEmojiLoader byte={unwrap(rph[1])} /></span>
        <span class="emoji"><LinkingEmojiLoader byte={unwrap(rph[2])} /></span>
      </div>
    </div>

    <footer>
      <a href={import.meta.env.URLS.overview.full} target="_blank" rel="noreferrer noopener"
        >{$i18n.t('dialog--linking-confirm-emoji.action--need-help', 'Need help?')}</a
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

  header {
    margin: rem(40px);

    h1 {
      @extend %font-large-400;
      text-align: center;
    }
  }

  .body {
    margin-bottom: rem(20px);

    .emojis {
      display: grid;
      grid-auto-flow: column;
      justify-content: center;
      gap: rem(16px);

      .emoji {
        width: rem(50px);
        height: rem(50px);

        :global(img) {
          width: 100%;
          height: 100%;
        }
      }
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
