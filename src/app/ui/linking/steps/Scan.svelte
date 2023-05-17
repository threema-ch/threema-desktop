<script lang="ts">
  import CircularProgress from '#3sc/components/blocks/CircularProgress/CircularProgress.svelte';
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import QrCode from '#3sc/components/generic/QrCode/QrCode.svelte';
  import {globals} from '~/app/globals';
  import {i18n} from '~/app/ui/i18n';
  import {getLinkingQrCodePayload, type LinkingParams, type LinkingState} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';

  const log = globals.unwrap().uiLogging.logger(`ui.component.linking.scan`);

  export let params: LinkingParams;
  export let linkingState: LinkingState;

  /**
   * Copy linking code to clipboard. Note: this is only supposed to be used in development.
   */
  function copyLinkingUrl(): void {
    if (linkingUrl !== undefined) {
      navigator.clipboard
        .writeText(linkingUrl)
        .then(() => log.info('Linking code copied to clipboard'))
        .catch((error) => {
          log.error('Could not copy linking code to clipboard', error);
        });
    } else {
      log.warn('Attempting to copy undefined linking code');
    }
  }

  $: linkingUrl = getLinkingQrCodePayload(params.setup);
</script>

<template>
  <Step>
    <header>
      <h1>{$i18n.t('dialog--linking-scan.label--title', 'Link Your iOS Device')}</h1>
      <p class="intro">
        <SubstitutableText
          text={$i18n.t(
            'dialog--linking-scan.markup--intro',
            'This beta works together with Threema for iOS. Please note that some features are not yet available. <1>Learn more</1>',
          )}
        >
          <a
            slot="1"
            href="https://threema.ch/faq/md_overview"
            target="_blank"
            rel="noreferrer noopener"
            let:text>{text}</a
          >
        </SubstitutableText>
      </p>
    </header>

    <div class="body">
      <ol class="steps">
        <li>
          <h2 class="label">
            {$i18n.t('dialog--linking-scan.label--step-1', 'Step 1:')}
          </h2>
          <p class="content">
            <SubstitutableText
              text={$i18n.t(
                'dialog--linking-scan.markup--step-1',
                'Open Threema on your mobile device, navigate to <1>Settings</1>, <2>Linked Device</2> and tap <3>Add Device</3>',
              )}
            >
              <strong slot="1" class="bold" let:text>{text}</strong>
              <strong slot="2" class="bold" let:text>{text}</strong>
              <strong slot="3" class="bold" let:text>{text}</strong>
            </SubstitutableText>
          </p>
        </li>
        <li>
          <h2 class="label">
            {$i18n.t('dialog--linking-scan.label--step-2', 'Step 2:')}
          </h2>
          <p class="content">
            <SubstitutableText
              text={$i18n.t(
                'dialog--linking-scan.markup--step-2',
                'Scan this QR Code with your mobile app',
              )}
            />
          </p>
        </li>
      </ol>
      <div class="linking">
        {#if linkingState.connectionState === 'connecting'}
          <div class="qr-code">
            <div class="progress">
              <CircularProgress variant="indeterminate" />
            </div>
            <span>{$i18n.t('dialog--linking-scan.label--connecting', 'Connecting')}</span>
          </div>
        {:else if linkingState.connectionState === 'waiting-for-handshake'}
          <!-- TODO(DESK-1067): Get rid of forced border and invert QR code -->
          <div class="qr-code">
            <QrCode
              data={linkingUrl}
              options={{
                width: 240,
              }}
            />
          </div>
        {/if}
        {#if import.meta.env.DEBUG}
          <IconButton flavor="naked" on:click={copyLinkingUrl}>
            <MdIcon theme="Filled">content_copy</MdIcon>
          </IconButton>
        {/if}
      </div>
    </div>

    <footer>
      <a href="https://threema.ch/faq/md_overview" target="_blank" rel="noreferrer noopener"
        >{$i18n.t('dialog--linking-scan.action--need-help', 'Need help?')}</a
      >
    </footer>
  </Step>
</template>

<style lang="scss">
  @use 'component' as *;

  $steps-offset: rem(54px);
  $steps-column-gap: rem(16px);

  h1,
  h2,
  p,
  ol,
  li {
    padding: 0;
    margin: 0;
  }

  header {
    display: grid;
    gap: rem(8px);
    margin-bottom: rem(24px);

    h1 {
      @extend %font-large-400;
    }

    .intro {
      color: var(--t-text-e2-color);

      a {
        text-decoration: underline;
        color: inherit;
      }
    }
  }

  .body {
    display: grid;
    grid-auto-flow: column;
    grid-template:
      'steps steps' min-content
      'offset linking' min-content /
      $steps-offset auto;
    gap: rem(24px) $steps-column-gap;

    ol.steps {
      grid-area: steps;
      display: grid;
      gap: rem(8px);
      list-style-type: none;

      li {
        display: grid;
        grid-template:
          'label content' auto
          / $steps-offset auto;
        column-gap: $steps-column-gap;
        @extend %font-large-400;

        .label {
          @extend %font-large-400;
          grid-area: label;
        }

        .content {
          grid-area: content;
        }
      }
    }

    .linking {
      grid-area: linking;
      display: grid;
      grid-auto-flow: column;
      grid-template:
        'qr-code button' auto /
        min-content min-content;
      align-items: start;
      gap: rem(16px);

      .qr-code {
        display: grid;
        align-content: center;
        place-items: center;
        gap: rem(8px);
        width: rem(240px);
        height: rem(240px);
        overflow: hidden;
        border-radius: rem(8px);

        color: black;
        background-color: white;

        .progress {
          width: rem(32px);
          height: rem(32px);
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

  .bold {
    @extend %markup-bold;
  }
</style>
