<!--
  @component Renders a system dialog to inform the user about incompatible device cookies.
-->
<script lang="ts">
  import {tick} from 'svelte';

  import {globals} from '~/app/globals';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {InvalidWorkCredentialsDialogProps} from '~/app/ui/components/partials/system-dialog/internal/invalid-work-credentials-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import CircularProgress from '~/app/ui/svelte-components/blocks/CircularProgress/CircularProgress.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import Password from '~/app/ui/svelte-components/blocks/Input/Password.svelte';
  import TextInput from '~/app/ui/svelte-components/blocks/Input/Text.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {assertUnreachable} from '~/common/utils/assert';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.invalid-work-credentials-dialog');

  type $$Props = InvalidWorkCredentialsDialogProps;

  export let onSelectAction: $$Props['onSelectAction'] = undefined;
  export let services: $$Props['services'];
  export let target: $$Props['target'] = undefined;
  export let workCredentials: $$Props['workCredentials'];

  const {backend} = services.unwrap();

  // To prevent user from viewing previous password, replace it with a placeholder.
  // When submitting the form, if the placeholder text is unchanged, submit the original password.
  const PASSWORD_PLACEHOLDER = '•'.repeat(Math.max(6, workCredentials.password.length));

  let modalComponent: SvelteNullableBinding<Modal> = null;

  let username = workCredentials.username;
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
    return password === PASSWORD_PLACEHOLDER ? workCredentials.password : password;
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

    // Check newly input credentials.
    let status;
    try {
      status = await backend.work.checkLicense({
        username,
        password: getPassword(),
      });
    } catch (error) {
      log.error(`Work license check failed: ${error}`);
      checkingCredentials = false;
      credentialsValidity = $i18n.t(
        'dialog--invalid-work-credentials.error--validation-failed',
        'Validation of Threema Work credentials failed. Please check your Internet connection and try again.',
      );
      return;
    }

    // Persist new credentials.
    //
    // TODO(DESK-1373): Periodic work credential check broken after credential update.
    checkingCredentials = false;
    credentialsValidity = status.valid ? true : status.message;
    tick()
      .then(() => keyStoragePasswordInput?.focusAndSelect())
      .catch(assertUnreachable);
  }

  function storeCredentials(modal: typeof modalComponent): void {
    log.info('Storing credentials');
    clearKeyStorageError();
    checkingKeyStoragePassword = true;
    backend.keyStorage
      .changeWorkCredentials(keyStoragePassword, {
        username,
        password: getPassword(),
      })
      .then(() => {
        // Success! Show a toast and close.
        toast.addSimpleSuccess(
          $i18n.t(
            'dialog--invalid-work-credentials.prose--update-success',
            'Threema Work credentials successfully updated',
          ),
        );
        onSelectAction?.('confirmed');
        modal?.close();
      })
      .catch(() => {
        // Error. Probably a wrong key storage password.
        keyStoragePasswordValidity = false;
        checkingKeyStoragePassword = false;
      });
  }

  function deleteProfileAndRestartApp(): void {
    deletingProfile = true;
    backend.connectionManager
      .selfKickFromMediator()
      .then(() => {
        window.app.deleteProfileAndRestartApp({createBackup: true});
      })
      .catch((error: unknown) => {
        // TODO(DESK-1228): Delete profile anyways if selfkick failed?
        log.error(`deleteProfileAndRestartApp failed: ${error}`);
        deleteProfileError = $i18n.t(
          'dialog--invalid-work-credentials.error--unlinking-failed',
          'Could not unlink this device. Please check your Internet connection and try again.',
        );
        deletingProfile = false;
      });
  }
</script>

<Modal
  bind:this={modalComponent}
  {target}
  wrapper={{
    type: 'card',
    title: $i18n.t(
      'dialog--invalid-work-credentials.label--title',
      'Invalid Threema Work Credentials',
    ),
    minWidth: 340,
    maxWidth: 460,
  }}
  options={{
    allowClosingWithEsc: false,
    allowSubmittingWithEnter: false,
    overlay: 'opaque',
    suspendHotkeysWhenVisible: true,
  }}
  on:close
>
  <div class="content">
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
          error={credentialsValidity === undefined || credentialsValidity === true ? undefined : ''}
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
                  'dialog--invalid-work-credentials.error--incorrect-password',
                  'The entered password is incorrect. Please try again.',
                )
              : undefined}
            label={$i18n.t('dialog--invalid-work-credentials.label--app-password', 'App Password')}
            on:input={clearKeyStorageError}
            on:keydown={(event) => {
              if (event.key === 'Enter') {
                storeCredentials(modalComponent);
              }
            }}
          />
        </div>
        <div class="action-button">
          <Button
            flavor="filled"
            disabled={checkingKeyStoragePassword || keyStoragePassword.length === 0}
            on:click={() => storeCredentials(modalComponent)}
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
          'Remove the current link, and relink {appName} for desktop to your mobile device. The message history will be restored after relinking.',
          {appName: import.meta.env.APP_NAME},
        )}
      </p>
      <div class="action-button">
        <Button flavor="filled" disabled={deletingProfile} on:click={deleteProfileAndRestartApp}>
          {$i18n.t('dialog--invalid-work-credentials.action--relink', 'Relink Device')}
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
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    padding: 0 rem(16px) rem(16px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: rem(16px);

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
  }
</style>
