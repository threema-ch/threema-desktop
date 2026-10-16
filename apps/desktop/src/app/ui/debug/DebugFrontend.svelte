<script lang="ts">
  import type {AppServicesForSvelte} from '~/app/types';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import KeyStorageMigrationFailedModal from '~/app/ui/components/partials/modals/key-storage-migration-failed-modal/KeyStorageMigrationFailedModal.svelte';
  import MissingCachedOnPremConfigModal from '~/app/ui/components/partials/modals/missing-cached-onprem-config-modal/MissingCachedOnPremConfigModal.svelte';
  import MissingWorkCredentialsModal from '~/app/ui/components/partials/modals/missing-work-credentials-modal/MissingWorkCredentialsModal.svelte';
  import ThreemaIdInfoModal from '~/app/ui/components/partials/modals/threema-id-info-modal/ThreemaIdInfoModal.svelte';
  import VerificationLevelInfoModal from '~/app/ui/components/partials/modals/verification-level-info-modal/VerificationLevelInfoModal.svelte';
  import {getScreenSharingSources} from '~/app/ui/debug/ScreenSharingPickerUtils';
  import type {ElectronIpcService} from '~/common/dom/electron-service';
  import type {ConnectionErrorDialog, SystemDialog} from '~/common/system-dialog';
  import {unreachable} from '~/common/utils/assert';

  interface Props {
    services: AppServicesForSvelte;
  }

  const {services}: Props = $props();

  // Unpack services.
  const {systemDialog} = services;

  const systemDialogDropdownItems: ContextMenuItem[] = (
    [
      'auto-app-update-download',
      'auto-app-update-failed',
      'auto-app-update-prompt',
      'device-cookie-mismatch',
      'device-protocols-incompatible',
      'invalid-work-credentials',
      'manual-app-update',
      'remote-secrets-activation',
      'remote-secrets-deactivation',
      'remote-secrets-system-suspend',
      'screen-sharing-picker',
      'server-alert',
      'unrecoverable-state',
      'windows-10-migration',
    ] as const
  ).map((type: Exclude<SystemDialog['type'], 'connection-error'>) => {
    switch (type) {
      case 'auto-app-update-download':
        return {
          type: 'option',
          handler: () => {
            const systemDialogHandle = systemDialog.open({
              type,
              context: {
                latestVersion: '2.0-betaAB',
              },
            });

            systemDialogHandle.setProgress(1);
          },
          label: 'Automatic App Update Download',
        };

      case 'auto-app-update-failed':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
            });
          },
          label: 'Automatic App Update Failed',
        };

      case 'auto-app-update-prompt':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
              context: {
                currentVersion: '2.0-betaAB',
                latestVersion: '2.0-betaCD',
                systemInfo: {
                  os: 'macos',
                },
              },
            });
          },
          label: 'Automatic App Update Prompt',
        };

      case 'device-cookie-mismatch':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
            });
          },
          label: 'Device Cookie Mismatch',
        };

      case 'invalid-work-credentials':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
              context: {
                workCredentials: {
                  password: 'test',
                  username: 'text',
                },
              },
            });
          },
          label: 'Invalid Work Credentials',
        };

      case 'manual-app-update':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
              context: {
                currentVersion: '2.0-betaAB',
                latestVersion: '2.0-betaCD',
                systemInfo: {
                  os: 'linux',
                },
              },
            });
          },
          label: 'Manual App Update',
        };

      case 'server-alert':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
              context: {
                text: 'Lorem ipsum dolor sit amet.',
              },
            });
          },
          label: 'Server Alert',
        };

      case 'unrecoverable-state':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
            });
          },
          label: 'Unrecoverable State',
        };

      case 'device-protocols-incompatible':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({type});
          },
          label: 'Device Protocols Incompatible',
        };

      case 'change-password-confirm-dialog':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
            });
          },
          label: 'Change password confirm',
        };

      case 'screen-sharing-picker':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
              context: {
                sources: getScreenSharingSources(),
                onselect: () => {},
                ondismiss: () => {},
              },
            });
          },
          label: 'Screen Sharing Picker',
        };

      case 'remote-secrets-activation':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
              context: {
                previouslyAttemptedPassword: undefined,
              },
            });
          },
          label: 'Activate Remote Secrets',
        };

      case 'remote-secrets-deactivation':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
              context: {
                previouslyAttemptedPassword: undefined,
              },
            });
          },
          label: 'Deactivate Remote Secrets',
        };

      case 'remote-secrets-system-suspend':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
            });
          },
          label: 'Remote Secrets System Suspension',
        };

      case 'windows-10-migration':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
            });
          },
          label: 'Windows 10 Migration',
        };

      default:
        return unreachable(type);
    }
  });

  const connectionErrorDialogDropdownItems: ContextMenuItem[] = (
    [
      'client-update-required',
      'client-was-dropped',
      'device-slot-state-mismatch',
      'mediator-update-required',
    ] as const
  ).map((error: ConnectionErrorDialog['context']['error']) => ({
    type: 'option',
    handler: () => {
      systemDialog.open({
        type: 'connection-error',
        context: {
          error,
        },
      });
    },
    label: error,
  }));

  type DebugModalType =
    | 'key-storage-migration-failed'
    | 'missing-cached-onprem-config'
    | 'missing-work-credentials'
    | 'threema-id-info'
    | 'verification-level-info';

  let openModal = $state<DebugModalType | undefined>(undefined);

  function handleCloseModal(): void {
    openModal = undefined;
  }

  /**
   * Electron service for the startup modals, where actions that would close the app or delete the
   * profile only close the modal instead.
   */
  const stubbedElectron: ElectronIpcService = new Proxy(services.electron, {
    get(target, property) {
      if (property === 'closeApp' || property === 'deleteProfileAndRestartApp') {
        return handleCloseModal;
      }
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  const modalDropdownItems: ContextMenuItem[] = (
    [
      ['key-storage-migration-failed', 'Key Storage Migration Failed'],
      ['missing-cached-onprem-config', 'Missing Cached OnPrem Config'],
      ['missing-work-credentials', 'Missing Work Credentials'],
      ['threema-id-info', 'Threema ID Info'],
      ['verification-level-info', 'Verification Level Info'],
    ] as const satisfies readonly (readonly [DebugModalType, string])[]
  ).map(([type, label]) => ({
    type: 'option',
    handler: () => {
      openModal = type;
    },
    label,
  }));
</script>

<section class="container">
  <KeyValueList>
    <KeyValueList.Section title="Components">
      <KeyValueList.ItemWithDropdown items={systemDialogDropdownItems} key="System Dialog">
        <Text text="Open System Dialog" />
      </KeyValueList.ItemWithDropdown>

      <KeyValueList.ItemWithDropdown
        items={connectionErrorDialogDropdownItems}
        key="Connection Error (System Dialog)"
      >
        <Text text="Open Connection Error Dialog" />
      </KeyValueList.ItemWithDropdown>

      <KeyValueList.ItemWithDropdown items={modalDropdownItems} key="Modal">
        <Text text="Open Modal" />
      </KeyValueList.ItemWithDropdown>
    </KeyValueList.Section>
  </KeyValueList>
</section>

{#if openModal === 'key-storage-migration-failed'}
  <KeyStorageMigrationFailedModal services={{electron: stubbedElectron}} />
{:else if openModal === 'missing-cached-onprem-config'}
  <MissingCachedOnPremConfigModal services={{electron: stubbedElectron}} />
{:else if openModal === 'missing-work-credentials'}
  <MissingWorkCredentialsModal services={{electron: stubbedElectron}} />
{:else if openModal === 'threema-id-info'}
  <ThreemaIdInfoModal onclose={handleCloseModal} />
{:else if openModal === 'verification-level-info'}
  <VerificationLevelInfoModal colors="default" onclose={handleCloseModal} />
{/if}

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    gap: rem(8px);
    place-items: stretch;
    grid-auto-flow: row;
  }
</style>
