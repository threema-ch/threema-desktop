<!--
  @component Renders a modal to toggle logging on or off.
-->
<script lang="ts">
  import {byteSizeToHumanReadable} from '@threema/ts-utils/conversion/byte-size-to-human-readable';

  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import type {ToggleLoggerModalProps} from '~/app/ui/components/partials/settings/internal/about/internal/toggle-logger-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  const {isLoggerEnabled, logInfo, onclose, onsubmit}: ToggleLoggerModalProps = $props();
</script>

<Modal
  wrapper={{
    type: 'card',
    actions: [
      {
        iconName: 'close',
        onclick: 'close',
      },
    ],
    buttons: [
      {
        label: $i18n.t('dialog--common.action--cancel', 'Cancel'),
        type: 'naked',
        onclick: 'close',
      },
      {
        label: $i18n.t('dialog--common.action--confirm-and-restart', 'Confirm and Restart'),
        type: 'filled',
        onclick: 'submit',
      },
    ],
    title: isLoggerEnabled
      ? $i18n.t('dialog--toggle-logger.label--title-disable', 'Turn off Logging')
      : $i18n.t('dialog--toggle-logger.label--title-enable', 'Turn on Logging'),
    maxWidth: 520,
  }}
  {onclose}
  {onsubmit}
>
  <div class="content">
    {#if isLoggerEnabled}
      <div class="description">
        <Text
          text={$i18n.t(
            'dialog--toggle-logger.prose--description-disable',
            'This will turn off logging. The following files will be emptied irrevocably:',
          )}
        />
      </div>

      <KeyValueList>
        <KeyValueList.Section>
          <KeyValueList.Item
            key={$i18n.t('dialog--toggle-logger.label--application-log-path', 'Application Log')}
          >
            <Text
              text={`${logInfo.logFiles.mainApplication.path} (${byteSizeToHumanReadable(
                logInfo.logFiles.mainApplication.sizeInBytes,
              )})`}
              selectable
            />
          </KeyValueList.Item>

          <KeyValueList.Item
            key={$i18n.t(
              'dialog--toggle-logger.label--backend-worker-log-path',
              'Backend Worker Log',
            )}
          >
            <Text
              text={`${logInfo.logFiles.backendWorker.path} (${byteSizeToHumanReadable(
                logInfo.logFiles.backendWorker.sizeInBytes,
              )})`}
              selectable
            />
          </KeyValueList.Item>
        </KeyValueList.Section>
      </KeyValueList>

      <div class="warning">
        <MdIcon theme="Filled">warning</MdIcon>
        <Text
          text={$i18n.t(
            'dialog--toggle-logger.prose--warning-disable',
            'Turning off the logger will trigger a restart of the application.',
          )}
        />
      </div>
    {:else}
      <div class="description">
        <Text
          text={$i18n.t(
            'dialog--toggle-logger.prose--description-enable',
            'The events will be logged to the following files:',
          )}
        />
      </div>

      <KeyValueList>
        <KeyValueList.Section>
          <KeyValueList.Item
            key={$i18n.t('dialog--toggle-logger.label--application-log-path', 'Application Log')}
          >
            <Text text={logInfo.logFiles.mainApplication.path} selectable />
          </KeyValueList.Item>

          <KeyValueList.Item
            key={$i18n.t(
              'dialog--toggle-logger.label--backend-worker-log-path',
              'Backend Worker Log',
            )}
          >
            <Text text={logInfo.logFiles.backendWorker.path} selectable />
          </KeyValueList.Item>
        </KeyValueList.Section>
      </KeyValueList>

      <div class="warning">
        <MdIcon theme="Filled">warning</MdIcon>
        <Text
          text={$i18n.t(
            'dialog--toggle-logger.prose--warning-enable',
            'Turning on the logger will trigger a restart of the application.',
          )}
        />
      </div>
    {/if}
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    .description {
      padding: 0 rem(16px);
    }

    .warning {
      display: flex;
      align-items: center;
      justify-content: start;
      gap: rem(8px);
      padding: rem(16px) rem(16px) 0;
    }
  }
</style>
