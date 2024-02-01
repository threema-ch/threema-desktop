<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import {provideContextMenuEntries} from '~/app/ui/components/partials/contact-nav-bar/helpers';
  import type {ContactNavBarProps} from '~/app/ui/components/partials/contact-nav-bar/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {display} from '~/common/dom/ui/state';

  type $$Props = ContactNavBarProps;

  export let services: $$Props['services'];

  const {router} = services;

  $: items = provideContextMenuEntries(router, $i18n, $display);

  const dispatch = createEventDispatcher();

  let popover: SvelteNullableBinding<Popover> = null;
</script>

<header>
  <IconButton
    flavor="naked"
    on:click={() => {
      dispatch('back');
    }}
  >
    <MdIcon theme="Outlined">arrow_back</MdIcon>
  </IconButton>
  {$i18n.t('contacts.label--contacts', 'Contacts')}
  <ContextMenuProvider
    bind:popover
    {items}
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
</header>

<style lang="scss">
  @use 'component' as *;
  header {
    display: grid;
    grid-template:
      'back title more'
      / min-content auto min-content;
    grid-auto-flow: column;
    justify-content: space-between;
    place-items: center;
    user-select: none;
  }
</style>
