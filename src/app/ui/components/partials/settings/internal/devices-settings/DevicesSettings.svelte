<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import EditDeviceNameModal from '~/app/ui/components/partials/settings/internal/devices-settings/internal/edit-device-name-modal/EditDeviceNameModal.svelte';
  import type {DevicesSettingsProps} from '~/app/ui/components/partials/settings/internal/devices-settings/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {DevicesSettingsView} from '~/common/model/types/settings';
  import {isDeviceName} from '~/common/network/types';

  const log = globals.unwrap().uiLogging.logger('ui.component.settings-devices');

  type $$Props = DevicesSettingsProps;

  export let services: $$Props['services'];

  const {
    backend,
    settings: {devices},
  } = services;

  let isEditDeviceNameModalVisible = false;

  function handleClickEditDeviceName(): void {
    isEditDeviceNameModalVisible = true;
  }

  function handleCloseEditDeviceModal(): void {
    isEditDeviceNameModalVisible = false;
  }

  function handleNewDeviceName(event: CustomEvent<string>): void {
    const newDeviceName = event.detail;
    if (isDeviceName(newDeviceName)) {
      updateSetting(newDeviceName, 'deviceName');
    }
    void backend.connectionManager.disconnect();
    isEditDeviceNameModalVisible = false;
  }

  function updateSetting<N extends keyof DevicesSettingsView>(
    newValue: DevicesSettingsView[N],
    updateKey: N,
  ): void {
    devices
      .get()
      .controller.update({[updateKey]: newValue})
      .catch(() => {
        log.error(`Failed to update setting: ${updateKey}`);
      });
  }
</script>

<template>
  <KeyValueList>
    <KeyValueList.Section title={$i18n.t('settings--devices.label--this-device', 'This Device')}>
      <KeyValueList.ItemWithButton icon="edit" key="" on:click={handleClickEditDeviceName}>
        <div class="container">
          <div class="icon">
            <MdIcon theme="Outlined">computer</MdIcon>
          </div>

          <div class="content">
            <Text text={$devices.view.deviceName}></Text>
          </div>
        </div>
      </KeyValueList.ItemWithButton>
    </KeyValueList.Section>
  </KeyValueList>

  {#if isEditDeviceNameModalVisible}
    <EditDeviceNameModal
      on:newDeviceName={handleNewDeviceName}
      on:close={handleCloseEditDeviceModal}
      value={devices.get().view.deviceName}
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
