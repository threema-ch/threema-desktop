<!--
  @component Renders a list of preview cards for the given receivers.
-->
<script lang="ts" generics="THandlerProps = never">
  import {createEventDispatcher} from 'svelte';

  import type {ConversationRouteParams} from '~/app/ui/components/partials/conversation/types';
  import ReceiverPreview from '~/app/ui/components/partials/receiver-preview-list/internal/receiver-preview/ReceiverPreview.svelte';
  import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';
  import {transformContextMenuItemsToContextMenuOptions} from '~/app/ui/components/partials/receiver-preview-list/transformers';
  import {reactive, type SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';

  // Generic parameters are not yet recognized by the linter.
  // See https://github.com/sveltejs/eslint-plugin-svelte/issues/521
  // and https://github.com/sveltejs/svelte-eslint-parser/issues/306
  // eslint-disable-next-line no-undef
  type $$Props = ReceiverPreviewListProps<THandlerProps>;

  export let contextMenuItems: $$Props['contextMenuItems'] = undefined;
  export let highlights: $$Props['highlights'] = undefined;
  export let items: $$Props['items'] = [];
  export let options: NonNullable<$$Props['options']> = {};
  export let services: $$Props['services'];

  const {router} = services;

  let routeParams: ConversationRouteParams | undefined = undefined;

  let containerElement: SvelteNullableBinding<HTMLElement> = null;

  const dispatch = createEventDispatcher<{
    clickitem: DbReceiverLookup;
  }>();

  function handleChangeRouterState(): void {
    const routerState = router.get();

    if (routerState.main.id === 'conversation') {
      routeParams = routerState.main.params;
    } else {
      // If we are not in a conversation, reset `routeParams` to `undefined` to clear the view.
      routeParams = undefined;
    }
  }

  function handleClickItem(event: MouseEvent, lookup?: DbReceiverLookup, active?: boolean): void {
    event.preventDefault();
    if (lookup === undefined) {
      return;
    }
    dispatch('clickitem', lookup);

    if (options.routeOnClick === false) {
      return;
    }
    if (active === true) {
      // Close conversation of the respective receiver if it was already open.
      router.goToWelcome();
    } else {
      router.openConversationAndDetailsForReceiver(lookup);
    }
  }

  $: reactive(handleChangeRouterState, [$router]);
</script>

<ul bind:this={containerElement} class="container">
  {#each items as item (item.receiver.type === 'self' ? 'self' : `${item.receiver.lookup.type}.${item.receiver.lookup.uid}`)}
    {@const {receiver} = item}
    {@const active =
      receiver.type === 'self'
        ? false
        : routeParams?.receiverLookup.type === receiver.lookup.type &&
          routeParams.receiverLookup.uid === receiver.lookup.uid}

    <ReceiverPreview
      {active}
      contextMenuOptions={contextMenuItems === undefined
        ? undefined
        : {
            container: containerElement,
            ...transformContextMenuItemsToContextMenuOptions(item, contextMenuItems),
          }}
      {highlights}
      options={{
        highlightWhenActive: options.highlightActiveReceiver,
      }}
      {receiver}
      {services}
      on:click={(event) =>
        handleClickItem(
          event.detail,
          receiver.type === 'self' ? undefined : receiver.lookup,
          active,
        )}
    />
  {/each}
</ul>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;
    overflow: hidden;

    list-style-type: none;
    margin: 0;
    padding: 0;
    max-width: 100%;
  }
</style>
