<!--
  @component Renders a top bar with a back button and action buttons.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {i18n} from '~/app/ui/i18n';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  const dispatch = createEventDispatcher<{
    clickbackbutton: undefined;
    clicksettingsbutton: undefined;
  }>();

  let popover: SvelteNullableBinding<Popover> = null;

  function handleClickBackButton(): void {
    dispatch('clickbackbutton');
  }

  function handleClickSettingsButton(): void {
    dispatch('clicksettingsbutton');
  }
</script>

<header class="container">
  <div class="left">
    <IconButton flavor="naked" on:click={handleClickBackButton}>
      <MdIcon theme="Outlined">arrow_back</MdIcon>
    </IconButton>
  </div>

  <div class="center">
    <Text
      text={$i18n.t('contacts.label--contacts', 'Contacts')}
      color="mono-high"
      family="secondary"
      size="body"
    />
  </div>

  <div class="right">
    <ContextMenuProvider
      bind:popover
      anchorPoints={{
        reference: {
          horizontal: 'right',
          vertical: 'bottom',
        },
        popover: {
          horizontal: 'right',
          vertical: 'top',
        },
      }}
      items={[
        {
          icon: {
            name: 'settings',
            color: 'default',
          },
          label: $i18n.t('settings.label--title'),
          handler: handleClickSettingsButton,
        },
      ]}
      offset={{
        left: 0,
        top: 4,
      }}
      triggerBehavior="toggle"
      on:clickitem={() => popover?.close()}
    >
      <IconButton flavor="naked">
        <MdIcon theme="Outlined">more_vert</MdIcon>
      </IconButton>
    </ContextMenuProvider>
  </div>
</header>

<style lang="scss">
  @use 'component' as *;

  .container {
    grid-area: top-bar;
    padding: rem(12px) rem(8px);
    display: grid;
    grid-template:
      'left center right' min-content
      / rem(40px) auto rem(40px);
    gap: rem(12px);
    align-items: center;

    .left {
      grid-area: left;
    }

    .center {
      grid-area: center;
      justify-self: center;
    }

    .right {
      grid-area: right;
      justify-self: right;
    }
  }
</style>
