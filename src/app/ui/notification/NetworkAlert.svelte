<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {type GlobalPropertyKey} from '~/common/enum';
  import {type IGlobalPropertyModel} from '~/common/model';
  import {type LocalModelStore} from '~/common/model/utils/model-store';
  import {type Remote} from '~/common/utils/endpoint';

  export let applicationState: Remote<
    LocalModelStore<IGlobalPropertyModel<GlobalPropertyKey.APPLICATION_STATE>>
  >;
</script>

<template>
  <div class="network-alert">
    <div class="icon">
      <MdIcon theme="Outlined">error_outline</MdIcon>
    </div>
    <div class="message">
      {#if $applicationState.view.value.unrecoverableStateDetected ?? false}
        {$i18n.t(
          'system.error--connection-unrecoverable-state',
          'This device was disconnected from the server due to an unrecoverable error. Please restart and relink.',
        )}
      {:else}
        {$i18n.t(
          'system.error--connection',
          'No server connection. Try reconnecting to Wi-Fi, or check your modem and router.',
        )}
      {/if}
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .network-alert {
    display: grid;
    grid-template: 'icon message' auto / auto 1fr;
    background-color: var(--t-nav-background-color);
    border-bottom: solid 1px var(--t-panel-gap-color);

    .icon {
      grid-area: icon;
      display: grid;
      width: rem(40px);
      height: rem(40px);
      place-items: center;
      color: $alert-red;
      --c-icon-font-size: #{rem(24px)};
    }
    .message {
      grid-area: message;
      padding: rem(10px) rem(16px) rem(10px) 0;
      align-content: center;
      color: var(--t-text-e1-color);
    }
  }
</style>
