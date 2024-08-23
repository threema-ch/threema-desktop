<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {RestorationIdentityMismatchProps} from '~/app/ui/linking';

  type $$Props = RestorationIdentityMismatchProps;

  export let accept: $$Props['accept'];

  let state: 'default' | 'loading' = 'default';

  function handleContinue(): void {
    state = 'loading';
    accept.resolve();
  }
</script>

<Modal
  wrapper={{
    type: 'card',
    buttons: [
      {
        label: $i18n.t('dialog--linking-restoration-identity-mismatch.action--confirm', 'Retry'),
        type: 'naked',
        onClick: () => window.location.reload(),
      },
      {
        label: $i18n.t(
          'dialog--linking-restoration-identity-mismatch.label--continue',
          'Link Without Chat History',
        ),
        type: 'filled',
        state,
        onClick: handleContinue,
      },
    ],
    title: $i18n.t(
      'dialog--linking-restoration-identity-mismatch.label--title',
      'Restore Messages',
    ),
    maxWidth: 460,
  }}
  options={{
    allowClosingWithEsc: false,
    allowSubmittingWithEnter: false,
  }}
  on:close
>
  <div class="content">
    <div class="description">
      <Text
        text={$i18n.t(
          'dialog--linking-restoration-identity-mismatch.prose--intro',
          'A different Threema ID was previously used on this device. Your chat history cannot be restored.',
        )}
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
  }
</style>
