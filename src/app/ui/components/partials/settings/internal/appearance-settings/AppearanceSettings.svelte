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
    enumToBool,
    getThemeDropdownLabel,
    getLocaleDropdownLabel,
    getThemeDropdown,
    getLocaleDropdown,
  } from '~/app/ui/components/partials/settings/internal/appearance-settings/helpers';
  import type {AppearanceSettingsProps} from '~/app/ui/components/partials/settings/internal/appearance-settings/props';
  import {type Locale, i18n} from '~/app/ui/i18n';
  import type {Theme} from '~/common/dom/ui/theme';
  import {InactiveContactsPolicyUtils, TimeFormatUtils} from '~/common/enum';
  import {
    DEFAULT_TIME_FORMAT,
    DEFAULT_INACTIVE_CONTACT_POLICY,
    type AppearanceSettingsView,
  } from '~/common/model/types/settings';

  type $$Props = AppearanceSettingsProps;

  const log = globals.unwrap().uiLogging.logger('ui.component.appearance-settings');

  export let services: $$Props['services'];

  const {
    storage: {theme, locale},
    settings: {appearance},
  } = services;

  let is24hTime: boolean;
  let showInactiveContacts: boolean;
  $: {
    is24hTime = !enumToBool(appearance.get().view.timeFormat ?? DEFAULT_TIME_FORMAT);
    showInactiveContacts = enumToBool(
      appearance.get().view.inactiveContactsPolicy ?? DEFAULT_INACTIVE_CONTACT_POLICY,
    );
  }

  function changeSetting<N extends keyof AppearanceSettingsView>(
    newValue: AppearanceSettingsView[N],
    changeName: N,
  ): void {
    appearance
      .get()
      .controller.update({[changeName]: newValue})
      .catch(() => log.error(`Failed to update settings: ${changeName}`));
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
      checked={is24hTime}
      key={$i18n.t('settings--appearance.label--24-hour-time-format-title', 'Time Format')}
      on:switchevent={() =>
        changeSetting(TimeFormatUtils.fromNumber(is24hTime ? 0 : 1), 'timeFormat')}
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
        changeSetting(
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
