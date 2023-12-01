<!--
  @component
  Renders a modal to toggle logging on or off.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import type {ToggleLoggerModalProps} from '~/app/ui/components/partials/settings/internal/about/internal/toggle-logger-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import {byteSizeToHumanReadable} from '~/common/utils/number';

  type $$Props = ToggleLoggerModalProps;

  export let isLoggerEnabled: $$Props['isLoggerEnabled'];
  export let logInfo: $$Props['logInfo'];

  const dispatch = createEventDispatcher<{
    clickconfirmandrestart: undefined;
  }>();

  function handleClickConfirmAndRestart(): void {
    dispatch('clickconfirmandrestart');
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
        label: $i18n.t('dialog--toggle-logger.action--cancel', 'Cancel'),
        type: 'naked',
        onClick: 'close',
      },
      {
        label: $i18n.t('dialog--toggle-logger.action--confirm', 'Confirm and Restart'),
        type: 'filled',
        onClick: handleClickConfirmAndRestart,
      },
    ],
    title: isLoggerEnabled
      ? $i18n.t('dialog--toggle-logger.label--title-disable', 'Disable Logging')
      : $i18n.t('dialog--toggle-logger.label--title-enable', 'Enable Logging'),
  }}
  on:close
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
            <Text text={logInfo.logFiles.mainApplication.path} />
          </KeyValueList.Item>

          <KeyValueList.Item
            key={$i18n.t(
              'dialog--toggle-logger.label--backend-worker-log-path',
              'Backend Worker Log',
            )}
          >
            <Text text={logInfo.logFiles.backendWorker.path} />
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
