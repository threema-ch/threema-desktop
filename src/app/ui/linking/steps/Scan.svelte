<script lang="ts">
  import {globals} from '~/app/globals';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {LinkingWizardScanProps} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import CircularProgress from '~/app/ui/svelte-components/blocks/CircularProgress/CircularProgress.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import QrCode from '~/app/ui/svelte-components/generic/QrCode/QrCode.svelte';
  import {TIMER} from '~/common/utils/timer';

  const log = globals.unwrap().uiLogging.logger(`ui.component.linking.scan`);

  type $$Props = LinkingWizardScanProps;

  export let joinUri: $$Props['joinUri'] = undefined;

  // In order to avoid a quickly-flashing loading icon, define a minimal waiting time
  // for connecting to the rendezvous server. Note that the timer is started here, but
  // not yet awaited until after the connection has been established.
  let minimalConnectTimerElapsed = false;
  TIMER.sleep(1000)
    .then(() => (minimalConnectTimerElapsed = true))
    .catch(() => log.error('Sleep timer failed'));

  /**
   * Copy linking code to clipboard. Note: this is only supposed to be used in development.
   */
  function copyLinkingUri(): void {
    if (joinUri !== undefined) {
      navigator.clipboard
        .writeText(joinUri)
        .then(() => log.info('Linking code copied to clipboard'))
        .catch((error: unknown) => {
          log.error('Could not copy linking code to clipboard', error);
        });
    } else {
      log.warn('Attempting to copy undefined linking code');
    }
  }
</script>

<template>
  <Step>
    <header>
      <h1>{$i18n.t('dialog--linking-scan.label--title', 'Link Your iOS Device')}</h1>
      <p class="intro">
        <SubstitutableText
          text={$i18n.t(
            'dialog--linking-scan.markup--intro',
            'This beta works together with {threema} for iOS. Please note that some features are not yet available. <1>Learn more</1>',
            {threema: import.meta.env.MOBILE_APP_NAME},
          )}
        >
          <a
            slot="1"
            href={import.meta.env.URLS.limitations.full}
            target="_blank"
            rel="noreferrer noopener"
            let:text>{text}</a
          >
        </SubstitutableText>
      </p>
    </header>

    <div class="body">
      <div class="steps">
        <h2 class="label label-1">
          {$i18n.t('dialog--linking-scan.label--step-1', 'Step 1:')}
        </h2>
        <p class="content content-1">
          <SubstitutableText
            text={$i18n.t(
              'dialog--linking-scan.markup--step-1',
              'Open the {threema} app on your mobile device',
              {threema: import.meta.env.MOBILE_APP_NAME},
            )}
          />
        </p>
        <h2 class="label label-2">
          {$i18n.t('dialog--linking-scan.label--step-2', 'Step 2:')}
        </h2>
        <p class="content content-2">
          <!-- TODO(DESK-1581): Remove this on the variant and unify the strings. -->
          <SubstitutableText
            text={import.meta.env.BUILD_VARIANT === 'work'
              ? $i18n.t(
                  'dialog--linking-scan.markup--step-2-work',
                  'In the app, go to <1>Settings</1> > <1>Desktop/Web</1> > <1>Linked Device</1> and tap <1>Add Device</1>',
                )
              : $i18n.t(
                  'dialog--linking-scan.markup--step-2-consumer',
                  'In the app, go to <1>Settings</1> > <1>Threema 2.0 for Desktop (Beta)</1> and tap <1>Add Device</1>',
                )}
          >
            <strong slot="1" class="bold" let:text>{text}</strong>
          </SubstitutableText>
        </p>
        <h2 class="label label-3">
          {$i18n.t('dialog--linking-scan.label--step-3', 'Step 3:')}
        </h2>
        <div class="content content-3">
          <p>
            <SubstitutableText
              text={$i18n.t('dialog--linking-scan.markup--step-3', 'Scan this QR Code')}
            />
          </p>
          <div class="linking">
            {#if joinUri === undefined || !minimalConnectTimerElapsed}
              <div class="qr-code">
                <div class="progress">
                  <CircularProgress variant="indeterminate" />
                </div>
                <span>{$i18n.t('dialog--linking-scan.label--connecting', 'Connecting')}</span>
              </div>
            {:else}
              <!-- TODO(DESK-1067): Get rid of forced border and invert QR code -->
              <div class="qr-code">
                <QrCode
                  data={joinUri}
                  options={{
                    width: 240,
                  }}
                />
              </div>
            {/if}
            {#if import.meta.env.DEBUG}
              <IconButton flavor="naked" title="🐞 Copy URI" on:click={copyLinkingUri}>
                <MdIcon theme="Filled">content_copy</MdIcon>
              </IconButton>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <footer>
      <a href={import.meta.env.URLS.overview.full} target="_blank" rel="noreferrer noopener"
        >{$i18n.t('dialog--linking-scan.action--need-help', 'Need help?')}</a
      >
    </footer>
  </Step>
</template>

<style lang="scss">
  @use 'component' as *;

  h1,
  h2,
  p {
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
    .steps {
      display: grid;
      grid-auto-flow: column;
      grid-template:
        'label-1 content-1' min-content
        'label-2 content-2' min-content
        'label-3 content-3' min-content /
        minmax(min-content, max-content) minmax(min-content, auto);
      gap: rem(8px) rem(16px);
      list-style-type: none;
      @extend %font-large-400;

      .label {
        @extend %font-large-400;

        &.label-1 {
          grid-area: label-1;
        }

        &.label-2 {
          grid-area: label-2;
        }

        &.label-3 {
          grid-area: label-3;
        }
      }

      .content {
        &.content-1 {
          grid-area: content-1;
        }

        &.content-2 {
          grid-area: content-2;
        }

        &.content-3 {
          grid-area: content-3;
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
            margin-top: rem(8px);

            color: black;
            background-color: white;

            .progress {
              width: rem(32px);
              height: rem(32px);
            }
          }
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
