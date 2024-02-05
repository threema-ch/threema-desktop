<script lang="ts">
  import {tick} from 'svelte';

  import type {AppServices} from '~/app/types';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import {toast} from '~/app/ui/snackbar';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import CircularProgress from '~/app/ui/svelte-components/blocks/CircularProgress/CircularProgress.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import Password from '~/app/ui/svelte-components/blocks/Input/Password.svelte';
  import TextInput from '~/app/ui/svelte-components/blocks/Input/Text.svelte';
  import type {Modal} from '~/app/ui/svelte-components/blocks/ModalDialog';
  import Title from '~/app/ui/svelte-components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {workLicenseCheck} from '~/common/dom/network/protocol/work-license-check';
  import type {Logger} from '~/common/logging';
  import type {InvalidWorkCredentialsDialog} from '~/common/system-dialog';
  import {assertUnreachable} from '~/common/utils/assert';
  import type {Delayed} from '~/common/utils/delayed';

  export let log: Logger;
  export let visible: boolean;
  export let appServices: Delayed<AppServices>;
  export let context: InvalidWorkCredentialsDialog['context'];

  const {backend, systemInfo} = appServices.unwrap();

  // To prevent user from viewing previous password, replace it with a placeholder.
  // When submitting the form, if the placeholder text is unchanged, submit the original password.
  const PASSWORD_PLACEHOLDER = '•'.repeat(Math.max(6, context.workCredentials.password.length));

  let username = context.workCredentials.username;
  let password = PASSWORD_PLACEHOLDER;
  let checkingCredentials = false;
  let credentialsValidity: undefined | true | string;

  let checkingKeyStoragePassword = false;
  let keyStoragePasswordInput: SvelteNullableBinding<Password>;
  let keyStoragePassword = '';
  let keyStoragePasswordValidity: undefined | boolean;

  let deletingProfile = false;
  let deleteProfileError: undefined | string;

  function getPassword(): string {
    return password === PASSWORD_PLACEHOLDER ? context.workCredentials.password : password;
  }

  function clearCredentialsError(): void {
    credentialsValidity = undefined;
  }

  function clearKeyStorageError(): void {
    keyStoragePasswordValidity = undefined;
  }

  function onCredentialsKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      checkCredentials().catch(assertUnreachable);
    }
  }

  async function checkCredentials(): Promise<void> {
    log.info('Checking Threema work license');
    clearCredentialsError();
    checkingCredentials = true;
    await appServices.unwrap().backend.config.DIRECTORY_SERVER_URL.then((url) => {
      workLicenseCheck(
        url,
        {
          username,
          password: getPassword(),
        },
        systemInfo,
        log,
      )
        .then((result) => {
          checkingCredentials = false;
          credentialsValidity = result.valid ? true : result.message;
          tick()
            .then(() => keyStoragePasswordInput?.focusAndSelect())
            .catch(assertUnreachable);
        })
        .catch((error) => {
          log.error(`Work license check failed: ${error}`);
          checkingCredentials = false;
          credentialsValidity = `
          ${$i18n.t(
            'dialog--invalid-work-credentials.error--validation-failed',
            'Validation of Threema Work credentials failed.',
          )} ${$i18n.t('system.error--check-internet-and-retry')}
          `;
        });
    });
  }

  function storeCredentials(modal: Modal): void {
    log.info('Storing credentials');
    clearKeyStorageError();
    checkingKeyStoragePassword = true;
    backend.keyStorage
      .changeWorkCredentials(keyStoragePassword, {
        username,
        password: getPassword(),
      })
      .then(() => {
        // Success! Show a toast and close
        toast.addSimpleSuccess(
          $i18n.t(
            'dialog--invalid-work-credentials.prose--update-success',
            'Threema Work credentials successfully updated',
          ),
        );
        modal.close();
      })
      .catch((error) => {
        // Error. Probably a wrong key storage password.
        keyStoragePasswordValidity = false;
        checkingKeyStoragePassword = false;
      });
  }

  function deleteProfileAndRestartApp(): void {
    deletingProfile = true;
    const ipc = window.app;
    backend
      .selfKickFromMediator()
      .then(() => {
        ipc.deleteProfileAndRestartApp();
      })
      .catch((error) => {
        // TODO(DESK-1228): Delete profile anyways if selfkick failed?
        log.error(`deleteProfileAndRestartApp failed: ${error}`);
        deleteProfileError = `${$i18n.t(
          'dialog--invalid-work-credentials.error--unlinking-failed',
          'Could not unlink this device.',
        )} ${$i18n.t('system.error--check-internet-and-retry')}`;
        deletingProfile = false;
      });
  }
</script>

