<!--
  @component
  Renders a settings page for appearance settings.
-->
<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import {createDropdownItems} from '~/app/ui/components/partials/settings/helpers';
  import {
    getLocaleDropdown,
    getLocaleDropdownLabel,
    getThemeDropdown,
    getThemeDropdownLabel,
  } from '~/app/ui/components/partials/settings/internal/appearance-settings/helpers';
  import type {AppearanceSettingsProps} from '~/app/ui/components/partials/settings/internal/appearance-settings/props';
  import {type Locale, i18n} from '~/app/ui/i18n';
  import type {Theme} from '~/common/dom/ui/theme';

  type $$Props = AppearanceSettingsProps;

  export let services: $$Props['services'];

  const {
    storage: {theme, locale, is24hTime},
  } = services;

  function updateTheme(newValue: Theme): void {
    $theme = newValue;
  }

  function updateLocale(newValue: Locale): void {
    $locale = newValue;
  }

  $: themeDropdownItems = createDropdownItems(getThemeDropdown($i18n), updateTheme);
  $: localeDropdownItems = createDropdownItems(getLocaleDropdown(), updateLocale);
</script>

<KeyValueList>
  <KeyValueList.Section
    title={$i18n.t('settings--appearance.label--section-general-appearance', 'General Appearance')}
  >
    <KeyValueList.ItemWithDropdown
      items={themeDropdownItems}
      key={$i18n.t('settings--appearance.label--theme', 'Theme')}
    >
      <Text text={getThemeDropdownLabel($theme, $i18n)} />
    </KeyValueList.ItemWithDropdown>
    <KeyValueList.ItemWithDropdown
      items={localeDropdownItems}
      key={$i18n.t('settings--appearance.label--locale', 'Language')}
    >
      <Text text={getLocaleDropdownLabel($locale)} />
    </KeyValueList.ItemWithDropdown>
  </KeyValueList.Section>
  <KeyValueList.Section
    title={$i18n.t('settings--appearance.label--section-date-time', 'Date & Time')}
  >
    <KeyValueList.ItemWithSwitch
      bind:checked={$is24hTime}
      key={$i18n.t('settings--appearance.label--24-hour-time-format-title', 'Time Format')}
    >
      <Text
        text={$i18n.t(
          'settings--appearance.label--24-hour-time-format-value',
          'Enable 24-Hour Time',
        )}
      />
    </KeyValueList.ItemWithSwitch>
  </KeyValueList.Section>
</KeyValueList>
