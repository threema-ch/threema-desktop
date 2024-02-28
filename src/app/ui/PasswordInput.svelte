<script lang="ts">
  import {onMount} from 'svelte';

  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import {i18n} from '~/app/ui/i18n';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import Password from '~/app/ui/svelte-components/blocks/Input/Password.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import {ResolvablePromise} from '~/common/utils/resolvable-promise';

  /**
   * A promise that can be awaited. It will resolve once the password been entered by the user.
   */
  export const passwordPromise = new ResolvablePromise<string>({uncaught: 'default'});

  /**
   * The previously attempted password. If provided, a 'wrong password' error message will be
   * shown.
   */
  export let previouslyAttemptedPassword: string | undefined;

  let password: string = previouslyAttemptedPassword ?? '';

  let showErrorMessage: boolean = previouslyAttemptedPassword !== undefined;

  const minPasswordLength = 1;

  let passwordInput: Password;

  function handleOnSubmit(): void {
    if (password.length >= minPasswordLength) {
      passwordPromise.resolve(password);
    }
  }

  onMount(() => {
    passwordInput.focusAndSelect();
  });

  function clearError(): void {
    showErrorMessage = false;
  }
</script>

<template>
  <div class="wrapper">
    <ModalDialog visible={true} closableWithEscape={false} on:confirm={handleOnSubmit}>
      <Title
        slot="header"
        title={$i18n.t('dialog--startup-unlock.label--title', 'Enter App Password')}
      />
      <div class="body" slot="body" data-has-error={showErrorMessage}>
        <Password
          bind:this={passwordInput}
          bind:value={password}
          error={showErrorMessage
            ? $i18n.t(
                'dialog--startup-unlock.error--incorrect-password',
                'The entered password is incorrect. Please try again.',
              )
            : undefined}
          label={$i18n.t('dialog--startup-unlock.label--password', 'App Password')}
          on:input={clearError}
          on:keydown={(event) => {
            if (event.key === 'Enter') {
              handleOnSubmit();
            }
          }}
        />
        <div class="hint">
          <SubstitutableText
            text={$i18n.t(
              'dialog--startup-unlock.markup--password-hint',
              'Forgot password? Please consult the <1>FAQ</1>.',
            )}
          >
            <a
              slot="1"
              href={import.meta.env.URLS.forgotPassword.full}
              target="_blank"
              rel="noreferrer noopener"
              let:text>{text}</a
            >
          </SubstitutableText>
        </div>
      </div>
      <div class="footer" slot="footer">
        <Button
          flavor="filled"
          disabled={password.length < minPasswordLength || showErrorMessage}
          on:click={handleOnSubmit}
        >
          {$i18n.t('dialog--startup-unlock.action--confirm', 'Continue')}
        </Button>
      </div>
    </ModalDialog>
  </div>
</template>

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
    padding: rem(16px) rem(16px) rem(16px) rem(16px);
    .hint {
      color: var(--t-text-e2-color);
      a {
        color: var(--t-text-e2-color);
      }
    }

    &[data-has-error='false'] {
      .hint {
        padding-top: rem(24px);
      }
    }

    &[data-has-error='true'] {
      .hint {
        padding-top: rem(6px);
      }
    }
  }

  .footer {
    padding: rem(16px);
    display: grid;
  }
</style>
