<script lang="ts" context="module">
  interface ErrorText {
    title: string;
    message: string;
    details?: string;
  }
</script>

<script lang="ts">
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {LinkingWizardErrorProps} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = LinkingWizardErrorProps;

  export let errorMessage: $$Props['errorMessage'];
  export let errorType: $$Props['errorType'];

  function translatedTextFor(state: LinkingWizardErrorProps, t: typeof $i18n.t): ErrorText {
    let title = t('dialog--linking-error.label--title-generic', 'Linking Unsuccessful');
    let message = t(
      'dialog--linking-error.prose--message-generic',
      'An error occurred during linking. Please try again.',
    );

    switch (state.errorType.kind) {
      case 'connection-error':
        switch (state.errorType.cause) {
          case 'timeout':
            title = t(
              'dialog--linking-error.label--title-connection-error-timeout',
              'Linking Timeout',
            );
            message = t(
              'dialog--linking-error.label--message-connection-error-timeout',
              'The linking session has expired due to inactivity. Please start the linking process again.',
            );
            break;

          case 'closed':
          case 'complete':
          case 'unknown':
            title = t(
              'dialog--linking-error.label--title-connection-error-generic',
              'Connection Error',
            );
            message = t(
              'dialog--linking-error.prose--message-connection-error-generic',
              'The server connection was closed before linking was complete. If you did not abort the process yourself, please check your internet connection and try again.',
            );
            break;

          default:
            unreachable(state.errorType.cause);
        }
        break;

      case 'rendezvous-error':
        switch (state.errorType.cause) {
          case 'timeout':
            title = t(
              'dialog--linking-error.label--title-rendezvous-error-timeout',
              'Linking Timeout',
            );
            message = t(
              'dialog--linking-error.label--message-rendezvous-error-timeout',
              'The linking session has expired due to inactivity. Please start the linking process again.',
            );
            break;

          case 'closed':
          case 'complete':
          case 'unknown':
            // In these cases, the default generic error message is good enough for now.
            break;

          default:
            unreachable(state.errorType.cause);
        }
        break;

      case 'identity-transfer-prohibited':
        switch (import.meta.env.BUILD_VARIANT) {
          case 'consumer':
            message = t(
              'dialog--linking-error.prose--message-wrong-app-variant-consumer-error',
              'It is not possible to link your Threema ID with this app. If you use Threema Work, download the desktop app from <1 />.',
            );
            break;

          case 'work':
            message = t(
              'dialog--linking-error.prose--message-wrong-app-variant-work-error',
              'It is not possible to link your Threema ID with this app. If you use Threema privately, download the desktop app from <1 />.',
            );
            break;

          default:
            unreachable(import.meta.env.BUILD_VARIANT);
        }
        break;

      case 'invalid-identity':
        title = t(
          'dialog--linking-error.label--title-invalid-identity',
          'Revoked or Unknown Threema ID',
        );
        message = t(
          'dialog--linking-error.prose--message-invalid-identity',
          'The Threema ID used for linking is unknown to the server or has been revoked.',
        );
        if (import.meta.env.DEBUG) {
          message += '<2/>🐞 Did you use a sandbox ID with a live app, or vice versa?';
        }
        break;

      case 'invalid-work-credentials':
        title = t(
          'dialog--linking-error.label--title-invalid-work-credentials',
          'Invalid Threema Work Credentials',
        );
        message = t(
          'dialog--linking-error.prose--message-invalid-work-credentials',
          'The credentials for Threema Work are invalid or expired. Please restart the app on your mobile device and retry linking, or contact your Threema Work administrator.',
        );
        break;

      case 'restore-error':
        title = t('dialog--linking-error.label--title-restore-error', 'Data Restore Error');
        message = t(
          'dialog--linking-error.label--message-restore-error',
          'There was an error restoring the transferred data from your other device. Please try again.',
        );
        break;

      case 'join-error':
      case 'generic-error':
      case 'registration-error':
        // In these cases, the default generic error message is good enough for now.
        break;

      case 'onprem-configuration-error':
        title = t(
          'dialog--linking-error.label--title-configuration-failed',
          'OnPrem Configuration Error',
        );
        message = t(
          'dialog--linking-error.prose--configuration-failed',
          'The setup of the OnPrem instance failed because of a configuration error. Please retry the setup process or contact your administrator.',
        );
        break;
      default:
        unreachable(state.errorType);
    }

    return {
      title,
      message,
      details: errorMessage,
    };
  }

  $: errorText = translatedTextFor(
    {
      errorMessage,
      errorType,
    },
    $i18n.t,
  );
</script>

<template>
  <Step>
    <div class="body" class:has-details={errorText.details !== undefined}>
      <h1 class="title">
        {errorText.title}
      </h1>

      <p class="description">
        <SubstitutableText text={errorText.message}>
          <a
            slot="1"
            href={import.meta.env.URLS.downloadAndInfoForOtherVariant.full}
            target="_blank"
            rel="noreferrer noopener">{import.meta.env.URLS.downloadAndInfoForOtherVariant.short}</a
          >
          <br slot="2" />
        </SubstitutableText>
      </p>

      {#if errorText.details !== undefined}
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
            {errorMessage}
          </p>
        </div>
      {/if}

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
      'button';
    justify-items: center;
    padding: rem(28px) 0;

    &.has-details {
      grid-template:
        'title'
        '.' rem(16px)
        'description'
        '.' rem(32px)
        'technical-details'
        '.' rem(24px)
        'button';
    }

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
