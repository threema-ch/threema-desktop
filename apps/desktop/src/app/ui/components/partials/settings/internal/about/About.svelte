<!--
  @component Renders a settings page that contains app information and settings.
-->
<script lang="ts">
  import type {u53} from '@threema/ts-utils/integer/u53';
  import {ensureError} from '@threema/ts-utils/meta/ensure-error';
  import {byteSizeToHumanReadable} from '@threema/ts-utils/number/byte-size-to-human-readable';
  import {TIMER} from '@threema/ts-utils/timer/global-timer';
  import type {TimerCanceller} from '@threema/ts-utils/timer/timer-canceller';

  import {globals} from '~/app/globals';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import {
    collectLogsAndComposeMessageToSupport,
    deleteRtcStatsSessions,
    exportRtcStatsSession,
    loadRtcStatsSessions,
  } from '~/app/ui/components/partials/settings/internal/about/helpers';
  import ClearLogsModal from '~/app/ui/components/partials/settings/internal/about/internal/clear-logs-modal/ClearLogsModal.svelte';
  import ToggleLoggerModal from '~/app/ui/components/partials/settings/internal/about/internal/toggle-logger-modal/ToggleLoggerModal.svelte';
  import type {AboutProps} from '~/app/ui/components/partials/settings/internal/about/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {svelteUnreachable} from '~/app/ui/utils/svelte';
  import type {
    RtcStatsSessionId,
    RtcStatsSessionInfo,
  } from '~/common/dom/webrtc/rtcstats/trace-indexeddb';
  import {CallStatisticsPolicy} from '~/common/enum';
  import {extractErrorMessage} from '~/common/error';
  import type {LogInfo} from '~/common/node/file-storage/log-info';

  const log = globals.unwrap().uiLogging.logger('ui.component.settings-about');

  const {services}: AboutProps = $props();

  const {
    storage: {debugPanelState},
  } = services;

  const troubleshootingSettings = services.settings.views.troubleshooting;

  let modalState = $state<'none' | 'toggle-logger' | 'clear-logs'>('none');

  let isDebugModeEnabled = $state<boolean>(false);
  let versionClickedCount = $state<u53>(0);
  let versionClickedTimeoutCanceller = $state<TimerCanceller | undefined>(undefined);

  let isLoggerEnabled = $state<boolean | undefined>(undefined);
  let isLoggerEnabledToggleState = $state<boolean>(false);
  services.electron
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

  let logInfo = $state<LogInfo | undefined>(undefined);
  services.electron
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

  // Call statistics (rtcstats) sessions. Only recorded (and shown) in sandbox builds.
  let rtcStatsSessions = $state<readonly RtcStatsSessionInfo[]>([]);
  if (import.meta.env.ALLOW_RTC_STATS_RECORDING) {
    loadRtcStatsSessions(log)
      .then((sessions) => {
        rtcStatsSessions = sessions;
      })
      .catch((error: unknown) => {
        log.error(
          `Couldn't load call statistics sessions: ${extractErrorMessage(
            ensureError(error),
            'short',
          )}`,
        );
      });
  }

  function handleSwitchCallStatistics(state: {readonly new: boolean}): void {
    services.settings
      .update({
        type: 'troubleshooting',
        update: {
          callStatisticsPolicy: state.new
            ? CallStatisticsPolicy.RECORD_LOCALLY
            : CallStatisticsPolicy.DENY_RECORDING,
        },
      })
      .catch((error: unknown) => {
        log.error(
          `Couldn't update call statistics setting: ${extractErrorMessage(
            ensureError(error),
            'short',
          )}`,
        );
      });
  }

  async function handleClickExportRtcStatsSession(sessionId: RtcStatsSessionId): Promise<void> {
    await exportRtcStatsSession(sessionId, log);
  }

  async function handleClickDeleteRtcStatsSessions(): Promise<void> {
    await deleteRtcStatsSessions(log);
    rtcStatsSessions = await loadRtcStatsSessions(log);
  }

  function handleSubmitToggleLoggerModal(): void {
    if (isLoggerEnabled === undefined) {
      // It should not be possible to reach this point, because for the modal to be shown,
      // `isLoggerEnabled` must be defined.
      log.error('Logger was toggled but its current status was unknown');
      return;
    }

    services.electron.setFileLoggingEnabledAndRestart(!isLoggerEnabled);
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
    await services.electron.clearLogFiles();
    try {
      logInfo = await services.electron.getLogInformation();
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
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div onclick={handleClickVersion}>
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
      <Text text="© Threema AG – Released under the AGPL-3.0 license" selectable />
    </KeyValueList.Item>

    <KeyValueList.Item key="GitHub">
      <a href="https://github.com/threema-ch/threema-desktop" target="_blank">
        https://github.com/threema-ch/threema-desktop
      </a>
    </KeyValueList.Item>

    <KeyValueList.Item key={$i18n.t('settings--about.label--third-party-code', 'Third Party Code')}>
      <SubstitutableText
        text={$i18n.t(
          'settings--about.prose--third-party-code',
          '<slot_1 /> contains code from open source libraries. Please check out the file <slot_2 /> for detailed license information.',
        )}
      >
        {#snippet slot_1()}
          <span>{import.meta.env.APP_NAME}</span>
        {/snippet}
        {#snippet slot_2()}
          <a
            href="https://github.com/threema-ch/threema-desktop/blob/stable/LICENSE-3RD-PARTY.txt"
            target="_blank"
            rel="noreferrer noopener"
          >
            LICENSE-3RD-PARTY.txt
          </a>
        {/snippet}
      </SubstitutableText>
    </KeyValueList.Item>
  </KeyValueList.Section>
  <!-- In onprem builds, we don't show privacy information for simplicity.-->
  {#if import.meta.env.BUILD_ENVIRONMENT !== 'onprem'}
    <KeyValueList.Section
      title={$i18n.t('settings--about.label--privacy-information', 'Privacy Information')}
    >
      <KeyValueList.Item key={$i18n.t('settings--about.label--privacy-policy', 'Privacy Policy')}>
        {@const url =
          // Disabling linter rule since we exclude onprem so build variant can never be custom.
          // eslint-disable-next-line threema/compare-work-and-custom
          import.meta.env.BUILD_VARIANT === 'work'
            ? 'https://threema.com/privacy_policy?version=5.5k'
            : 'https://threema.com/privacy_policy?version=5.5'}
        <a href={url} target="_blank" rel="noreferrer noopener">
          {url.split('?')[0]}
        </a>
      </KeyValueList.Item>
    </KeyValueList.Section>
  {/if}

  <KeyValueList.Section
    title={$i18n.t('settings--about.label--troubleshooting', 'Troubleshooting')}
  >
    {#if isLoggerEnabled !== undefined && logInfo !== undefined}
      <KeyValueList.ItemWithSwitch
        bind:checked={isLoggerEnabledToggleState}
        key={$i18n.t('settings--about.label--log-to-file', 'Logging')}
        onswitch={() => (modalState = 'toggle-logger')}
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
        <KeyValueList.ItemWithButton icon="send" key="" onclick={handleClickSendLogsToSupport}>
          <Text
            text={$i18n.t('settings--about.action--send-logs-to-support', 'Send Logs to Support')}
          />
        </KeyValueList.ItemWithButton>
        <KeyValueList.ItemWithButton
          icon="delete_forever"
          key=""
          onclick={() => (modalState = 'clear-logs')}
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

  {#if import.meta.env.ALLOW_RTC_STATS_RECORDING}
    <KeyValueList.Section
      title={$i18n.t('settings--about.label--call-statistics', 'Call Statistics')}
    >
      <KeyValueList.ItemWithSwitch
        checked={$troubleshootingSettings.callStatisticsPolicy ===
          CallStatisticsPolicy.RECORD_LOCALLY}
        key={$i18n.t('settings--about.label--call-statistics-recording', 'Record Call Statistics')}
        onswitch={handleSwitchCallStatistics}
      >
        {#if $troubleshootingSettings.callStatisticsPolicy === CallStatisticsPolicy.RECORD_LOCALLY}
          <Text
            text={$i18n.t(
              'settings--about.prose--call-statistics-turned-on',
              'WebRTC statistics of Threema calls are recorded into a local database. Nothing is sent automatically.',
            )}
          />
        {:else}
          <Text
            text={$i18n.t(
              'settings--about.prose--call-statistics-turned-off',
              'Call statistics recording is currently turned off',
            )}
          />
        {/if}
      </KeyValueList.ItemWithSwitch>

      {#each rtcStatsSessions as session (session.sessionId)}
        <KeyValueList.ItemWithButton
          icon="download"
          key=""
          onclick={async () => await handleClickExportRtcStatsSession(session.sessionId)}
        >
          <Text
            text={`${session.sessionId} (${$i18n.t(
              'settings--about.prose--call-statistics-entries',
              '{n, plural, =1 {1 entry} other {# entries}}',
              {n: session.entryCount},
            )})`}
          />
        </KeyValueList.ItemWithButton>
      {/each}

      {#if rtcStatsSessions.length > 0}
        <KeyValueList.ItemWithButton
          icon="delete_forever"
          key=""
          onclick={handleClickDeleteRtcStatsSessions}
        >
          <Text
            text={$i18n.t(
              'settings--about.action--delete-call-statistics',
              'Delete Call Statistics',
            )}
          />
        </KeyValueList.ItemWithButton>
      {/if}
    </KeyValueList.Section>
  {/if}

  {#if isDebugModeEnabled}
    <KeyValueList.Section title={$i18n.t('settings--about.label--debug', 'Debug')}>
      <KeyValueList.ItemWithButton
        icon="bug_report"
        key=""
        onclick={() => {
          $debugPanelState = $debugPanelState === 'show' ? 'hide' : 'show';
        }}
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
      onclose={handleCloseToggleLoggerModal}
      onsubmit={handleSubmitToggleLoggerModal}
    />
  {/if}
{:else if modalState === 'clear-logs'}
  {#if logInfo !== undefined}
    <ClearLogsModal
      {logInfo}
      onclose={handleCloseClearLogsModal}
      onsubmit={handleSubmitClearLogsModal}
    />
  {/if}
{:else}
  {svelteUnreachable(modalState)}
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
