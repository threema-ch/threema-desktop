<script lang="ts">
  import {tick} from 'svelte';

  import Password from '~/app/ui/svelte-components/blocks/Input/Password.svelte';
  import CancelAndConfirm from '~/app/ui/svelte-components/blocks/ModalDialog/Footer/CancelAndConfirm.svelte';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import {APP_CONFIG} from '~/app/config';
  import type {AppServices} from '~/app/types';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {KeyStorageError} from '~/common/key-storage';
  import {assertError, unreachable} from '~/common/utils/assert';

  export let services: AppServices;

  const {router, backend} = services;

  let currentPasswordInput: Password;

  let currentPassword = '';
  let newPassword = '';
  let passwordConfirmation = '';
  let showErrors = false;
  let isCurrentPasswordCorrect = true;
  let isAttemptingToChangePassword = false;
  let errors: {
    newPasswordMustBeDifferent: string | undefined;
    currentPasswordPresent: string | undefined;
    currentPasswordIsIncorrect: string | undefined;
    minPasswordLength: string | undefined;
    passwordEquality: string | undefined;
  };

  async function attemptPasswordChange(): Promise<boolean> {
    isAttemptingToChangePassword = true;
    try {
      await backend.keyStorage.changePassword(currentPassword, newPassword);
      isCurrentPasswordCorrect = true;
    } catch (error) {
      assertError(error, KeyStorageError);
      switch (error.type) {
        case 'undecryptable':
          isCurrentPasswordCorrect = false;
          break;
        case 'not-found':
        case 'malformed':
        case 'invalid':
        case 'internal-error':
        case 'not-writable':
        case 'not-readable':
          // TODO(DESK-383): Assume a permission issue. This cannot be solved by
          //     overwriting. Gracefully return to the UI and notify the user.
          isCurrentPasswordCorrect = false;
          break;
        default:
          unreachable(error.type);
      }
    } finally {
      isAttemptingToChangePassword = false;
    }
    return isCurrentPasswordCorrect;
  }

  function handleInput(): void {
    showErrors = false;
    isCurrentPasswordCorrect = true;
  }

  async function handleSubmit(event?: CustomEvent): Promise<void> {
    event?.preventDefault();
    showErrors = true;
    if (hasAnyError) {
      return;
    }
    const wasSuccessfullyChanged = await attemptPasswordChange();
    if (wasSuccessfullyChanged) {
      router.closeModal();
      toast.addSimpleSuccess(
        $i18n.t(
          'dialog--change-password.success--password-changed',
          'Successfully changed password',
        ),
      );
    }
  }

  $: errors = {
    newPasswordMustBeDifferent:
      currentPassword !== newPassword
        ? undefined
        : $i18n.t(
            'dialog--change-password.error--new-password-must-be-different',
            'New password must be different from the old one.',
          ),
    currentPasswordPresent:
      currentPassword.length >= 1
        ? undefined
        : $i18n.t(
            'dialog--change-password.error--current-password-present',
            'Please enter your current password',
          ),
    currentPasswordIsIncorrect: isCurrentPasswordCorrect
      ? undefined
      : $i18n.t(
          'dialog--change-password.error--current-password-incorrect',
          'Your current password is incorrect',
        ),
    minPasswordLength:
      newPassword.length >= APP_CONFIG.MIN_PASSWORD_LENGTH
        ? undefined
        : $i18n.t(
            'dialog--change-password.error--password-length',
            'Please enter at least {n, plural, =1 {1 character} other {# characters}}',
            {n: APP_CONFIG.MIN_PASSWORD_LENGTH},
          ),
    passwordEquality:
      newPassword === passwordConfirmation
        ? undefined
        : $i18n.t('dialog--change-password.error--password-equality', 'Passwords do not match'),
  };

  $: if (!isCurrentPasswordCorrect) {
    void tick().then(() => currentPasswordInput.focusAndSelect());
  }

  let hasAnyError = false;
  $: hasAnyError = Object.values(errors).some((v) => v !== undefined);

  function closeModal(event?: CustomEvent): void {
    event?.preventDefault();
    if (isAttemptingToChangePassword) {
      return;
    }
    router.closeModal();
  }
</script>

<template>
  <ModalWrapper visible={true}>
    <ModalDialog
      visible={true}
      on:confirm={handleSubmit}
      on:close={closeModal}
      on:cancel={closeModal}
    >
      <Title
        slot="header"
        title={$i18n.t('dialog--change-password.label--title', 'Change Password')}
      />

      <div slot="body" class="body">
        <p class="intro">
          {$i18n.t(
            'dialog--change-password.prose--intro',
            'The password protects your messages, Threema ID and other data on this computer. You have to enter it when starting Threema for Desktop. Please note that there is no way to recover this password. If you forget it, you will have to link this device again.',
          )}
        </p>

        <div class="form">
          <Password
            bind:this={currentPasswordInput}
            bind:value={currentPassword}
            disabled={isAttemptingToChangePassword}
            label={$i18n.t('dialog--change-password.label--current-password', 'Current Password')}
            error={showErrors
              ? errors.currentPasswordIsIncorrect ?? errors.currentPasswordPresent
              : undefined}
            on:input={handleInput}
            on:keydown={async (event) => {
              if (event.key === 'Enter') {
                await handleSubmit();
              }
            }}
          />
          <Password
            bind:value={newPassword}
            disabled={isAttemptingToChangePassword}
            label={$i18n.t('dialog--change-password.label--new-password', 'New Password')}
            error={showErrors
              ? errors.minPasswordLength ?? errors.newPasswordMustBeDifferent
              : undefined}
            on:input={handleInput}
            on:keydown={async (event) => {
              if (event.key === 'Enter') {
                await handleSubmit();
              }
            }}
          />
          <Password
            bind:value={passwordConfirmation}
            disabled={isAttemptingToChangePassword}
            label={$i18n.t(
              'dialog--change-password.label--repeat-new-password',
              'Repeat New Password',
            )}
            error={showErrors ? errors.passwordEquality : undefined}
            on:input={handleInput}
            on:keydown={async (event) => {
              if (event.key === 'Enter') {
                await handleSubmit();
              }
            }}
          />
        </div>
      </div>

      <CancelAndConfirm
        slot="footer"
        cancelText={$i18n.t('dialog--change-password.action--cancel', 'Cancel')}
        confirmText={$i18n.t('dialog--change-password.action--confirm', 'Confirm')}
        buttonsState={isAttemptingToChangePassword ? 'loading' : 'default'}
        let:modal
        {modal}
      />
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    @extend %font-normal-400;

    max-width: rem(400px);

    padding: rem(16px);
    display: grid;
    gap: rem(16px);

    .form {
      display: grid;
      gap: rem(32px);

      :global([data-error='true']) {
        margin-bottom: rem(-18px);
      }
    }
  }
</style>
