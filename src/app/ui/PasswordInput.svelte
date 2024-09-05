<script lang="ts">
  import {onMount} from 'svelte';

  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import ForgotPasswordModal from '~/app/ui/components/partials/modals/forgot-password-modal/ForgotPasswordModal.svelte';
  import {i18n} from '~/app/ui/i18n';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import Password from '~/app/ui/svelte-components/blocks/Input/Password.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import {unreachable} from '~/common/utils/assert';
  import {ResolvablePromise} from '~/common/utils/resolvable-promise';

  /**
   * The previously attempted password. If provided, a 'wrong password' error message will be
   * shown.
   */
  export let previouslyAttemptedPassword: string | undefined;

  /**
   * A promise that can be awaited. It will resolve once the password been entered by the user.
   */
  export const passwordPromise = new ResolvablePromise<string>({uncaught: 'default'});

  const minPasswordLength = 1;

  let modalState: 'none' | 'forgot-password' = 'none';
  let hasError: boolean = previouslyAttemptedPassword !== undefined;
  let isSubmitted: boolean = false;
  let password: string = previouslyAttemptedPassword ?? '';

  let passwordInput: Password;

  function handleOnSubmit(): void {
    if (password.length >= minPasswordLength) {
      isSubmitted = true;
      passwordPromise.resolve(password);
    }
  }

  function handleClickForgotPassword(): void {
    modalState = 'forgot-password';
  }

  function handleCloseForgotPasswordModal(): void {
    hasError = false;
    modalState = 'none';
  }

  function clearError(): void {
    hasError = false;
  }

  onMount(() => {
    passwordInput.focusAndSelect();
  });
</script>

<div class="wrapper">
  <ModalDialog visible={true} closableWithEscape={false} on:confirm={handleOnSubmit}>
    <Title
      slot="header"
      title={$i18n.t('dialog--startup-unlock.label--title', 'Enter App Password')}
    />
    <div class="body" slot="body" data-has-error={hasError}>
      <Password
        bind:this={passwordInput}
        bind:value={password}
        error={hasError
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
    </div>
    <div class="footer" slot="footer">
      <Button
        disabled={password.length < minPasswordLength || isSubmitted || hasError}
        flavor="filled"
        isLoading={isSubmitted}
        on:click={handleOnSubmit}
      >
        {$i18n.t('dialog--startup-unlock.action--confirm', 'Continue')}
      </Button>
      <span class="hint">
        <button type="button" on:click={handleClickForgotPassword}>
          <Text
            text={$i18n.t('dialog--startup-unlock.markup--password-hint', 'Forgot password?')}
          />
        </button>
      </span>
    </div>
  </ModalDialog>
</div>
{#if modalState === 'none'}
  <!--No modal to display-->
{:else if modalState === 'forgot-password'}
  <ForgotPasswordModal on:close={handleCloseForgotPasswordModal} />
{:else}
  {unreachable(modalState)}
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
