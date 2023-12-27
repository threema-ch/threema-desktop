<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import {createDropdownItems} from '~/app/ui/components/partials/settings/helpers';
  import {
    getAutoDownloadLabel,
    getAutodownloadDropdown,
  } from '~/app/ui/components/partials/settings/internal/media-settings/helpers';
  import type {MediaSettingsProps} from '~/app/ui/components/partials/settings/internal/media-settings/props';
  import {i18n} from '~/app/ui/i18n';
  import type {MediaSettingsView} from '~/common/model/types/settings';

  type $$Props = MediaSettingsProps;

  const log = globals.unwrap().uiLogging.logger('ui.component.media-settings');

  export let services: $$Props['services'];

  const {
    settings: {media: mediaSettings},
  } = services;

  function updateSetting<N extends keyof MediaSettingsView>(
    newValue: MediaSettingsView[N],
    updateKey: N,
  ): void {
    mediaSettings
      .get()
      .controller.update({[updateKey]: newValue})
      .catch(() => log.error(`Failed to update setting: ${updateKey}`));
  }

  $: autoDownloadDropdownItems = createDropdownItems(getAutodownloadDropdown($i18n), updateSetting);
</script>

<KeyValueList>
  <KeyValueList.Section title={$i18n.t('settings--media.label--section-media', 'Media')}>
    <KeyValueList.ItemWithDropdown
      key={$i18n.t('settings--media.label--auto-save', 'Auto-Download Incoming Media')}
      items={autoDownloadDropdownItems}
    >
      <Text text={getAutoDownloadLabel($mediaSettings.view.autoDownload, $i18n)}></Text>
    </KeyValueList.ItemWithDropdown>
  </KeyValueList.Section>
</KeyValueList>
