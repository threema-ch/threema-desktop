<script lang="ts">
  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import type {ChatSettingsProps} from '~/app/ui/components/partials/settings/internal/chat-settings/props';
  import {i18n} from '~/app/ui/i18n';
  import type {SystemInfo} from '~/common/electron-ipc';
  import {ComposeBarEnterMode} from '~/common/enum';

  type $$Props = ChatSettingsProps;

  const log = globals.unwrap().uiLogging.logger('ui.component.chat-settings');

  export let actions: $$Props['actions'];
  export let settings: $$Props['settings'];

  let systemInfo: SystemInfo | undefined = undefined;

  window.app
    .getSystemInfo()
    .then((systemInfo_) => (systemInfo = systemInfo_))
    .catch((error) => {
      log.error('Could not fetch system info', error);
    });

  $: onEnterSubmit = settings.onEnterSubmit;

  $: onEnterSubmitToggleState = onEnterSubmit;
</script>

<KeyValueList>
  <KeyValueList.Section title={$i18n.t('settings--chat.label--keyboard', 'Keyboard')}>
    <KeyValueList.ItemWithSwitch
      key={$i18n.t('settings--chat.label--on-enter-send', 'Enter to Send')}
      bind:checked={onEnterSubmitToggleState}
      on:switchevent={() =>
        actions.updateSettings({
          composeBarEnterMode: !onEnterSubmit
            ? ComposeBarEnterMode.SUBMIT
            : ComposeBarEnterMode.LINE_BREAK,
        })}
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
