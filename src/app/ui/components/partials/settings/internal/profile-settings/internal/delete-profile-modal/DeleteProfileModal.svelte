<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {DeleteProfileModalProps} from '~/app/ui/components/partials/settings/internal/profile-settings/internal/delete-profile-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {assertUnreachable} from '~/common/utils/assert';

  type $$Props = DeleteProfileModalProps;

  export let services: $$Props['services'];

  async function handleClickConfirmAndRestart(): Promise<void> {
    try {
      await services.backend.connectionManager.selfKickFromMediator();
      window.app.removeOldProfiles();
      window.app.deleteProfileAndRestartApp({createBackup: false});
    } catch (error) {
      toast.addSimpleFailure(
        $i18n.t(
          'dialog--delete-profile.prose--failed',
          'Something went wrong when deleting your data on this device. Please check your connection and try again.',
        ),
      );
    }
  }
</script>

<Modal
  wrapper={{
    type: 'card',
    actions: [
      {
        iconName: 'close',
        onClick: 'close',
      },
    ],
    buttons: [
      {
        label: $i18n.t('dialog--delete-profile.action--cancel', 'Cancel'),
        type: 'naked',
        onClick: 'close',
      },
      {
        label: $i18n.t('dialog--delete-profile.label--title', 'Remove Threema ID and Data'),
        type: 'filled',
        onClick: () => {
          handleClickConfirmAndRestart().catch(assertUnreachable);
        },
      },
    ],
    title: $i18n.t('dialog--delete-profile.label--title', 'Remove Threema ID and Data'),
    maxWidth: 520,
  }}
  on:close
>
  <div class="content">
    <div class="description">
      <Text
        text={$i18n.t(
          'dialog--delete-profile.prose--description',
          'This Threema ID and the corresponding data will be removed from this device (but not on your other devices).',
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
