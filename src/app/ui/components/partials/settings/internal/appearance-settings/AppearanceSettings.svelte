<!--
  @component Renders a settings page for appearance settings.
-->
<script lang="ts">
  import {onMount} from 'svelte';

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
  import ToggleSpellCheckModal from '~/app/ui/components/partials/settings/internal/appearance-settings/internal/ToggleSpellCheckModal.svelte';
  import type {AppearanceSettingsProps} from '~/app/ui/components/partials/settings/internal/appearance-settings/props';
  import type {ModalState} from '~/app/ui/components/partials/settings/internal/appearance-settings/types';
  import {type Locale, i18n} from '~/app/ui/i18n';
  import type {Theme} from '~/common/dom/ui/theme';
  import {InactiveContactsPolicy, InactiveContactsPolicyUtils, TimeFormat} from '~/common/enum';
  import {extractErrorMessage} from '~/common/error';
  import {ensureError, unreachable} from '~/common/utils/assert';

  type $$Props = AppearanceSettingsProps;

  const log = globals.unwrap().uiLogging.logger('ui.component.appearance-settings');

  export let services: $$Props['services'];
  export let actions: $$Props['actions'];
  export let settings: $$Props['settings'];

  let isSpellcheckEnabled: boolean | undefined = undefined;
  let isSpellcheckEnabledToggleState: boolean = false;

  let modalState: ModalState = {type: 'none'};

  const {
    storage: {theme, locale},
  } = services;

  function updateTheme(newValue: Theme): void {
    $theme = newValue;
  }

  function updateLocale(newValue: Locale): void {
    $locale = newValue;
  }

  function handleClickToggleSpellcheck(): void {
    modalState = {
      type: 'toggle-spellcheck',
      props: {isSpellcheckEnabled: isSpellcheckEnabled ?? false},
    };
  }

  function handleCloseToggleSpellcheckModal(): void {
    isSpellcheckEnabledToggleState = isSpellcheckEnabled ?? false;
    modalState = {type: 'none'};
  }

  function handleClickConfirmAndRestartToggleSpellcheckModal(): void {
    if (isSpellcheckEnabled === undefined) {
      // It should not be possible to reach this point, because for the modal to be shown,
      // `isSpellcheckEnabled` must be defined.
      log.error('Spellcheck was toggled but its current status was unknown');
      return;
    }
    window.app.setSpelleckEnabledAndRestart(!isSpellcheckEnabled);
  }

  onMount(() => {
    window.app
      .isSpellcheckEnabled()
      .then((enabled) => {
        isSpellcheckEnabled = enabled;
        isSpellcheckEnabledToggleState = enabled ?? false;
      })
      .catch((error) => {
        log.error(
          `Couldn't get information about the spellchecker from electron: ${extractErrorMessage(
            ensureError(error),
            'short',
          )}`,
        );
      });
  });

  $: themeDropdownItems = createDropdownItems(getThemeDropdown($i18n), updateTheme);
  $: localeDropdownItems = createDropdownItems(getLocaleDropdown(), updateLocale);

  $: showInactiveContacts = settings.inactiveContactsPolicy === InactiveContactsPolicy.SHOW;
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
  </KeyValueList.Section>

  <KeyValueList.Section
    title={$i18n.t('settings--appearance.label--section-language-and-region', 'Language & Region')}
  >
    <KeyValueList.ItemWithDropdown
      items={localeDropdownItems}
      key={$i18n.t('settings--appearance.label--locale', 'Language')}
    >
      <Text text={getLocaleDropdownLabel($locale)} />
    </KeyValueList.ItemWithDropdown>

    {#if isSpellcheckEnabled !== undefined}
      <KeyValueList.ItemWithSwitch
        key={$i18n.t('settings--appearance.label--spellcheck', 'Spellcheck')}
        bind:checked={isSpellcheckEnabledToggleState}
        on:switchevent={() => handleClickToggleSpellcheck()}
      >
        {#if isSpellcheckEnabled}
          <Text
            text={$i18n.t(
              'settings--appearance.prose--spellcheck-turned-on',
              'Spellcheck is currently turned on',
            )}
          />
        {:else}
          <Text
            text={$i18n.t(
              'settings--appearance.prose--spellcheck-turned-off',
              'Spellcheck is currently turned off',
            )}
          />
        {/if}
      </KeyValueList.ItemWithSwitch>
    {/if}

    <KeyValueList.ItemWithSwitch
      checked={settings.use24hTime}
      key={$i18n.t('settings--appearance.label--24-hour-time-format-title', 'Time Format')}
      on:switchevent={() =>
        // Note: Boolean logic is inverted because we're toggling it
        actions.updateSettings({
          timeFormat: !settings.use24hTime ? TimeFormat.TIME_24H : TimeFormat.TIME_12H,
        })}
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
        actions.updateSettings({
          inactiveContactsPolicy: InactiveContactsPolicyUtils.fromNumber(
            showInactiveContacts ? 1 : 0,
          ),
        })}
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

{#if modalState.type === 'none'}
  <!-- Do nothing-->
{:else if modalState.type === 'toggle-spellcheck'}
  <ToggleSpellCheckModal
    {...modalState.props}
    on:clickconfirmandrestart={handleClickConfirmAndRestartToggleSpellcheckModal}
    on:close={handleCloseToggleSpellcheckModal}
  />
{:else}
  {unreachable(modalState)}
{/if}
