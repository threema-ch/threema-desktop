<!--
  @component
  Renders a modal to toggle logging on or off.
-->
<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import type {ClearLogsModalProps} from '~/app/ui/components/partials/settings/internal/about/internal/clear-logs-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {byteSizeToHumanReadable} from '~/common/utils/number';

  type $$Props = ClearLogsModalProps;

  export let logInfo: $$Props['logInfo'];

  let modal: SvelteNullableBinding<Modal>;
</script>

<Modal
  bind:this={modal}
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
        label: $i18n.t('dialog--clear-logs.action--cancel', 'Cancel'),
        type: 'naked',
        onClick: 'close',
        isFocused: false,
      },
      {
        label: $i18n.t('dialog--clear-logs.action--confirm', 'Clear logs'),
        type: 'filled',
        onClick: 'submit',
        isFocused: true,
      },
    ],
    title: $i18n.t('dialog--clear-logs.label--title', 'Clear Logs'),
    maxWidth: 520,
  }}
  options={{allowClosingWithEsc: true, allowSubmittingWithEnter: true}}
  on:close
  on:submit
>
  <div class="content">
    <div class="description">
      <Text
        text={$i18n.t(
          'dialog--clear-logs.prose--description-disable',
          'The following files will be cleared irrevocably:',
        )}
      />
    </div>
    <KeyValueList>
      <KeyValueList.Section>
        <KeyValueList.Item
          key={$i18n.t('dialog--clear-logs.label--application-log-path', 'Application Log')}
        >
          <Text
            text={`${logInfo.logFiles.mainApplication.path} (${byteSizeToHumanReadable(
              logInfo.logFiles.mainApplication.sizeInBytes,
            )})`}
            selectable
          />
        </KeyValueList.Item>

        <KeyValueList.Item
          key={$i18n.t('dialog--clear-logs.label--backend-worker-log-path', 'Backend Worker Log')}
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
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    .description {
      padding: 0 rem(16px);
    }
  }
</style>
