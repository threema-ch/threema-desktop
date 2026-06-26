<script lang="ts">
  import {Switch} from '@threema/ui';
  import {onMount} from 'svelte';

  import {APP_CONFIG} from '~/app/config';
  import Hint from '~/app/ui/components/atoms/hint/Hint.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {LinkingWizardSetPasswordProps} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import Password from '~/app/ui/svelte-components/blocks/Input/Password.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  const {userPassword, shouldStorePassword, isSafeStorageAvailable}: LinkingWizardSetPasswordProps =
    $props();

  let passwordComponent = $state<SvelteNullableBinding<Password>>(null);

  let password = $state<string>('');
  let shouldStorePasswordValue = $state<boolean>(isSafeStorageAvailable);
  let confirmation = $state<string>('');
  let showErrors = $state<boolean>(false);
  const errors: {minPasswordLength: string | undefined; passwordEquality: string | undefined} =
    $derived({
      minPasswordLength:
        password.length >= APP_CONFIG.MIN_PASSWORD_LENGTH
          ? undefined
          : $i18n.t(
              'dialog--linking-set-password.error--password-length',
              'Please enter at least {n, plural, =1 {1 character} other {# characters}}',
              {n: APP_CONFIG.MIN_PASSWORD_LENGTH},
            ),
      passwordEquality:
        password === confirmation
          ? undefined
          : $i18n.t(
              'dialog--linking-set-password.error--password-equality',
              'Passwords do not match',
            ),
    });

  function handleInput(): void {
    showErrors = false;
  }

  function handleSubmit(): void {
    showErrors = true;

    const hasAnyError = Object.values(errors).some((v) => v !== undefined);
    if (!hasAnyError) {
      showErrors = false;
      shouldStorePassword.resolve(shouldStorePasswordValue);
      userPassword.resolve(password);
    }
  }

  function handleClickSwitch(event: Event): void {
    event.preventDefault();

    if (!isSafeStorageAvailable) {
      return;
    }

    shouldStorePasswordValue = !shouldStorePasswordValue;
  }

  onMount(() => {
    passwordComponent?.focus();
  });
</script>

<template>
  <Step scrollable={false}>
    <header>
      <h1>{$i18n.t('dialog--linking-set-password.label--title', 'Set Password')}</h1>
      <p class="intro">
        {$i18n.t(
          'dialog--linking-set-password.prose--intro',
          'The password will protect your messages, {shortAppName} ID and other data on this computer. You have to enter it when starting {shortAppName} for Desktop.',
          {
            shortAppName: import.meta.env.SHORT_APP_NAME,
          },
        )}
      </p>
    </header>

    <div class="body">
      <div class="form">
        <Password
          bind:this={passwordComponent}
          bind:value={password}
          error={showErrors ? errors.minPasswordLength : undefined}
          label={$i18n.t('dialog--linking-set-password.label--password', 'Password')}
          oninput={handleInput}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              handleSubmit();
            }
          }}
        />
        <Password
          bind:value={confirmation}
          error={showErrors ? errors.passwordEquality : undefined}
          label={$i18n.t('dialog--linking-set-password.label--repeat-password', 'Repeat Password')}
          oninput={handleInput}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              handleSubmit();
            }
          }}
        />
        <div>
          <div class="save">
            <Hint
              id="set-password-safe-storage-info-tooltip"
              icon="info"
              text={isSafeStorageAvailable
                ? $i18n.t(
                    'dialog--linking-set-password.prose--save-password-tooltip',
                    "Your password is stored using your system's default secure credential storage.",
                  )
                : $i18n.t(
                    'dialog--linking-set-password.prose--save-password-tooltip-unavailable',
                    '{shortAppName} for Desktop could not detect a default secure credential storage on your device.',
                    {shortAppName: import.meta.env.SHORT_APP_NAME},
                  )}
            />
            <label for="savePassword"
              >{$i18n.t(
                'dialog--linking-set-password.label--save-password',
                'Save securely on device',
              )}</label
            >
            <Switch
              bind:checked={shouldStorePasswordValue}
              disabled={!isSafeStorageAvailable}
              onclick={handleClickSwitch}
              onkeydown={(event: KeyboardEvent) => {
                if (event.key === ' ') {
                  handleClickSwitch(event);
                }
              }}
            />
          </div>
          <div class="save">
            {shouldStorePasswordValue
              ? $i18n.t(
                  'dialog--linking-set-password.prose--save-password--hint-true',
                  'You will be logged in automatically when you open the Desktop app.',
                )
              : $i18n.t(
                  'dialog--linking-set-password.prose---save-password-hint-false',
                  'You will need to enter your password each time you open the Desktop app.',
                )}
          </div>
        </div>
      </div>
    </div>

    <footer>
      {#if import.meta.env.URLS.overview !== 'hidden'}
        <a href={import.meta.env.URLS.overview.full} target="_blank" rel="noreferrer noopener">
          {$i18n.t('dialog--common.action--need-help', 'Need help?')}
        </a>
      {/if}
      <Button flavor="filled" onclick={handleSubmit}>
        {$i18n.t('dialog--common.action--next', 'Next')}
      </Button>
    </footer>
  </Step>
</template>

<style lang="scss">
  @use 'component' as *;

  h1,
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
      margin-bottom: rem(24px);
    }

    .intro {
      color: var(--t-text-e2-color);
    }
  }

  .body {
    .form {
      display: grid;
      gap: rem(20px);
    }

    .save {
      display: flex;
      flex-direction: row-reverse;
      gap: rem(8px);
      color: var(--t-text-e2-color);
    }
  }

  footer {
    display: grid;
    grid-auto-flow: column;
    justify-content: space-between;
    align-items: end;
    margin-top: rem(48px);

    a {
      color: var(--t-text-e2-color);
      text-decoration: none;
    }
  }
</style>
