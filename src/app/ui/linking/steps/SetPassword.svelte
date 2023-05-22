<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import Password from '#3sc/components/blocks/Input/Password.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {type LinkingWizardState} from '~/app/ui/linking';
  import Step from '~/app/ui/linking/Step.svelte';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  export let linkingWizardState: LinkingWizardState;
  unusedProp(linkingWizardState);

  const minPasswordLength = import.meta.env.DEBUG ? 1 : 8;

  let password = '';
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
      dispatchEvent('newpassword', password);
      return;
    }
  }

  const dispatchEvent = createEventDispatcher();

  $: errors = {
    minPasswordLength:
      password.length >= minPasswordLength
        ? undefined
        : $i18n.t(
            'dialog--linking-set-password.error--password-length',
            'Please enter at least {n, plural, =1 {1 character} other {# characters}}',
            {n: minPasswordLength},
          ),
    passwordEquality:
      password === confirmation
        ? undefined
        : $i18n.t(
            'dialog--linking-set-password.error--password-equality',
            'Passwords do not match',
          ),
  };
</script>

<template>
  <Step>
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
      </div>
    </div>

    <footer>
      <a href="https://threema.ch/faq/md_overview" target="_blank" rel="noreferrer noopener"
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
