<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Input from '~/app/ui/components/atoms/input/Input.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {EditDeviceNameModalProps} from '~/app/ui/components/partials/settings/internal/devices-settings/internal/edit-device-name-modal/props';
  import {i18n} from '~/app/ui/i18n';

  type $$Props = EditDeviceNameModalProps;

  export let value: $$Props['value'];
  export let maxlength: $$Props['maxlength'] = 128;

  const dispatch = createEventDispatcher<{
    newDeviceName: string;
  }>();

  function isValidDeviceName(deviceName: string): boolean {
    return deviceName !== '';
  }

  function handleClickConfirm(): void {
    if (!isValidDeviceName(value)) {
      return;
    }

    dispatch('newDeviceName', value);
  }
</script>

<template>
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
          label: $i18n.t('dialog--edit-device-name.action--cancel', 'Cancel'),
          type: 'naked',
          onClick: 'close',
        },
        {
          label: $i18n.t('dialog--edit-device-name.action--confirm', 'Confirm'),
          type: 'filled',
          onClick: handleClickConfirm,
        },
      ],
      title: $i18n.t('dialog--edit-device-name.action--title', 'Edit Device Name'),
      minWidth: 280,
      maxWidth: 460,
    }}
    options={{
      allowClosingWithEsc: true,
      allowSubmittingWithEnter: true,
    }}
    on:close
    on:submit={handleClickConfirm}
  >
    <div class="content">
      <Input
        bind:value
        autofocus
        id="device-name"
        {maxlength}
        error={isValidDeviceName(value)
          ? undefined
          : $i18n.t(
              'dialog--edit-device-name.error--device-name-empty',
              'Device name must not be empty',
            )}
      />
    </div>
  </Modal>
</template>

<style lang="scss">
  @use 'component' as *;

  .content {
    padding: 0 rem(16px);
  }
</style>