<template>
  <ModalWrapper {visible}>
    <ModalDialog bind:visible on:close closableWithEscape={false}>
      <Title
        slot="header"
        title={$i18n.t(
          'dialog--invalid-work-credentials.label--title',
          'Invalid Threema Work Credentials',
        )}
      />
      <div class="body" slot="body" let:modal>
        <section class="intro-text">
          <p>
            {$i18n.t(
              'dialog--invalid-work-credentials.prose--description-p1',
              'The credentials for Threema Work are invalid. Either they were disabled by your Threema Work admin, or your Threema Work license expired.',
            )}
          </p>
          <p>
            {$i18n.t(
              'dialog--invalid-work-credentials.prose--description-p2',
              'To continue using {appName} for desktop, you have two options:',
              {appName: import.meta.env.APP_NAME},
            )}
          </p>
        </section>

        <section class="option1">
          <h3>
            {$i18n.t(
              'dialog--invalid-work-credentials.label--subtitle-option-1',
              'Option 1: Enter Valid Credentials',
            )}
          </h3>
          <p>
            {$i18n.t(
              'dialog--invalid-work-credentials.prose--description-enter-credentials',
              "Please enter valid Threema Work credentials. If you don't know the credentials, please contact your Threema Work administrator.",
            )}
          </p>
          <div class="form-fields">
            <TextInput
              label={$i18n.t('dialog--invalid-work-credentials.label--username', 'Username')}
              bind:value={username}
              spellcheck={false}
              disabled={checkingCredentials || credentialsValidity === true}
              error={credentialsValidity === undefined || credentialsValidity === true
                ? undefined
                : ''}
              on:input={clearCredentialsError}
              on:keydown={onCredentialsKeyDown}
            />
            <Password
              label={$i18n.t('dialog--invalid-work-credentials.label--password')}
              bind:value={password}
              disabled={checkingCredentials || credentialsValidity === true}
              error={credentialsValidity === undefined || credentialsValidity === true
                ? undefined
                : $i18n.t(
                    'dialog--invalid-work-credentials.error--invalid-credentials',
                    'Invalid credentials: {message}',
                    {message: credentialsValidity},
                  )}
              on:input={clearCredentialsError}
              on:keydown={onCredentialsKeyDown}
            />
          </div>
          {#if credentialsValidity !== true}
            <div class="action-button">
              <Button
                flavor="filled"
                disabled={checkingCredentials || username.length === 0 || password.length === 0}
                on:click={checkCredentials}
              >
                {$i18n.t(
                  'dialog--invalid-work-credentials.label--check-credentials',
                  'Re-Check Credentials',
                )}
              </Button>
              {#if checkingCredentials}
                <div class="loading">
                  <CircularProgress />
                </div>
              {/if}
            </div>
          {:else}
            <p class="success-message">
              <span class="icon"><MdIcon theme="Filled">check_circle</MdIcon></span>
              {$i18n.t(
                'dialog--invalid-work-credentials.prose--credentials-valid',
                'Credentials are valid! Please enter your app password to save the updated credentials:',
              )}
            </p>
            <div class="form-fields">
              <Password
                bind:this={keyStoragePasswordInput}
                bind:value={keyStoragePassword}
                disabled={checkingKeyStoragePassword}
                error={keyStoragePasswordValidity === false
                  ? $i18n.t(
                      'dialog--startup-unlock.error--incorrect-password',
                      'The entered password is incorrect. Please try again.',
                    )
                  : undefined}
                label={$i18n.t('dialog--startup-unlock.label--password', 'App Password')}
                on:input={clearKeyStorageError}
                on:keydown={(event) => {
                  if (event.key === 'Enter') {
                    storeCredentials(modal);
                  }
                }}
              />
            </div>
            <div class="action-button">
              <Button
                flavor="filled"
                disabled={checkingKeyStoragePassword || keyStoragePassword.length === 0}
                on:click={() => storeCredentials(modal)}
              >
                {$i18n.t(
                  'dialog--invalid-work-credentials.label--store-credentials',
                  'Save Credentials and Close',
                )}
              </Button>
              {#if checkingKeyStoragePassword}
                <div class="loading">
                  <CircularProgress />
                </div>
              {/if}
            </div>
          {/if}
        </section>

        <section class="option2">
          <h3>
            {$i18n.t(
              'dialog--invalid-work-credentials.label--subtitle-option-2',
              'Option 2: Relink Device',
            )}
          </h3>
          <p>
            {$i18n.t(
              'dialog--invalid-work-credentials.prose--description-relink',
              'Remove the current link, and relink {appName} for desktop to your mobile device. Please note that this will delete the chat history in the desktop app (but not on the mobile device).',
              {appName: import.meta.env.APP_NAME},
            )}
          </p>
          <div class="action-button">
            <Button
              flavor="filled"
              disabled={deletingProfile}
              on:click={deleteProfileAndRestartApp}
            >
              {$i18n.t(
                'dialog--invalid-work-credentials.action--relink',
                'Remove Local Profile and Relink Device',
              )}
            </Button>
            {#if deletingProfile}
              <div class="loading">
                <CircularProgress />
              </div>
            {/if}
          </div>
          {#if !deletingProfile && deleteProfileError !== undefined}
            <p class="error">{deleteProfileError}</p>
          {/if}
        </section>
      </div>
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    width: rem(480px);
    padding: rem(16px);
    border-radius: rem(8px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: rem(16px);
  }

  .intro-text p:first-child {
    margin-top: 0;
  }

  .intro-text p:last-child {
    margin-bottom: 0;
  }

  .form-fields {
    margin-bottom: 1em;
  }

  .success-message .icon {
    color: var(--t-color-success);
    position: relative;
    top: 0.15em;
  }

  .action-button {
    display: flex;
    gap: rem(16px);
    align-items: center;

    .loading {
      height: 1.8em;
      width: 1.8em;
    }
  }

  .error {
    color: var(--c-input-text-error-color);
    font-size: 0.85em;
  }
</style>
