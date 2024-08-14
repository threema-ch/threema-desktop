<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import type {ChatSettingsProps} from '~/app/ui/components/partials/settings/internal/chat-settings/props';
  import {i18n} from '~/app/ui/i18n';
  import type {SystemInfo} from '~/common/electron-ipc';
  import {ComposeBarEnterMode} from '~/common/enum';
  import type {ChatSettingsViewNonDerivedProperties} from '~/common/model/types/settings';

  type $$Props = ChatSettingsProps;

  const log = globals.unwrap().uiLogging.logger('ui.component.chat-settings');

  export let services: $$Props['services'];

  const {
    settings: {chat},
  } = services;

  let systemInfo: SystemInfo | undefined = undefined;

  window.app
    .getSystemInfo()
    .then((systemInfo_) => (systemInfo = systemInfo_))
    .catch((error) => {
      log.error('Could not fetch system info', error);
    });

  $: onEnterSubmit = $chat.view.onEnterSubmit;

  $: onEnterSubmitToggleState = onEnterSubmit;

  function updateSetting<N extends keyof ChatSettingsViewNonDerivedProperties>(
    newValue: ChatSettingsViewNonDerivedProperties[N],
    updateKey: N,
  ): void {
    chat
      .get()
      .controller.update({[updateKey]: newValue})
      .catch(() => log.error(`Failed to update setting: ${updateKey}`));
  }
</script>

<KeyValueList>
  <KeyValueList.Section title={$i18n.t('settings--chat.label--keyboard', 'Keyboard')}>
    <KeyValueList.ItemWithSwitch
      key={$i18n.t('settings--chat.label--on-enter-send', 'Enter to Send')}
      bind:checked={onEnterSubmitToggleState}
      on:switchevent={() =>
        updateSetting(
          !onEnterSubmit ? ComposeBarEnterMode.SUBMIT : ComposeBarEnterMode.LINE_BREAK,
          'composeBarEnterMode',
        )}
    >
      <Text
        text={onEnterSubmit
          ? $i18n.t(
              'settings--chat.label--on-enter-submit',
              'Enter key sends the message. Use Shift + Enter to add a new line.',
            )
          : $i18n.t(
              'settings--chat.label--on-enter-new-line',
              'Enter key adds a new line. Use {keyCombination} to send the message.',
              {
                keyCombination: systemInfo?.os === 'macos' ? '⌘ + Enter' : 'Ctrl + Enter',
              },
            )}
      />
    </KeyValueList.ItemWithSwitch>
  </KeyValueList.Section>
</KeyValueList>
