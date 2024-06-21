<!--
  @component Renders a modal to toggle spellcheck on or off.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {ToggleSpellcheckModalProps} from '~/app/ui/components/partials/settings/internal/appearance-settings/internal/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  type $$Props = ToggleSpellcheckModalProps;

  export let isSpellcheckEnabled: $$Props['isSpellcheckEnabled'];

  const dispatch = createEventDispatcher<{
    clickconfirmandrestart: undefined;
  }>();

  function handleClickConfirmAndRestart(): void {
    dispatch('clickconfirmandrestart');
  }
</script>

<Modal
  wrapper={{
    type: 'card',
    actions: [
      {
        iconName: 'close',
        onClick: 'close',
      },
    ],
    buttons: [
      {
        label: $i18n.t('dialog--toggle-spellcheck.action--cancel', 'Cancel'),
        type: 'naked',
        onClick: 'close',
      },
      {
        label: $i18n.t('dialog--toggle-spellcheck.action--confirm', 'Confirm and Restart'),
        type: 'filled',
        onClick: handleClickConfirmAndRestart,
      },
    ],
    title: isSpellcheckEnabled
      ? $i18n.t('dialog--toggle-spellcheck.label--title-disable', 'Turn off Spellcheck')
      : $i18n.t('dialog--toggle-spellcheck.label--title-enable', 'Turn on Spellcheck'),
    maxWidth: 520,
  }}
  on:close
>
  <div class="content">
    {#if isSpellcheckEnabled}
      <div class="warning">
        <MdIcon theme="Filled">warning</MdIcon>
        <Text
          text={$i18n.t(
            'dialog--toggle-spellcheck.prose--warning-disable',
            'Turning off the spellcheck will trigger a restart of the application.',
          )}
        />
      </div>
    {:else}
      <div class="warning">
        <MdIcon theme="Filled">warning</MdIcon>
        <Text
          text={$i18n.t(
            'dialog--toggle-spellcheck.prose--warning-enable',
            'Turning on the spellcheck will trigger a restart of the application.',
          )}
        />
      </div>
    {/if}
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    .warning {
      display: flex;
      align-items: center;
      justify-content: start;
      gap: rem(8px);
      padding: 0 rem(16px);
    }
  }
</style>
