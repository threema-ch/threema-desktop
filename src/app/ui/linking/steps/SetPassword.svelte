<script lang="ts">
  import {onMount} from 'svelte';

  import {APP_CONFIG} from '~/app/config';
  import Hint from '~/app/ui/components/atoms/hint/Hint.svelte';
  import Switch from '~/app/ui/components/atoms/switch/Switch.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {LinkingWizardSetPasswordProps} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import Password from '~/app/ui/svelte-components/blocks/Input/Password.svelte';

  type $$Props = LinkingWizardSetPasswordProps;

  export let userPassword: $$Props['userPassword'];
  export let shouldStorePassword: $$Props['shouldStorePassword'];
  export let isSafeStorageAvailable: $$Props['isSafeStorageAvailable'];

  let passwordComponent: Password | null = null;

  let password = '';
  let shouldStorePasswordValue = isSafeStorageAvailable;
  let confirmation = '';
  let showErrors = false;
  let errors: {minPasswordLength: string | undefined; passwordEquality: string | undefined};

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

  $: errors = {
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
  };

  onMount(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    passwordComponent?.focus();
  });

  function handleClickSwitch(event: MouseEvent): void {
    event.preventDefault();

    if (!isSafeStorageAvailable) {
      return;
    }

    shouldStorePasswordValue = !shouldStorePasswordValue;
  }
</script>

<template>
  <Step scrollable={false}>
    <header>
      <h1>{$i18n.t('dialog--linking-set-password.label--title', 'Set Password')}</h1>
      <p class="intro">
        {$i18n.t(
          'dialog--linking-set-password.prose--intro',
          'The password will protect your messages, Threema ID and other data on this computer. You have to enter it when starting Threema for Desktop.',
        )}
      </p>
    </header>

    <div class="body">
      <div class="form">
        <Password
          bind:this={passwordComponent}
          bind:value={password}
          label={$i18n.t('dialog--linking-set-password.label--password', 'Password')}
          error={showErrors ? errors.minPasswordLength : undefined}
          on:input={handleInput}
          on:keydown={(event) => {
            if (event.key === 'Enter') {
              handleSubmit();
            }
          }}
        />
        <Password
          bind:value={confirmation}
          label={$i18n.t('dialog--linking-set-password.label--repeat-password', 'Repeat Password')}
          error={showErrors ? errors.passwordEquality : undefined}
          on:input={handleInput}
          on:keydown={(event) => {
            if (event.key === 'Enter') {
              handleSubmit();
            }
          }}
        />
        <div>
          <div class="save">
            <Hint
              icon="info"
              text={isSafeStorageAvailable
                ? $i18n.t(
                    'dialog--linking-set-password.prose--save-password-tooltip',
                    "Your password is stored using your system's default secure credential storage.",
                  )
                : $i18n.t(
                    'dialog--linking-set-password.prose--save-password-tooltip-unavailable',
                    'Threema for Desktop could not detect a default secure credential storage on your device.',
                  )}
            />
            <label for="savePassword"
              >{$i18n.t(
                'dialog--linking-set-password.label--save-password',
                'Save securely on device',
              )}</label
            >
            <Switch
              role="switch"
              disabled={!isSafeStorageAvailable}
              bind:checked={shouldStorePasswordValue}
              on:click={handleClickSwitch}
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
      <a href={import.meta.env.URLS.overview.full} target="_blank" rel="noreferrer noopener"
        >{$i18n.t('dialog--linking-set-password.action--need-help', 'Need help?')}</a
      >
      <Button flavor="filled" on:click={handleSubmit}
        >{$i18n.t('dialog--linking-set-password.action--confirm', 'Next')}</Button
      >
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
