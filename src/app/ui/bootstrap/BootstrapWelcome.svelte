<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';

  const dispatchEvent = createEventDispatcher();
</script>

<template>
  <ModalDialog visible={true} closableWithEscape={false}>
    <Title slot="header" title="Multi-Device Preview" />
    <div class="body" slot="body">
      <div class="hint">
        <!-- TODO(DESK-1012): This is suboptimal for multiple reasons (security concerns, css scoping issues [e.g., the link is currently blue instead of grey.], etc.) -->
        {@html $i18n.t(
          'topic.start.tech-preview-info',
          'This tech preview only works in conjunction with the beta version of Threema for iOS. Please note that some features are not yet available. <a href="https://threema.ch/faq/md_overview" target="_blank" rel="noreferrer noopener">Learn more...</a>.',
        )}
      </div>
      <div class="title">{$i18n.t('topic.start.link-device-title', 'Link Your iOS Device')}</div>
      <div class="steps">
        <div class="step">
          <div class="title">{$i18n.t('topic.start.link-device-step-1-title', 'Step 1:')}</div>
          <div class="description">
            <!-- TODO(DESK-1012): This is suboptimal for multiple reasons (security concerns, css scoping issues [e.g., the link is currently blue instead of grey.], etc.) -->
            {@html $i18n.t(
              'topic.start.link-device-step-1-description',
              '<a href="https://threema.ch/en/faq/ios_betatest" target="_blank" rel="noreferrer noopener">Install the multi-device beta of Threema for iOS on your device</a>.',
            )}
          </div>
        </div>
        <div class="step">
          <div class="title">{$i18n.t('topic.start.link-device-step-2-title', 'Step 2:')}</div>
          <div class="description">
            <!-- TODO(DESK-1012): This is suboptimal for multiple reasons (security concerns, css scoping issues [e.g., the link is currently blue instead of grey.], etc.) -->
            <!-- TODO(DESK-1012): Are the following quotation mark characters intentional? -->
            {@html $i18n.t(
              'topic.start.link-device-step-2-description',
              `Open the beta version, navigate to <br />“Settings > Multi-Device Preview,” and <br />activate “This Device”`,
            )}
          </div>
        </div>
        <div class="step button">
          <div class="title">{$i18n.t('topic.start.link-device-step-3-title', 'Step 3:')}</div>
          <div class="description">
            <Button flavor="filled" on:click={() => dispatchEvent('next')}
              >{$i18n.t(
                'topic.start.link-device-step-3-button-label',
                'Enter your Threema ID here',
              )}</Button
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
