<!--
  @component
  Renders a settings page that contains app information and settings.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import {collectLogsAndComposeMessageToSupport} from '~/app/ui/components/partials/settings/internal/about/helpers';
  import ClearLogsModal from '~/app/ui/components/partials/settings/internal/about/internal/clear-logs-modal/ClearLogsModal.svelte';
  import ToggleLoggerModal from '~/app/ui/components/partials/settings/internal/about/internal/toggle-logger-modal/ToggleLoggerModal.svelte';
  import type {AboutProps} from '~/app/ui/components/partials/settings/internal/about/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {extractErrorMessage} from '~/common/error';
  import type {LogInfo} from '~/common/node/file-storage/log-info';
  import {ensureError, unreachable} from '~/common/utils/assert';
  import {byteSizeToHumanReadable} from '~/common/utils/number';
  import {TIMER, type TimerCanceller} from '~/common/utils/timer';

  const log = globals.unwrap().uiLogging.logger('ui.component.settings-about');

  type $$Props = AboutProps;

  export let services: $$Props['services'];

  let modalState: 'none' | 'toggle-logger' | 'clear-logs' = 'none';

  let isDebugModeEnabled = false;
  let versionClickedCount = 0;
  let versionClickedTimeoutCanceller: TimerCanceller | undefined;

  const {
    storage: {debugPanelState},
  } = services;

  let isLoggerEnabled: boolean | undefined;
  let isLoggerEnabledToggleState = false;
  window.app
    .isFileLoggingEnabled()
    .then((enabled) => {
      isLoggerEnabled = enabled;
      isLoggerEnabledToggleState = enabled ?? false;
    })
    .catch((error: unknown) => {
      log.error(
        `Couldn't read whether file logging is enabled: ${extractErrorMessage(
          ensureError(error),
          'short',
        )}`,
      );
    });

  let logInfo: LogInfo | undefined;
  window.app
    .getLogInformation()
    .then((info) => {
      logInfo = info;
    })
    .catch((error: unknown) => {
      log.error(
        `Couldn't read logInformation: ${extractErrorMessage(ensureError(error), 'short')}`,
      );
    });

  async function handleClickSendLogsToSupport(): Promise<void> {
    await collectLogsAndComposeMessageToSupport(services, log);
  }

  function handleSubmitToggleLoggerModal(): void {
    if (isLoggerEnabled === undefined) {
      // It should not be possible to reach this point, because for the modal to be shown,
      // `isLoggerEnabled` must be defined.
      log.error('Logger was toggled but its current status was unknown');
      return;
    }

    window.app.setFileLoggingEnabledAndRestart(!isLoggerEnabled);
  }

  function handleCloseToggleLoggerModal(): void {
    isLoggerEnabledToggleState = isLoggerEnabled ?? false;
    modalState = 'none';
  }

  async function handleSubmitClearLogsModal(): Promise<void> {
    handleCloseClearLogsModal();
    if (isLoggerEnabled !== true) {
      // The button should only be available when logging is turned on.
      log.error('Logs cannot be cleared because logging is turned off');
    }
    await window.app.clearLogFiles();
    try {
      logInfo = await window.app.getLogInformation();
    } catch (error: unknown) {
      log.error(
        `Couldn't read logInformation: ${extractErrorMessage(ensureError(error), 'short')}`,
      );
    }
  }

  function handleCloseClearLogsModal(): void {
    modalState = 'none';
  }

  function handleClickVersion(): void {
    if (!isDebugModeEnabled) {
      versionClickedCount++;

      versionClickedTimeoutCanceller?.();
      versionClickedTimeoutCanceller = TIMER.timeout(() => (versionClickedCount = 0), 2000);

      if (versionClickedCount >= 5) {
        toast.addSimple('You are now a developer.', {
          name: 'bug_report',
          theme: 'Filled',
          type: 'md-icon',
          color: 'green',
        });

        isDebugModeEnabled = true;
      }
    }
  }
</script>

