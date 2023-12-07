<script lang="ts">
  import MdIcon from 'threema-svelte-components/src/components/blocks/Icon/MdIcon.svelte';
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import EditDeviceNameModal from '~/app/ui/components/partials/settings/internal/devices-settings/internal/edit-device-name-modal/EditDeviceNameModal.svelte';
  import type {DevicesSettingsProps} from '~/app/ui/components/partials/settings/internal/devices-settings/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {DEFAULT_DEVICE_NAME, type DevicesSettingsView} from '~/common/model/types/settings';
  import {ensureDeviceName} from '~/common/network/types';

  const log = globals.unwrap().uiLogging.logger('ui.component.settings-devices');

  type $$Props = DevicesSettingsProps;

  export let services: $$Props['services'];
  const {
    settings: {devices},
  } = services;

  $: deviceName = devices.get().view.deviceName ?? DEFAULT_DEVICE_NAME;

  function onClickEditDeviceName(): void {
    isEditDeviceNameModalVisible = true;
  }

  function onEditDeviceModalClose(): void {
    deviceName = devices.get().view.deviceName ?? DEFAULT_DEVICE_NAME;
    isEditDeviceNameModalVisible = false;
  }

  function setDeviceSettings<N extends keyof DevicesSettingsView>(
    newValue: DevicesSettingsView[N],
    changeName: N,
  ): void {
    devices
      .get()
      .controller.update({[changeName]: newValue})
      .catch(() => {
        deviceName = devices.get().view.deviceName ?? DEFAULT_DEVICE_NAME;
        log.error('Failed to update and reflect the device name');
        toast.addSimpleFailure(
          $i18n.t(
            'settings--devices-settings.prose--name-change-error',
            'Could not update the device name',
          ),
        );
      });
  }

  function onEditDeviceModalConfirm(): void {
    isEditDeviceNameModalVisible = false;
    setDeviceSettings(ensureDeviceName(deviceName), 'deviceName');
  }

  let isEditDeviceNameModalVisible = false;
</script>

<template>
  <KeyValueList>
    <KeyValueList.Section
      title={$i18n.t('settings--devices-settings.label--this-device', 'This Device')}
    >
      <KeyValueList.ItemWithButton icon="edit" key="" on:click={onClickEditDeviceName}>
        <div class="container">
          <div class="icon">
            <MdIcon theme="Outlined">computer</MdIcon>
          </div>

          <div class="content">
            <Text text={$devices.view.deviceName ?? DEFAULT_DEVICE_NAME}></Text>
          </div>
        </div>
      </KeyValueList.ItemWithButton>
    </KeyValueList.Section>
  </KeyValueList>

  {#if isEditDeviceNameModalVisible}
    <EditDeviceNameModal
      on:clickconfirm={onEditDeviceModalConfirm}
      on:close={onEditDeviceModalClose}
      bind:value={deviceName}
      label={$devices.view.deviceName ?? DEFAULT_DEVICE_NAME}
    ></EditDeviceNameModal>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .container {
    @extend %neutral-input;
    display: flex;
    flex-direction: row;
    justify-content: stretch;
    align-items: center;

    .icon {
      display: flex;
      place-items: center;
      font-size: rem(24px);
      line-height: rem(24px);
      color: var(--t-text-e2-color);
      padding: rem(8px);
      gap: rem(12px);
    }

    .content {
      display: flex;
      flex-direction: column;
      align-items: start;
      justify-content: start;
    }
  }
</style>
