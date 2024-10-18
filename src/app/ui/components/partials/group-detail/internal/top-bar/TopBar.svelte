<!--
  @component Renders a top bar with a back button.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {I18nType} from '~/app/ui/i18n-types';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {display} from '~/common/dom/ui/state';

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

  function getTitle(currentI18n: I18nType): string {
    return currentI18n.t('contacts.label--group-detail', 'Group Details');
  }
</script>

<header class="container" data-display={$display}>
  <div class="left">
    <IconButton flavor="naked" on:click={handleClickBack}>
      <MdIcon theme="Outlined">arrow_back</MdIcon>
    </IconButton>
  </div>

  <div class="center">
    <Text text={getTitle($i18n)} color="mono-high" family="secondary" size="body" />
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
