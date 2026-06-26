<script lang="ts">
  import {ResolvablePromise} from '@threema/ts-utils/promise/resolvable-promise';
  import {Switch} from '@threema/ui';
  import {onMount} from 'svelte';

  import type {AppServicesForSvelte} from '~/app/types';
  import Hint from '~/app/ui/components/atoms/hint/Hint.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import ForgotPasswordModal from '~/app/ui/components/partials/modals/forgot-password-modal/ForgotPasswordModal.svelte';
  import {i18n} from '~/app/ui/i18n';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import Password from '~/app/ui/svelte-components/blocks/Input/Password.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import {svelteUnreachable, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {SystemInfo} from '~/common/electron-ipc';
  import {unreachable} from '~/common/utils/assert';

  interface Props {
    /**
     * The previously attempted password. If provided, a 'wrong password' error message will be
     * shown.
     */
    readonly previouslyAttemptedPassword: string | undefined;
    readonly services: Pick<AppServicesForSvelte, 'electron'>;
    readonly shouldStorePassword: ResolvablePromise<boolean>;
    readonly systemInfo: SystemInfo;
  }

  const {previouslyAttemptedPassword, services, shouldStorePassword, systemInfo}: Props = $props();

  /**
   * A promise that can be awaited. It will resolve once the password been entered by the user.
   */
  export const passwordPromise = new ResolvablePromise<string>({uncaught: 'default'});

  const minPasswordLength = 1;
  const remoteSecretError = services.electron.getRemoteSecretLaunchParameter();
  const isRemoteSecretSystemSuspendRestart =
    services.electron.getRemoteSecretSystemSuspensionRestartParameter();

  let modalState = $state<'none' | 'forgot-password'>('none');
  let hasError = $state<boolean>(previouslyAttemptedPassword !== undefined);
  let password = $state<string>(previouslyAttemptedPassword ?? '');
  let shouldStorePasswordValue = $state<boolean>(false);
  let isSubmitting = $state<boolean>(false);

  let passwordInputComponent = $state<SvelteNullableBinding<Password>>(null);

  async function handleOnSubmit(): Promise<void> {
    isSubmitting = true;

    // Promise which is never resolved, because the entire component will be un-mounted or
    // re-mounted after the password has been validated.
    return await new Promise<void>((resolve, reject) => {
      if (password.length >= minPasswordLength) {
        shouldStorePassword.resolve(shouldStorePasswordValue);
        passwordPromise.resolve(password);
      } else {
        reject(new Error('Password is shorter than the minimum required length'));
      }
    });
  }

  function handleClickForgotPassword(): void {
    modalState = 'forgot-password';
  }

  function handleCloseForgotPasswordModal(): void {
    hasError = false;
    modalState = 'none';
  }

  function handleClickSwitch(event: Event): void {
    event.preventDefault();

    if (!systemInfo.isSafeStorageAvailable) {
      return;
    }

    shouldStorePasswordValue = !shouldStorePasswordValue;
  }

  function clearError(): void {
    hasError = false;
  }

  const restartReason = $derived.by<
    | {
        readonly type: 'error' | 'info';
        readonly title: string;
        readonly description: string;
      }
    | undefined
  >(() => {
    if (isRemoteSecretSystemSuspendRestart === true) {
      return {
        type: 'info',
        title: $i18n.t(
          'dialog--common.label--locked-due-to-system-suspend',
          'System Suspension Detected',
        ),
        description: $i18n.t(
          'dialog--common.prose--locked-due-to-system-suspend',
          '{fullAppName} was locked to protect your data while your device was suspended.',
          {
            fullAppName: import.meta.env.APP_NAME,
          },
        ),
      };
    }

    if (remoteSecretError === undefined) {
      return undefined;
    }

    switch (remoteSecretError) {
      case 'blocked':
        return {
          type: 'error',
          title: $i18n.t(
            'dialog--startup-unlock.label--remote-secret-error-blocked',
            'App Has Been Locked',
          ),
          description: $i18n.t(
            'dialog--startup-unlock.prose--remote-secret-error-blocked',
            'Access to this app has been blocked by your administrator. Please contact your administrator for more information.',
          ),
        };

      case 'invalid-credentials':
        return {
          type: 'error',
          title: $i18n.t(
            'dialog--startup-unlock.label--remote-secret-error-invalid-credentials',
            'Invalid Credentials',
          ),
          description: $i18n.t(
            'dialog--startup-unlock.prose--remote-secret-error-invalid-credentials',
            'Your credentials are invalid. After entering your password, you will be asked to enter valid credentials.',
          ),
        };

      case 'invalid-state':
        return {
          type: 'error',
          title: $i18n.t(
            'dialog--startup-unlock.label--remote-secret-error-invalid-state',
            'App Has Been Locked',
          ),
          description: $i18n.t(
            'dialog--startup-unlock.prose--remote-secret-error-invalid-state',
            'An unknown error in relation to DualLock occurred. Please try again or contact your administrator.',
          ),
        };

      case 'mismatch':
        return {
          type: 'error',
          title: $i18n.t(
            'dialog--startup-unlock.label--remote-secret-error-mismatch',
            'DualLock Token Not Found',
          ),
          description: $i18n.t(
            'dialog--startup-unlock.prose--remote-secret-error-mismatch',
            'The DualLock token to decrypt your chats could not be found. Please contact your administrator for more information.',
          ),
        };

      case 'network-error':
        return {
          type: 'error',
          title: $i18n.t(
            'dialog--startup-unlock.label--remote-secret-error-network-error',
            'DualLock Network Error',
          ),
          description: $i18n.t(
            'dialog--startup-unlock.prose--remote-secret-error-network-error',
            'The connection for fetching the DualLock token failed because of a network error. Please try again.',
          ),
        };

      case 'not-found':
        return {
          type: 'error',
          title: $i18n.t(
            'dialog--startup-unlock.label--remote-secret-error-not-found',
            'DualLock Token Not Found',
          ),
          description: $i18n.t(
            'dialog--startup-unlock.prose--remote-secret-error-not-found',
            'The DualLock token to decrypt your chats could not be found. Please contact your administrator for more information.',
          ),
        };

      case 'rate-limit-exceeded':
        return {
          type: 'error',
          title: $i18n.t(
            'dialog--startup-unlock.label--remote-secret-error-rate-limit-exceeded',
            'Maximal Number of Fetching Requests Exceeded',
          ),
          description: $i18n.t(
            'dialog--startup-unlock.prose--remote-secret-error-rate-limit-exceeded',
            'The connection for fetching the DualLock token failed because of too many attempts. Please try again in a few seconds.',
          ),
        };

      case 'server-error':
        return {
          type: 'error',
          title: $i18n.t(
            'dialog--startup-unlock.label--remote-secret-error-server-error',
            'Fetching DualLock Token Failed',
          ),
          description: $i18n.t(
            'dialog--startup-unlock.prose--remote-secret-error-server-error',
            'The DualLock token to decrypt your chats could not be fetched. Please check your Internet connection and try again.',
          ),
        };

      case 'timeout':
        return {
          type: 'error',
          title: $i18n.t(
            'dialog--startup-unlock.label--remote-secret-error-timeout',
            'Fetching Request Timed Out',
          ),
          description: $i18n.t(
            'dialog--startup-unlock.prose--remote-secret-error-timeout',
            'The connection for fetching the DualLock token timed out. Please try again.',
          ),
        };

      case 'unknown':
        return {
          type: 'error',
          title: $i18n.t(
            'dialog--startup-unlock.label--remote-secret-error-unknown',
            'App Has Been Locked',
          ),
          description: $i18n.t(
            'dialog--startup-unlock.prose--remote-secret-error-unknown',
            'An unknown error in relation to the Remote Secret occurred. Please try again or contact your administrator.',
          ),
        };

      default:
        return unreachable(remoteSecretError);
    }
  });

  onMount(() => {
    passwordInputComponent?.focusAndSelect();
  });
