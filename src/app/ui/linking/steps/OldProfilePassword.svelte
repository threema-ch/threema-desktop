<script lang="ts">
  import {onMount} from 'svelte';

  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {LinkingWizardOldProfilePasswordProps} from '~/app/ui/linking';
  import Password from '~/app/ui/svelte-components/blocks/Input/Password.svelte';

  type $$Props = LinkingWizardOldProfilePasswordProps;

  export let oldPassword: $$Props['oldPassword'];
  export let previouslyEnteredPassword: $$Props['previouslyEnteredPassword'] = undefined;
  export let buttonState: $$Props['buttonState'];

  let password = '';

  let showWrongPasswordMessage: boolean = false;
  $: showWrongPasswordMessage =
    previouslyEnteredPassword !== undefined && buttonState !== 'loading';

  function handleSubmit(): void {
    oldPassword.resolve(password);
    previouslyEnteredPassword = undefined;
  }

  function handleReject(): void {
    oldPassword.resolve(undefined);
  }

  onMount(() => {
    // Sanity check. This component should not be mounted from the backend when no old profile is
    // present.
    const oldProfile = window.app.getLatestProfilePath();
    if (oldProfile === undefined) {
      oldPassword.resolve(undefined);
    }
  });
</script>

<Modal
  wrapper={{
    type: 'card',
    buttons: [
      {
        label: $i18n.t('dialog--linking-old-profile-password.label--skip-restoration', 'Skip'),
        type: 'naked',
        onClick: handleReject,
      },
      {
        label: $i18n.t('dialog--linking-old-profile-password.action--confirm', 'Restore Messages'),
        type: 'filled',
        onClick: handleSubmit,
        buttonState,
      },
    ],
    title: $i18n.t('dialog--linking-old-profile-password.label--title', 'Restore Messages'),
    maxWidth: 460,
  }}
  options={{
    allowClosingWithEsc: false,
    allowSubmittingWithEnter: true,
  }}
  on:close
  on:submit={handleSubmit}
>
  <div class="content">
    <div class="description">
      <Text
        text={$i18n.t(
          'dialog--linking-old-profile-password.prose--intro',
          'Previous chats were found. To restore them, please enter the corresponding password. If you skip this step, the old chats will be deleted irrevocably.',
        )}
      />
    </div>
    <div class="input">
      <Password
        bind:value={password}
        label={$i18n.t('dialog--linking-old-profile-password.label--old-password', 'Password')}
        disabled={buttonState === 'loading'}
        error={showWrongPasswordMessage
          ? $i18n.t(
              'dialog--linking-old-profile-password.error--incorrect-password',
              'The entered password is incorrect. Please try again.',
            )
          : undefined}
        on:input={() => {
          showWrongPasswordMessage = false;
        }}
      />
    </div>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    .description {
      padding: 0 rem(16px);
    }
    .input {
      padding: rem(12px) rem(16px);
    }
  }
</style>
