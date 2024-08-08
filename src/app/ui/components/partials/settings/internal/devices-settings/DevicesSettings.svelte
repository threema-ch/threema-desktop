<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import EditDeviceNameModal from '~/app/ui/components/partials/settings/internal/devices-settings/internal/edit-device-name-modal/EditDeviceNameModal.svelte';
  import RelinkDeviceModal from '~/app/ui/components/partials/settings/internal/devices-settings/internal/relink-device-modal/RelinkDeviceModal.svelte';
  import type {DevicesSettingsProps} from '~/app/ui/components/partials/settings/internal/devices-settings/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {DevicesSettingsView} from '~/common/model/types/settings';
  import {isDeviceName} from '~/common/network/types';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';

  const log = globals.unwrap().uiLogging.logger('ui.component.settings-devices');

  type $$Props = DevicesSettingsProps;

  export let services: $$Props['services'];

  let modalState: 'none' | 'edit-device-name' | 'relink-device' = 'none';

  const {
    backend,
    settings: {devices},
  } = services;

  function handleClickEditDeviceName(): void {
    modalState = 'edit-device-name';
  }

  function handleCloseModal(): void {
    modalState = 'none';
  }

  function handleNewDeviceName(event: CustomEvent<string>): void {
    const newDeviceName = event.detail;
    if (isDeviceName(newDeviceName)) {
      updateSetting(newDeviceName, 'deviceName');
    }
    backend.connectionManager.disconnect().catch(assertUnreachable);
    modalState = 'none';
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

    <KeyValueList.ItemWithButton
      icon="restart_alt"
      key=""
      on:click={() => (modalState = 'relink-device')}
    >
      <Text text={$i18n.t('settings--about.label--relink', 'Relink this device')}></Text>
    </KeyValueList.ItemWithButton>
  </KeyValueList.Section>
</KeyValueList>

{#if modalState === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState === 'edit-device-name'}
  <EditDeviceNameModal
    on:newDeviceName={handleNewDeviceName}
    on:close={handleCloseModal}
    value={devices.get().view.deviceName}
  />
{:else if modalState === 'relink-device'}
  <RelinkDeviceModal {services} on:close={handleCloseModal} />
{:else}
  {unreachable(modalState)}
{/if}

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
