<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
  import MarkupText from '~/app/ui/MarkupText.svelte';

  const dispatchEvent = createEventDispatcher();
</script>

<template>
  <ModalDialog visible={true} closableWithEscape={false}>
    <Title slot="header" title={$i18n.t('dialog--welcome.label--title', 'Multi-Device Preview')} />
    <div class="body" slot="body">
      <div class="hint">
        <MarkupText
          markup={$i18n.t(
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
        </MarkupText>
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
            <MarkupText
              markup={$i18n.t(
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
            </MarkupText>
          </div>
        </div>
        <div class="step">
          <div class="title">{$i18n.t('dialog--welcome.label--link-device-step-2', 'Step 2:')}</div>
          <div class="description">
            <!-- TODO(DESK-1012): Are the following quotation mark characters intentional? -->
            <MarkupText
              markup={$i18n.t(
                'dialog--welcome.markup--link-device-step-2',
                'Open the beta version, navigate to <1>“Settings > Multi-Device Preview,”</1> and activate <2>“This Device”</2>.',
              )}
            >
              <span slot="1" style="white-space: nowrap;" let:text>{text}</span>
              <span slot="2" style="white-space: nowrap;" let:text>{text}</span>
            </MarkupText>
          </div>
        </div>
        <div class="step button">
          <div class="title">{$i18n.t('dialog--welcome.label--link-device-step-3', 'Step 3:')}</div>
          <div class="description">
            <Button flavor="filled" on:click={() => dispatchEvent('next')}
              >{$i18n.t('dialog--welcome.action--confirm', 'Enter your Threema ID here')}</Button
            >
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

        &.button {
          .title {
            align-self: center;
          }
          .description {
            @extend %font-normal-400;
          }
        }
      }
    }
  }
</style>
