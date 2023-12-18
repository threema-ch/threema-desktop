<!--
  @component
  Renders a settings page for security settings.
-->
<script lang="ts">
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import type {SecuritySettingsProps} from '~/app/ui/components/partials/settings/internal/security-settings/props';
  import {i18n} from '~/app/ui/i18n';

  type $$Props = SecuritySettingsProps;

  export let services: $$Props['services'];

  const {router} = services;

  function handleClickChangePassword(): void {
    router.replaceModal(ROUTE_DEFINITIONS.modal.changePassword.withoutParams());
  }
</script>

<KeyValueList>
  <KeyValueList.Section
    title={$i18n.t('settings--security.label--app-protection', 'App Protection')}
  >
    <KeyValueList.ItemWithButton key="" icon="edit" on:click={handleClickChangePassword}>
      <Text text={$i18n.t('settings--security.label--change-password', 'Change App Password')} />
    </KeyValueList.ItemWithButton>
  </KeyValueList.Section>
</KeyValueList>
