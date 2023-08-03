<script lang="ts">
  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {type LinkingWizardStateError} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import {unreachable} from '~/common/utils/assert';

  export let linkingWizardState: LinkingWizardStateError;
</script>

<template>
  <Step>
    <div class="body">
      <h1 class="title">
        {$i18n.t('dialog--linking-error.label--title', 'Linking Unsuccessful')}
      </h1>

      <p class="description">
        {#if linkingWizardState.errorType === 'connection-error'}
          {$i18n.t(
            'dialog--linking-error.prose--description-connection-error',
            'The server connection was closed before linking was complete. If you did not abort the process yourself, please check your internet connection and try again.',
          )}
        {:else if linkingWizardState.errorType === 'wrong-app-variant'}
          {$i18n.t(
            'dialog--linking-error.prose--description-wrong-app-variant',
            'It is not possible to link your Threema ID with this app.',
          )}
          {#if import.meta.env.BUILD_VARIANT === 'consumer'}
            <SubstitutableText
              text={$i18n.t(
                'dialog--linking-error.prose--description-wrong-app-variant-work',
                'If you use Threema Work, download the desktop app from <1 />.',
              )}
            >
              <a slot="1" href="https://three.ma/mdw" target="_blank" rel="noreferrer noopener"
                >three.ma/mdw</a
              >
            </SubstitutableText>
          {:else if import.meta.env.BUILD_VARIANT === 'work'}
            <SubstitutableText
              text={$i18n.t(
                'dialog--linking-error.prose--description-wrong-app-variant-private',
                'If you use Threema privately, download the desktop app from <1 />.',
              )}
            >
              <a slot="1" href="https://three.ma/md" target="_blank" rel="noreferrer noopener"
                >three.ma/md</a
              >
            </SubstitutableText>
          {:else}
            {unreachable(import.meta.env.BUILD_VARIANT)}
          {/if}
        {:else}
          {$i18n.t(
            'dialog--linking-error.prose--description-generic-error',
            'An error occurred during linking. Please try again.',
          )}
        {/if}
      </p>

      <div class="technical-details">
        <input type="checkbox" id="drawer-toggle" />
        <label class="drawer-toggle" for="drawer-toggle">
          <span>
            {$i18n.t(
              'dialog--linking-error.label--technical-details',
              'Technical details (click to expand)',
            )}
          </span>
          <MdIcon
            theme="Filled"
            title={$i18n.t(
              'dialog--linking-error.hint--expand-full-error-message',
              'Show full error',
            )}>expand_more</MdIcon
          >
        </label>
        <p class="drawer-content">
          {linkingWizardState.errorMessage}
        </p>
      </div>

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

  h1,
  p {
    padding: 0;
    margin: 0;
  }

  .body {
    display: grid;
    grid-template:
      'title'
      '.' rem(16px)
      'description'
      '.' rem(32px)
      'technical-details'
      '.' rem(24px)
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
      color: var(--t-text-e2-color);
      text-align: left;
      user-select: text;
      overflow: hidden;
      border-radius: rem(8px);
      background-color: var(--cc-linking-wizard-error-message-background);

      input {
        position: absolute;
        opacity: 0;
        z-index: -1;
      }

      .drawer-toggle,
      .drawer-content {
        padding: 0 rem(24px);
      }

      .drawer-toggle {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        font-size: rem(18px);
        height: rem(48px);
        cursor: pointer;
        border-radius: rem(8px);

        span {
          font-size: rem(16px);
        }

        :global(.icon) {
          transform: rotate(0);
          transition: transform 0.15s ease-in-out;
        }
      }

      .drawer-content {
        user-select: all;
        max-height: 0;
        transition: all 0.15s ease-in-out;
        font-family: monospace;
      }

      input:checked {
        ~ .drawer-toggle {
          :global(.icon) {
            transform: rotate(180deg);
          }
        }

        ~ .drawer-content {
          max-height: rem(360px);
          padding: rem(8px) rem(24px) rem(18px) rem(24px);
        }
      }

      input:focus-visible {
        ~ .drawer-toggle {
          box-shadow: inset 0 0 0 rem(1px) white;
        }
      }
    }

    .button {
      grid-area: button;
    }
  }
</style>