</script>

<div class="wrapper">
  <ModalDialog
    closableWithEscape={false}
    onconfirm={handleOnSubmit}
    scrollable={false}
    visible={true}
  >
    {#snippet snippetHeader()}
      <Title
        title={restartReason === undefined
          ? $i18n.t('dialog--startup-unlock.label--title', 'Enter App Password')
          : restartReason.title}
      />
    {/snippet}
    {#snippet snippetBody()}
      <div class="body" data-has-error={hasError}>
        {#if restartReason !== undefined}
          <div class="restart-reason" data-type={restartReason.type}>
            <span class="icon">
              {#if restartReason.type === 'error'}
                <MdIcon theme="Outlined">error</MdIcon>
              {:else if restartReason.type === 'info'}
                <MdIcon theme="Outlined">info</MdIcon>
              {:else}
                <!-- Do nothing. -->
              {/if}
            </span>
            <Text text={restartReason.description} />
          </div>
        {/if}
        <Password
          bind:this={passwordInputComponent}
          bind:value={password}
          error={hasError
            ? $i18n.t(
                'dialog--startup-unlock.error--incorrect-password',
                'The entered password is incorrect. Please try again.',
              )
            : undefined}
          label={$i18n.t('dialog--startup-unlock.label--password', 'App Password')}
          oninput={clearError}
          onkeydown={async (event) => {
            if (event.key === 'Enter' && !isSubmitting) {
              await handleOnSubmit();
            }
          }}
        />
        <div class="save">
          <Hint
            id="password-input-safe-storage-info-tooltip"
            icon="info"
            text={systemInfo.isSafeStorageAvailable
              ? $i18n.t(
                  'dialog--startup-unlock.prose--save-password-tooltip',
                  "Your password is stored using your system's default secure credential storage.",
                )
              : $i18n.t(
                  'dialog--startup-unlock.prose--save-password-tooltip-unavailable',
                  '{shortAppName} for Desktop could not detect a default secure credential storage on your device.',
                  {
                    shortAppName: import.meta.env.SHORT_APP_NAME,
                  },
                )}
          />
          <label for="savePassword">
            {$i18n.t('dialog--startup-unlock.label--save-password', 'Save securely on device')}
          </label>
          <Switch
            disabled={!systemInfo.isSafeStorageAvailable}
            bind:checked={shouldStorePasswordValue}
            onclick={handleClickSwitch}
            onkeydown={(event: KeyboardEvent) => {
              if (event.key === ' ') {
                handleClickSwitch(event);
              }
            }}
          />
        </div>
      </div>
    {/snippet}
    {#snippet snippetFooter()}
      <div class="footer">
        <Button
          disabled={password.length < minPasswordLength || hasError || isSubmitting}
          flavor="filled"
          onclick={handleOnSubmit}
        >
          {$i18n.t('dialog--common.action--continue', 'Continue')}
        </Button>
        <span class="hint">
          <button type="button" onclick={handleClickForgotPassword}>
            <Text
              verticalAlign="baseline"
              text={$i18n.t('dialog--startup-unlock.markup--password-hint', 'Forgot password?')}
            />
          </button>
        </span>
      </div>
    {/snippet}
  </ModalDialog>
</div>

{#if modalState === 'none'}
  <!-- No modal to display. -->
{:else if modalState === 'forgot-password'}
  <ForgotPasswordModal onclose={handleCloseForgotPasswordModal} {services} />
{:else}
  {svelteUnreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .wrapper {
    height: 100vh;
    display: grid;
    grid-template: 'app' min-content;
    place-content: center;
    color: var(--t-text-e1-color);
    background-color: var(--t-pairing-background-color);
  }

  .body {
    width: rem(480px);
    max-width: 100%;
    padding: rem(16px) rem(16px) rem(16px) rem(16px);

    .restart-reason {
      display: flex;
      flex-direction: row;
      align-items: start;
      justify-content: stretch;
      gap: rem(6px);
      padding: rem(8px) rem(6px);
      margin-bottom: rem(12px);
      border-radius: rem(8px);

      &[data-type='error'] {
        background-color: var(--t-alert-box-error-background-color);
        color: var(--t-alert-box-error-color);

        .icon {
          color: var(--t-alert-box-error-color);
          font-size: rem(24px);
        }
      }

      &[data-type='info'] {
        background-color: var(--t-alert-box-info-background-color);
        color: var(--t-alert-box-info-color);

        .icon {
          color: var(--t-alert-box-info-color);
          font-size: rem(24px);
        }
      }
    }

    .save {
      display: flex;
      flex-direction: row-reverse;
      gap: rem(8px);
      margin-top: rem(16px);
      color: var(--t-text-e2-color);
    }
  }

  .footer {
    padding: rem(16px);
    display: grid;

    .hint {
      display: flex;
      align-items: center;
      justify-content: center;

      button {
        @extend %neutral-input;
        @include clicktarget-link-rect;

        & {
          border: solid em(1px) transparent;
          cursor: pointer;
          color: var(--t-text-e2-color);
          margin-top: rem(8px);
          text-decoration: underline;
        }
      }
    }
  }
</style>
