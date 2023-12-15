<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import {createDropdownItems} from '~/app/ui/components/partials/settings/helpers';
  import {
    localeDropdown,
    localeLabel,
    themeDropdown,
    themeLabel,
  } from '~/app/ui/components/partials/settings/internal/appearance-settings/helpers';
  import type {AppearanceSettingsProps} from '~/app/ui/components/partials/settings/internal/appearance-settings/props';
  import type {
    ThemeRecord,
    ThemeType,
    LocaleRecord,
    LocaleType,
  } from '~/app/ui/components/partials/settings/internal/appearance-settings/types';
  import {i18n} from '~/app/ui/i18n';

  type $$Props = AppearanceSettingsProps;

  export let services: $$Props['services'];

  const {
    storage: {theme, locale, is24hTime},
  } = services;

  function updateTheme(newValue: ThemeType): void {
    $theme = newValue;
  }

  function updateLocale(newValue: LocaleType): void {
    $locale = newValue;
  }

  const themeItems = createDropdownItems<ThemeRecord, ThemeType>(themeDropdown($i18n), updateTheme);

  const localeItems = createDropdownItems<LocaleRecord, LocaleType>(localeDropdown(), updateLocale);
</script>

<template>
  <div>
    <KeyValueList>
      <KeyValueList.Section
        title={$i18n.t(
          'settings--appearance-settings.label--section-general-appearance',
          'General Appearance',
        )}
      >
        <!--@TODO (DESK-630) This popover binding does not close on click -->
        <KeyValueList.ItemWithDropdown
          items={themeItems}
          key={$i18n.t('settings--appearance-settings.label--theme', 'Theme')}
        >
          <Text text={themeLabel($theme, $i18n)}></Text>
        </KeyValueList.ItemWithDropdown>
        <KeyValueList.ItemWithDropdown
          items={localeItems}
          key={$i18n.t('settings--appearance-settings.label--locale', 'Language')}
        >
          <Text text={localeLabel($locale)}></Text>
        </KeyValueList.ItemWithDropdown>
      </KeyValueList.Section>
      <KeyValueList.Section
        title={$i18n.t('settings--appearance-settings.label--section-date-time', 'Date & Time')}
      >
        <KeyValueList.ItemWithSwitch
          bind:checked={$is24hTime}
          key={$i18n.t(
            'settings--appearance-settings.label--24-hour-time-format-title',
            'Time Format',
          )}
        >
          <Text
            text={$i18n.t(
              'settings--appearance-settings.label--24-hour-time-format-value',
              'Enable 24-Hour Time',
            )}
          ></Text>
        </KeyValueList.ItemWithSwitch>
      </KeyValueList.Section>
    </KeyValueList>
  </div>
</template>
