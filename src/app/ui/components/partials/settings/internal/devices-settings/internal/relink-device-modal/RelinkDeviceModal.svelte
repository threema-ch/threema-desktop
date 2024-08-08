<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {RelinkDeviceModalProps} from '~/app/ui/components/partials/settings/internal/devices-settings/internal/relink-device-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {unlinkAndCreateBackup} from '~/app/ui/utils/profile';
  import {assertUnreachable} from '~/common/utils/assert';

  type $$Props = RelinkDeviceModalProps;

  export let services: $$Props['services'];

  async function handleClickConfirmAndRestart(): Promise<void> {
    try {
      await unlinkAndCreateBackup(services);
    } catch (error) {
      toast.addSimpleFailure(
        $i18n.t(
          'dialog--relink-profile.prose--failed',
          'Something went wrong when relinking your profile. Please check your connection and try again',
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
        label: $i18n.t('dialog--relink-profile.action--cancel', 'Cancel'),
        type: 'naked',
        onClick: 'close',
      },
      {
        label: $i18n.t('dialog--relink-profile.label--title', 'Relink this Device'),
        type: 'filled',
        onClick: () => {
          handleClickConfirmAndRestart().catch(assertUnreachable);
        },
      },
    ],
    title: $i18n.t('dialog--relink-profile.label--title', 'Relink this Device'),

    maxWidth: 520,
  }}
  on:close
>
  <div class="content">
    <div class="description">
      <p>
        <Text
          text={$i18n.t(
            'dialog--relink-profile.prose--description-p1',
            'This device will be unlinked, and the application will restart.',
          )}
        />
      </p>
      <p>
        <Text
          text={$i18n.t(
            'dialog--relink-profile.prose--description-p2',
            'Your messages will be kept if you relink with the same Threema ID as before.',
          )}
        />
      </p>
    </div>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;
  .content {
    padding: 0 rem(16px);

    p:first-child {
      margin-top: 0;
    }

    p:last-child {
      margin-bottom: 0;
    }
  }
</style>
