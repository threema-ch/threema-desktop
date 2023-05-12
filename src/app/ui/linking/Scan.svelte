<script lang="ts">
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import QrCode from '#3sc/components/generic/QrCode/QrCode.svelte';
  import {i18n} from '~/app/ui/i18n';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';

  import {getLinkingQrCodePayload, type LinkingParams, type LinkingState} from '.';

  export let params: LinkingParams;
  export let linkingState: LinkingState;
</script>

<template>
  <!--
    TODO: Update texts, improve layout, update translation keys.
  -->
  <ModalDialog visible={true} closableWithEscape={false}>
    <Title
      slot="header"
      title={$i18n.t('dialog--welcome.label--link-device-instructions', 'Link Your iOS Device')}
    />
    <div class="body" slot="body">
      <div class="hint">
        <SubstitutableText
          text={$i18n.t(
            'dialog--welcome.markup--intro',
            'This tech preview only works in conjunction with the beta version of Threema for iOS. Please note that some features are not yet available. <1>Learn more...</1>.',
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
      </div>
      <div class="title">
        {$i18n.t('dialog--welcome.label--link-device-instructions', 'Link Your iOS Device')}
      </div>
      <div class="steps">
        <div class="step">
          <div class="title">
            {$i18n.t('dialog--welcome.label--link-device-step-1', 'Step 1:')}
          </div>
          <div class="description">
            <SubstitutableText
              text={$i18n.t(
                'dialog--welcome.markup--link-device-step-1',
                '<1>Install the multi-device beta of Threema for iOS on your device</1>.',
              )}
            >
              <a
                slot="1"
                href="https://threema.ch/en/faq/ios_betatest"
                target="_blank"
                rel="noreferrer noopener"
                let:text>{text}</a
              >
            </SubstitutableText>
          </div>
        </div>
        <div class="step">
          <div class="title">{$i18n.t('dialog--welcome.label--link-device-step-2', 'Step 2:')}</div>
          <div class="description">
            <SubstitutableText
              text={$i18n.t(
                'dialog--welcome.markup--link-device-step-2',
                'Open the beta version, navigate to <1>“Settings > Multi-Device Preview,”</1> and activate <2>“This Device”</2>.',
              )}
            >
              <span slot="1" style="white-space: nowrap;" let:text>{text}</span>
              <span slot="2" style="white-space: nowrap;" let:text>{text}</span>
            </SubstitutableText>
          </div>
        </div>
        <div class="step qr-code">
          <div class="title" />
          <div class="description">
            {#if linkingState.connectionState === 'connecting'}
              Connecting...
            {:else if linkingState.connectionState === 'waiting-for-handshake'}
              <QrCode data={getLinkingQrCodePayload(params.setup)} options={{}} />
              <pre><code>{getLinkingQrCodePayload(params.setup)}</code></pre>
            {:else if linkingState.connectionState === 'nominated'}
              <h1 style="color: #ff00ff">WE WERE NO-MI-NA-TED!!!!111!!1111elf</h1>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </ModalDialog>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    width: rem(480px);
    padding: rem(16px) rem(16px) rem(40px) rem(16px);

    .hint {
      color: var(--t-text-e2-color);
      margin-bottom: rem(16px);

      a {
        text-decoration: underline;
        color: inherit;
      }
    }

    .title {
      @extend %font-large-400;
    }

    .steps {
      display: grid;
      .step {
        display: grid;
        grid-template:
          'title description' auto
          / rem(54px) auto;
        column-gap: rem(16px);
        margin-top: rem(16px);
        @extend %font-large-400;

        a {
          color: var(--t-text-e1-color);
        }
      }
    }
  }
</style>
