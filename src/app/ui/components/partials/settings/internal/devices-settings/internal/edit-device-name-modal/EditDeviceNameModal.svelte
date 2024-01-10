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

  function handleClickConfirm(): void {
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
    }}
    on:close
  >
    <div class="description">
      <Input bind:value {maxlength}></Input>
    </div></Modal
  >
</template>

<style lang="scss">
  @use 'component' as *;

  .description {
    padding: 0 rem(16px);

    .warning {
      display: flex;
      align-items: center;
      justify-content: start;
      gap: rem(8px);
      padding: rem(16px) rem(16px) 0;
    }
  }
</style>
