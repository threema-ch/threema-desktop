<script lang="ts">
  import type {AppServices} from '~/app/types';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import type {ConnectionErrorDialog, SystemDialog} from '~/common/system-dialog';
  import {unreachable} from '~/common/utils/assert';

  export let services: AppServices;

  // Unpack services.
  const {systemDialog} = services;

  const systemDialogDropdownItems: ContextMenuItem[] = (
    [
      'auto-app-update-download',
      'auto-app-update-failed',
      'auto-app-update-prompt',
      'device-cookie-mismatch',
      'invalid-work-credentials',
      'manual-app-update',
      'missing-device-cookie',
      'server-alert',
      'unrecoverable-state',
      'device-protocols-incompatible',
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
                  arch: 'unknown',
                  locale: 'en',
                  os: 'linux',
                },
              },
            });
          },
          label: 'Manual App Update',
        };

      case 'missing-device-cookie':
        return {
          type: 'option',
          handler: () => {
            systemDialog.open({
              type,
            });
          },
          label: 'Missing Device Cookie',
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
    </KeyValueList.Section>
  </KeyValueList>
</section>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    gap: rem(8px);
    place-items: stretch;
    grid-auto-flow: row;
  }
</style>
