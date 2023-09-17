<script lang="ts">
  import {globals} from '~/app/globals';
  import type {AppServices} from '~/app/types';
  import {toast} from '~/app/ui/snackbar';
  import {assert} from '~/common/utils/assert';
  import type {SvelteAction} from '~/common/viewmodel/types';

  const log = globals.unwrap().uiLogging.logger('ui.component.debug-redis');

  export let services: AppServices;

  // Unpack services
  const {backend} = services;

  function copyToClipboard(event: MouseEvent): void {
    assert(event.target instanceof HTMLDivElement);
    const text = `"${event.target.textContent ?? ''}"`;

    navigator.clipboard
      .writeText(text)
      .then(() => toast.addSimpleSuccess('Debug content copied to clipboard'))
      .catch(() => {
        const message = 'Could not copy debug content to clipboard';

        log.error(message);
        toast.addSimpleFailure(message);
      });
  }

  function copyToClipboardAction(node: HTMLElement): SvelteAction {
    node.addEventListener('click', copyToClipboard);

    return {
      destroy(): void {
        node.removeEventListener('click', copyToClipboard);
      },
    };
  }
</script>

<template>
  <section class="redis">
    {#await backend.viewModel.debugPanel() then debugPanel}
      <div class="informations">
        <h3>General</h3>
        <div>
          <div>Device Group ID (hex)</div>
          <div use:copyToClipboardAction title={debugPanel.deviceGroupIdHex}>
            {debugPanel.deviceGroupIdHex}
          </div>
        </div>
        <div>
          <div>Device Group ID (escaped-binary)</div>
          <div use:copyToClipboardAction title={debugPanel.deviceGroupIdBin}>
            {debugPanel.deviceGroupIdBin}
          </div>
        </div>
        <div>
          <div>Device ID (hex)</div>
          <div use:copyToClipboardAction title={debugPanel.deviceIdHex}>
            {debugPanel.deviceIdHex}
          </div>
        </div>
        <div>
          <div>Device ID (escaped-binary)</div>
          <div use:copyToClipboardAction title={debugPanel.deviceIdBin}>
            {debugPanel.deviceIdBin}
          </div>
        </div>

        <h3>Storage Keys</h3>
        <div>
          <div>Device info (hash)</div>
          <div use:copyToClipboardAction title={debugPanel.d2mDeviceInfo}>
            {debugPanel.d2mDeviceInfo}
          </div>
        </div>
        <div>
          <div>Group info (hash)</div>
          <div use:copyToClipboardAction title={debugPanel.d2mGroupInfo}>
            {debugPanel.d2mGroupInfo}
          </div>
        </div>
        <div>
          <div>Group devices (set)</div>
          <div use:copyToClipboardAction title={debugPanel.d2mGroupDevices}>
            {debugPanel.d2mGroupDevices}
          </div>
        </div>
        <div>
          <div>Reflection queue (list)</div>
          <div use:copyToClipboardAction title={debugPanel.d2mReflectionQueue}>
            {debugPanel.d2mReflectionQueue}
          </div>
        </div>
        <div>
          <div>Reflection queue sequence number (int)</div>
          <div use:copyToClipboardAction title={debugPanel.d2mReflectionQueueSequenceNumber}>
            {debugPanel.d2mReflectionQueueSequenceNumber}
          </div>
        </div>
        <div>
          <div>Reflection processing queue (list)</div>
          <div use:copyToClipboardAction title={debugPanel.d2mReflectionProcessingQueue}>
            {debugPanel.d2mReflectionProcessingQueue}
          </div>
        </div>
        <p>
          Redis command reference: <a
            href="https://redis.io/commands/"
            target="_blank"
            rel="noreferrer noopener">redis.io/commands/</a
          >
        </p>
      </div>
    {/await}
  </section>
</template>

<style lang="scss">
  @use 'component' as *;

  .redis {
    padding: rem(8px);
    display: grid;
    gap: rem(8px);
    place-items: center;
    grid-auto-flow: row;

    .informations {
      display: grid;
      grid-template: 'row';

      > div {
        display: grid;
        grid-template:
          'title value' auto /
          #{rem(300px)} #{rem(400px)};
        column-gap: rem(8px);
        justify-content: start;
        padding: rem(4px) rem(8px);

        div {
          &:last-child {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;

            &[title] {
              cursor: pointer;
            }
          }
        }

        &:hover {
          background-color: rgba(0, 0, 0, 0.3);
        }
      }
    }
  }
</style>
