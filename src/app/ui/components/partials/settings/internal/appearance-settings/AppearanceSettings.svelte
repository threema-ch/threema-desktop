<!--
  @component
  Renders a settings page for appearance settings.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import {createDropdownItems} from '~/app/ui/components/partials/settings/helpers';
  import {
    getThemeDropdownLabel,
    getLocaleDropdownLabel,
    getThemeDropdown,
    getLocaleDropdown,
  } from '~/app/ui/components/partials/settings/internal/appearance-settings/helpers';
  import type {AppearanceSettingsProps} from '~/app/ui/components/partials/settings/internal/appearance-settings/props';
  import {type Locale, i18n} from '~/app/ui/i18n';
  import type {Theme} from '~/common/dom/ui/theme';
  import {InactiveContactsPolicy, InactiveContactsPolicyUtils, TimeFormat} from '~/common/enum';
  import type {AppearanceSettingsView} from '~/common/model/types/settings';

  type $$Props = AppearanceSettingsProps;

  const log = globals.unwrap().uiLogging.logger('ui.component.appearance-settings');

  export let services: $$Props['services'];

  const {
    storage: {theme, locale},
    settings: {appearance},
  } = services;

  $: use24hTime = !$appearance.view.use12hTime;
  $: showInactiveContacts = $appearance.view.inactiveContactsPolicy === InactiveContactsPolicy.SHOW;

  function updateSetting<N extends keyof AppearanceSettingsView>(
    newValue: AppearanceSettingsView[N],
    updateKey: N,
  ): void {
    appearance
      .get()
      .controller.update({[updateKey]: newValue})
      .catch(() => log.error(`Failed to update setting: ${updateKey}`));
  }

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
      checked={use24hTime}
      key={$i18n.t('settings--appearance.label--24-hour-time-format-title', 'Time Format')}
      on:switchevent={() =>
        updateSetting(
          use24hTime ? TimeFormat.USE_24HOUR_TIME : TimeFormat.DONT_USE_24HOUR_TIME,
          'timeFormat',
        )}
    >
      <Text
        text={$i18n.t(
          'settings--appearance.label--24-hour-time-format-value',
          'Enable 24-Hour Time',
        )}
      />
    </KeyValueList.ItemWithSwitch>
  </KeyValueList.Section>
  <KeyValueList.Section title={$i18n.t('settings--appearance.label--contact-list', 'Contact List')}>
    <KeyValueList.ItemWithSwitch
      key=""
      checked={showInactiveContacts}
      on:switchevent={() =>
        updateSetting(
          InactiveContactsPolicyUtils.fromNumber(showInactiveContacts ? 1 : 0),
          'inactiveContactsPolicy',
        )}
    >
      <Text
        text={$i18n.t(
          'settings--appearance.label--show-inactive-contacts',
          'Show Inactive Contacts',
        )}
      ></Text>
    </KeyValueList.ItemWithSwitch>
  </KeyValueList.Section>
</KeyValueList>
