<!--
  @component Renders a top bar with a back button.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {TopBarProps} from '~/app/ui/components/partials/contact-detail/internal/top-bar/props';
  import {i18n} from '~/app/ui/i18n';
  import type {I18nType} from '~/app/ui/i18n-types';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {display} from '~/common/dom/ui/state';
  import {unreachable} from '~/common/utils/assert';
  import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

  type $$Props = TopBarProps;

  export let receiver: $$Props['receiver'];

  const dispatch = createEventDispatcher<{
    clickback: undefined;
    clickclose: undefined;
  }>();

  function handleClickBack(): void {
    dispatch('clickback');
  }

  function handleClickClose(): void {
    dispatch('clickclose');
  }

  function getTitle(currentI18n: I18nType, currentReceiver: Pick<AnyReceiverData, 'type'>): string {
    switch (currentReceiver.type) {
      case 'contact':
        return currentI18n.t('contacts.label--contact-detail', 'Contact Details');

      case 'distribution-list':
        throw new Error('TODO(DESK-236): Implement distribution lists');

      case 'group':
        return currentI18n.t('contacts.label--group-detail', 'Group Details');

      default:
        return unreachable(currentReceiver.type);
    }
  }
</script>

<header class="container" data-display={$display}>
  <div class="left">
    <IconButton flavor="naked" on:click={handleClickBack}>
      <MdIcon theme="Outlined">arrow_back</MdIcon>
    </IconButton>
  </div>

  <div class="center">
    <Text text={getTitle($i18n, receiver)} color="mono-high" family="secondary" size="body" />
  </div>

  <div class="right">
    <IconButton flavor="naked" on:click={handleClickClose}>
      <MdIcon theme="Outlined">close</MdIcon>
    </IconButton>
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
    }

    &[data-display='large'] .left {
      visibility: hidden;
    }

    &:not([data-display='large']) .right {
      visibility: hidden;
    }
  }
</style>
