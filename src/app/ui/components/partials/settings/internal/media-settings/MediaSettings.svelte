<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import {createDropdownItems} from '~/app/ui/components/partials/settings/helpers';
  import {
    getAutoDownloadLabel,
    getAutodownloadDropdown,
  } from '~/app/ui/components/partials/settings/internal/media-settings/helpers';
  import type {MediaSettingsProps} from '~/app/ui/components/partials/settings/internal/media-settings/props';
  import {i18n} from '~/app/ui/i18n';

  type $$Props = MediaSettingsProps;

  export let actions: $$Props['actions'];
  export let settings: $$Props['settings'];

  $: autoDownloadDropdownItems = createDropdownItems(getAutodownloadDropdown($i18n), (newValue) => {
    actions.updateSettings({autoDownload: newValue});
  });
</script>

<KeyValueList>
  <KeyValueList.Section title={$i18n.t('settings--media.label--section-media', 'Media')}>
    <KeyValueList.ItemWithDropdown
      key={$i18n.t('settings--media.label--auto-save', 'Auto-Download Incoming Media')}
      items={autoDownloadDropdownItems}
    >
      <Text text={getAutoDownloadLabel(settings.autoDownload, $i18n)}></Text>
    </KeyValueList.ItemWithDropdown>
  </KeyValueList.Section>
</KeyValueList>
