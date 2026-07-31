<!--
  @component Renders a system dialog to force activation of Remote Secrets.
-->
<script lang="ts">
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import ForgotPasswordModal from '~/app/ui/components/partials/modals/forgot-password-modal/ForgotPasswordModal.svelte';
  import type {RemoteSecretsActivationDialogProps} from '~/app/ui/components/partials/system-dialog/internal/remote-secrets-activation-dialog/props';
  import {i18n} from '~/app/ui/i18n';
  import Password from '~/app/ui/svelte-components/blocks/Input/Password.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  const {
    onselectaction,
    previouslyAttemptedPassword,
    services,
  }: RemoteSecretsActivationDialogProps = $props();

  let modalComponent = $state<SvelteNullableBinding<Modal>>(null);
  let passwordInputComponent = $state<SvelteNullableBinding<Password>>(null);
  let hasError = $state<boolean>(previouslyAttemptedPassword !== undefined);
  let showPasswordForgottenModal = $state(false);

  let password = $state<string>('');

  function clearError(): void {
    hasError = false;
  }

  function handleClickConfirm(): void {
    onselectaction?.({type: 'confirmed', value: password});
    modalComponent?.close();
  }

  function handleCloseForgotPasswordModal(): void {
    showPasswordForgottenModal = false;
  }

  function handleClickForgotPassword(): void {
    showPasswordForgottenModal = true;
  }
</script>

<Modal
  bind:this={modalComponent}
  options={{
    allowClosingWithEsc: false,
    allowSubmittingWithEnter: false,
    overlay: 'opaque',
  }}
  wrapper={{
    type: 'card',
    title: $i18n.t(
      'dialog--remote-secrets-activation-dialog.label--title',
      'DualLock Has Been Activated',
    ),
    maxWidth: 500,
    buttons: [
      {
        isFocused: false,
        label: $i18n.t('dialog--common.action--continue'),
        onclick: handleClickConfirm,
        type: 'filled',
        disabled: password.length === 0,
      },
    ],
  }}
>
  {#if showPasswordForgottenModal && services.isSet()}
    <ForgotPasswordModal onclose={handleCloseForgotPasswordModal} services={services.unwrap()} />
  {/if}
  <div class="content">
    <div class="description">
      <SubstitutableText
        text={$i18n.t(
          'dialog--remote-secrets-activation-dialog.prose--description',
          'Your administrator has enabled DualLock. This feature keeps your chats safe if your device is lost or stolen. <slot_1>Learn more</slot_1>',
        )}
      >
        {#snippet slot_1(text)}
          <a href="https://threema.com/faq/duallock" target="_blank" rel="noreferrer noopener">
            {text}
          </a>
        {/snippet}
      </SubstitutableText>
    </div>
    <Password
      bind:this={passwordInputComponent}
      bind:value={password}
      error={hasError
        ? $i18n.t(
            'dialog--remote-secrets-activation-dialog.error--incorrect-password',
            'The entered password is incorrect. Please try again.',
          )
        : undefined}
      label={$i18n.t('dialog--remote-secrets-activation-dialog.label--password', 'App Password')}
      oninput={clearError}
      onkeydown={(event) => {
        if (event.key === 'Enter') {
          handleClickConfirm();
        }
      }}
    />
    {#if hasError}
      <span class="forgot-password">
        <button type="button" onclick={handleClickForgotPassword}>
          <Text
            verticalAlign="baseline"
            text={$i18n.t('dialog--startup-unlock.markup--password-hint', 'Forgot password?')}
          />
        </button>
      </span>
    {/if}
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    padding: 0 rem(16px);

    .description {
      padding-bottom: rem(24px);
    }

    .forgot-password {
      padding: rem(16px);
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
