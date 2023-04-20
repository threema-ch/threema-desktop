<script lang="ts">
  import {createEventDispatcher, onMount} from 'svelte';

  import Password from '#3sc/components/blocks/Input/Password.svelte';
  import CancelAndConfirm from '#3sc/components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {type ContextStore} from '~/app/ui/bootstrap/process-step';
  import {i18n} from '~/app/ui/i18n';
  import {type WritableStore} from '~/common/utils/store';

  export let contextStore: WritableStore<ContextStore>;

  let newPassword = contextStore.get().newPassword ?? '';
  let newPasswordConfirmation = '';

  const dispatchEvent = createEventDispatcher();

  const minPasswordLength = import.meta.env.DEBUG ? 1 : 8;

  let newPasswordInput: Password;
  let newPasswordConfirmationInput: Password;

  let newPasswordInputError: string | undefined;
  let newPasswordConfirmationInputError: string | undefined;

  function handleOnConfirm(): void {
    if (!checkErrors()) {
      setNewPasswordAndContinue();
    }
  }

  function setNewPasswordAndContinue(): void {
    contextStore.update((currentValue) => ({
      ...currentValue,
      newPassword,
    }));

    dispatchEvent('next');
  }

  onMount(() => {
    newPasswordInput.focus();
  });

  function hasNewPasswordInputError(): boolean {
    return newPasswordInputError !== undefined;
  }

  function checkNewPasswordInputError(): boolean {
    newPasswordInputError =
      newPassword.length < minPasswordLength
        ? i18n
            .get()
            .t('status.error.new-password-length', 'Please enter at least {min} characters', {
              min: minPasswordLength,
            })
        : undefined;

    return hasNewPasswordInputError();
  }

  function hasNewPasswordConfirmationInputError(): boolean {
    return newPasswordConfirmationInputError !== undefined;
  }

  function checkNewPasswordConfirmationInputError(): boolean {
    newPasswordConfirmationInputError =
      newPassword !== newPasswordConfirmation
        ? i18n.get().t('status.error.new-password-confirmation', 'Passwords do not match')
        : undefined;

    return hasNewPasswordConfirmationInputError();
  }

  function checkErrors(): boolean {
    return checkNewPasswordInputError() || checkNewPasswordConfirmationInputError();
  }

  function hasErrors(): boolean {
    return hasNewPasswordInputError() || hasNewPasswordConfirmationInputError();
  }

  function clearErrors(): void {
    newPasswordInputError = undefined;
    newPasswordConfirmationInputError = undefined;
  }

  function persistNewPasswordInContext(updatedNewPassword: string): void {
    contextStore.update((currentStoreValue) => ({
      ...currentStoreValue,
      newPassword: updatedNewPassword,
    }));
  }

  $: persistNewPasswordInContext(newPassword);
</script>

<template>
  <div class="wrapper">
    <ModalDialog
      visible={true}
      closableWithEscape={false}
      on:confirm={(event) => {
        // Prevent close of this modal dialog
        event.preventDefault();
        handleOnConfirm();
      }}
      on:cancel={() => dispatchEvent('prev')}
    >
      <Title slot="header" title={$i18n.t('topic.start.new-password-title', 'Set Password')} />
      <div class="body" slot="body">
        <div class="hint">
          {$i18n.t(
            'topic.start.new-password-hint',
            'The password will protect your messages, Threema ID and other data on this computer. You have to enter it when starting Threema for Desktop.',
          )}
        </div>
        <div class="passwordInput" data-has-error={newPasswordInputError !== undefined}>
          <Password
            error={newPasswordInputError}
            bind:this={newPasswordInput}
            label={$i18n.t('topic.start.new-password-input-label', 'New Password')}
            bind:value={newPassword}
            on:input={clearErrors}
            on:keydown={(event) => {
              if (event.key === 'Enter' && !checkNewPasswordInputError()) {
                newPasswordConfirmationInput.focus();
              }
            }}
          />
        </div>
        <div class="passwordInput" data-has-error={newPasswordConfirmationInputError !== undefined}>
          <Password
            error={newPasswordConfirmationInputError}
            bind:this={newPasswordConfirmationInput}
            label={$i18n.t('topic.start.new-password-confirmation-input-label', 'Confirm Password')}
            bind:value={newPasswordConfirmation}
            on:input={clearErrors}
            on:keydown={(event) => {
              if (event.key === 'Enter') {
                handleOnConfirm();
              }
            }}
          />
        </div>
      </div>
      <CancelAndConfirm
        slot="footer"
        let:modal
        {modal}
        confirmText={$i18n.t('common.next', 'Next')}
        cancelText={$i18n.t('common.back', 'Back')}
        confirmDisabled={hasErrors()}
      />
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
    padding: rem(16px) rem(16px) rem(20px) rem(16px);

    .hint {
      margin-bottom: rem(25px);
      color: var(--t-text-e2-color);
    }

    .passwordInput {
      &[data-has-error='false'] {
        margin-bottom: rem(25px);
      }
      &[data-has-error='true'] {
        margin-bottom: rem(7px);
      }
    }
  }
</style>
