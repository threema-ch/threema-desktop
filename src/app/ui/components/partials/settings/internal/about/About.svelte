<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import {collectLogsAndComposeMessageToSupport} from '~/app/ui/components/partials/settings/internal/about/helpers';
  import ToggleLoggerModal from '~/app/ui/components/partials/settings/internal/about/internal/toggle-logger-modal/ToggleLoggerModal.svelte';
  import type {AboutProps} from '~/app/ui/components/partials/settings/internal/about/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {extractErrorMessage} from '~/common/error';
  import type {LogInfo} from '~/common/node/file-storage/log-info';
  import type {u53} from '~/common/types';
  import {ensureError} from '~/common/utils/assert';
  import {byteSizeToHumanReadable} from '~/common/utils/number';

  const log = globals.unwrap().uiLogging.logger('ui.component.settings-about');

  type $$Props = AboutProps;
  export let services: $$Props['services'];
  const {
    storage: {debugPanelState},
  } = services;

  let isLoggerEnabled: boolean | undefined;
  window.app
    .isFileLoggingEnabled()
    .then((enabled) => {
      isLoggerEnabled = enabled;
    })
    .catch((error) => {
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
    .catch((error) => {
      log.error(
        `Couldn't read logInformation: ${extractErrorMessage(ensureError(error), 'short')}`,
      );
    });

  let isToggleLoggerModalVisible: boolean = false;
  function handleClickToggleLogger(): void {
    isToggleLoggerModalVisible = true;
  }

  function handleCloseToggleLoggerModal(): void {
    isLoggerEnabledToggleState = isLoggerEnabled;
    isToggleLoggerModalVisible = false;
  }

  async function handleClickSendLogsToSupport(): Promise<void> {
    await collectLogsAndComposeMessageToSupport(services, log);
  }

  function handleClickConfirmAndRestartToggleLoggerModal(): void {
    if (isLoggerEnabled === undefined) {
      // It should not be possible to reach this point, because for the modal to be shown,
      // `isLoggerEnabled` must be defined.
      log.error('Logger was toggled but its current status was unknown');
      return;
    }

    window.app.setFileLoggingEnabledAndRestart(!isLoggerEnabled);
  }

  $: isLoggerEnabledToggleState = isLoggerEnabled;

  let showToggleDebugMode = false;
  let versionClickedCount = 0;
  let versionClickedTimeoutHandler: u53;
  function handleClickVersion(): void {
    if (!showToggleDebugMode) {
      versionClickedCount++;

      clearTimeout(versionClickedTimeoutHandler);

      versionClickedTimeoutHandler = setTimeout(() => {
        versionClickedCount = 0;
      }, 2000);

      if (versionClickedCount >= 5) {
        toast.addSimple('You are now a developer.', {
          name: 'bug_report',
          theme: 'Filled',
          type: 'md-icon',
          color: 'green',
        });
        showToggleDebugMode = true;
      }
    }
  }
</script>

<template>
  <div>
    <KeyValueList>
      <KeyValueList.Section
        title={$i18n.t('settings--about.label--version-title', 'Version Information')}
      >
        <KeyValueList.Item
          key={$i18n.t('settings--about.label--application-name', 'Application Name')}
        >
          <Text text={import.meta.env.APP_NAME} />
        </KeyValueList.Item>

        <KeyValueList.Item
          key={$i18n.t('settings--about.label--application-version', 'Application Version')}
        >
          <!-- A11y is currently not important here, as this is a developer-only feature. -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div on:click={handleClickVersion}>
            <Text text={import.meta.env.BUILD_VERSION} />
          </div>
        </KeyValueList.Item>

        {#if `v${import.meta.env.BUILD_VERSION}` !== import.meta.env.GIT_REVISION && import.meta.env.GIT_REVISION !== ''}
          <KeyValueList.Item key={$i18n.t('settings--about.label--git-revision', 'Git Revision')}>
            <Text text={import.meta.env.GIT_REVISION} />
          </KeyValueList.Item>
        {/if}

        <KeyValueList.Item key={$i18n.t('settings--about.label--copyright', 'Copyright')}>
          <Text text={'Threema GmbH © 2020-2023'} />
        </KeyValueList.Item>
      </KeyValueList.Section>
      <KeyValueList.Section
        title={$i18n.t('settings--about.label--troubleshooting', 'Troubleshooting')}
      >
        {#if isLoggerEnabled !== undefined && logInfo !== undefined}
          <!--Change this to switch @TODO (DESK-1255)-->
          <KeyValueList.ItemWithSwitch
            bind:checked={isLoggerEnabledToggleState}
            on:switchevent={handleClickToggleLogger}
            key={$i18n.t('settings--about.label--log-to-file', 'Logging')}
          >
            {#if isLoggerEnabled}
              <Text
                text={$i18n.t('setttings--about.prose-logging-turned-on', 'Logging is turned on')}
              ></Text>
            {:else}
              <Text
                text={$i18n.t(
                  'settings--about.prose-logging-turned-off',
                  'Logging is currently turned off',
                )}
              ></Text>
            {/if}
          </KeyValueList.ItemWithSwitch>

          {#if isLoggerEnabled}
            <KeyValueList.Item
              key={$i18n.t('settings--about.label--log-file-paths', 'Log File Paths')}
            >
              <div class="list">
                <span class="list-row">
                  <Text text={logInfo.logFiles.mainApplication.path}></Text>
                  <Text
                    text={` (${byteSizeToHumanReadable(
                      logInfo.logFiles.mainApplication.sizeInBytes,
                    )})`}
                  ></Text>
                </span>
                <span class="list-row">
                  <Text text={logInfo.logFiles.backendWorker.path}></Text>
                  <Text
                    text={` (${byteSizeToHumanReadable(
                      logInfo.logFiles.backendWorker.sizeInBytes,
                    )})`}
                  ></Text>
                </span>
              </div>
            </KeyValueList.Item>

            <KeyValueList.ItemWithButton icon="send" key="" on:click={handleClickSendLogsToSupport}>
              <Text
                text={$i18n.t(
                  'settings--about.action--send-logs-to-support',
                  'Send Logs to Support',
                )}
              ></Text>
            </KeyValueList.ItemWithButton>
          {/if}
        {/if}
      </KeyValueList.Section>
      <!--Change this to switch @TODO (DESK-1255)-->

      {#if showToggleDebugMode}
        <KeyValueList.Section title={$i18n.t('settings--about.label--debug', 'Debug')}>
          <KeyValueList.ItemWithButton
            icon="bug_report"
            on:click={() => {
              $debugPanelState = $debugPanelState === 'show' ? 'hide' : 'show';
            }}
            key=""
          >
            <Text text={$i18n.t('settings.action--toggle-debug-panel', 'Toggle Debug Panel')}
            ></Text>
          </KeyValueList.ItemWithButton>
        </KeyValueList.Section>
      {/if}
    </KeyValueList>
  </div>

  {#if isToggleLoggerModalVisible}
    {#if isLoggerEnabled !== undefined && logInfo !== undefined}
      <ToggleLoggerModal
        {isLoggerEnabled}
        {logInfo}
        on:clickconfirmandrestart={handleClickConfirmAndRestartToggleLoggerModal}
        on:close={handleCloseToggleLoggerModal}
      />
    {/if}
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .list {
    display: flex;
    flex-direction: column;
    user-select: text;
  }

  .list-row {
    flex-wrap: wrap;
  }
</style>