<KeyValueList>
  <KeyValueList.Section
    title={$i18n.t('settings--about.label--version-title', 'Version Information')}
  >
    <KeyValueList.Item key={$i18n.t('settings--about.label--application-name', 'Application Name')}>
      <Text text={import.meta.env.APP_NAME} selectable />
    </KeyValueList.Item>

    <KeyValueList.Item
      key={$i18n.t('settings--about.label--application-version', 'Application Version')}
    >
      <!-- A11y is currently not important here, as this is a developer-only feature. -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div on:click={handleClickVersion}>
        <Text text={import.meta.env.BUILD_VERSION} selectable />
      </div>
    </KeyValueList.Item>

    {#if `v${import.meta.env.BUILD_VERSION}` !== import.meta.env.GIT_REVISION && import.meta.env.GIT_REVISION !== ''}
      <KeyValueList.Item key={$i18n.t('settings--about.label--git-revision', 'Git Revision')}>
        <Text text={import.meta.env.GIT_REVISION} selectable />
      </KeyValueList.Item>
    {/if}
  </KeyValueList.Section>

  <KeyValueList.Section title={$i18n.t('settings--about.label--licenses-title', 'Licenses')}>
    <KeyValueList.Item key={$i18n.t('settings--about.label--copyright', 'Copyright')}>
      <Text text={'© Threema GmbH – Released under the AGPL-3.0 license'} selectable />
    </KeyValueList.Item>

    <KeyValueList.Item key={$i18n.t('settings--about.label--credits-font', 'Font Credits')}>
      <SubstitutableText
        text={$i18n.t(
          'settings--about.prose--font-credits',
          'The font software <1/> is the property of <2/> and licensed to Threema GmbH. All rights reserved. May not be used by any third party without acquiring a license from <3/>.',
        )}
      >
        <em slot="1">Lab Grotesque</em>
        <em slot="2">Letters from Sweden</em>
        <a slot="3" href="https://lettersfromsweden.se/" target="_blank" rel="noreferrer noopener">
          www.lettersfromsweden.se
        </a>
      </SubstitutableText>
    </KeyValueList.Item>
  </KeyValueList.Section>

  <KeyValueList.Section
    title={$i18n.t('settings--about.label--troubleshooting', 'Troubleshooting')}
  >
    {#if isLoggerEnabled !== undefined && logInfo !== undefined}
      <KeyValueList.ItemWithSwitch
        bind:checked={isLoggerEnabledToggleState}
        on:switchevent={() => (modalState = 'toggle-logger')}
        key={$i18n.t('settings--about.label--log-to-file', 'Logging')}
      >
        {#if isLoggerEnabled}
          <Text
            text={$i18n.t('settings--about.prose--logging-turned-on', 'Logging is turned on')}
          />
        {:else}
          <Text
            text={$i18n.t(
              'settings--about.prose--logging-turned-off',
              'Logging is currently turned off',
            )}
          />
        {/if}
      </KeyValueList.ItemWithSwitch>

      {#if isLoggerEnabled}
        <KeyValueList.ItemWithButton icon="send" key="" on:click={handleClickSendLogsToSupport}>
          <Text
            text={$i18n.t('settings--about.action--send-logs-to-support', 'Send Logs to Support')}
          />
        </KeyValueList.ItemWithButton>
        <KeyValueList.ItemWithButton
          on:click={() => (modalState = 'clear-logs')}
          icon="delete_forever"
          key=""
        >
          <Text text={$i18n.t('settings--about.action--clear-logs', 'Clear Logs')} />
        </KeyValueList.ItemWithButton>
        <KeyValueList.Item key={$i18n.t('settings--about.label--log-file-paths', 'Log File Paths')}>
          <div class="list">
            <span class="list-row">
              <Text text={logInfo.logFiles.mainApplication.path} selectable size="body-small" />
              <Text
                text={` (${byteSizeToHumanReadable(logInfo.logFiles.mainApplication.sizeInBytes)})`}
                size="body-small"
              />
            </span>
            <span class="list-row">
              <Text text={logInfo.logFiles.backendWorker.path} size="body-small" selectable />
              <Text
                text={` (${byteSizeToHumanReadable(logInfo.logFiles.backendWorker.sizeInBytes)})`}
                size="body-small"
              />
            </span>
          </div>
        </KeyValueList.Item>
      {/if}
    {/if}
  </KeyValueList.Section>

  {#if isDebugModeEnabled}
    <KeyValueList.Section title={$i18n.t('settings--about.label--debug', 'Debug')}>
      <KeyValueList.ItemWithButton
        icon="bug_report"
        on:click={() => {
          $debugPanelState = $debugPanelState === 'show' ? 'hide' : 'show';
        }}
        key=""
      >
        <Text text={$i18n.t('settings.action--toggle-debug-panel', 'Toggle Debug Panel')}></Text>
      </KeyValueList.ItemWithButton>
    </KeyValueList.Section>
  {/if}
</KeyValueList>

{#if modalState === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState === 'toggle-logger'}
  {#if isLoggerEnabled !== undefined && logInfo !== undefined}
    <ToggleLoggerModal
      {isLoggerEnabled}
      {logInfo}
      on:close={handleCloseToggleLoggerModal}
      on:submit={handleSubmitToggleLoggerModal}
    />
  {/if}
{:else if modalState === 'clear-logs'}
  {#if logInfo !== undefined}
    <ClearLogsModal
      {logInfo}
      on:close={handleCloseClearLogsModal}
      on:submit={handleSubmitClearLogsModal}
    />
  {/if}
{:else}
  {unreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .list {
    display: flex;
    flex-direction: column;
  }

  .list-row {
    flex-wrap: wrap;
  }
</style>
