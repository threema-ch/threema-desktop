<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {contextmenu} from '~/app/ui/actions/contextmenu';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import Bubble from '~/app/ui/components/molecules/message/internal/bubble/Bubble.svelte';
  import {getContextMenuItems} from '~/app/ui/components/partials/conversation/internal/message-list/internal/status-message/helpers';
  import type {StatusMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/status-message/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {AnchorPoint, VirtualRect} from '~/app/ui/generic/popover/types';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  type $$Props = Omit<StatusMessageProps, 'type' | 'id' | 'at' | 'status'>;

  export let action: SvelteNullableBinding<$$Props['action']> = undefined;
  export let boundary: $$Props['boundary'] = undefined;
  export let text: $$Props['text'];

  let popover: SvelteNullableBinding<Popover> = null;
  let virtualTrigger: VirtualRect | undefined = undefined;

  const anchorPoints: AnchorPoint = {
    reference: {
      horizontal: 'left',
      vertical: 'bottom',
    },
    popover: {
      horizontal: 'left',
      vertical: 'top',
    },
  };

  const dispatch = createEventDispatcher<{
    clickdeleteoption: undefined;
    clickopendetailsoption: undefined;
  }>();

  function handleClickDelete(): void {
    popover?.close();
    dispatch('clickdeleteoption');
  }

  function handleClickMessageDetails(): void {
    popover?.close();
    dispatch('clickopendetailsoption');
  }

  function handleClickTrigger(): void {
    virtualTrigger = undefined;
  }

  function handleContextMenuEvent(event: MouseEvent): void {
    if (event.type === 'contextmenu') {
      virtualTrigger = {
        width: 0,
        height: 0,
        left: event.clientX,
        right: 0,
        top: event.clientY,
        bottom: 0,
      };

      popover?.open(event);
    } else {
      virtualTrigger = undefined;
    }
  }

  const menuItems = getContextMenuItems($i18n, handleClickMessageDetails, handleClickDelete);
</script>

<ContextMenuProvider
  bind:popover
  {anchorPoints}
  closeOnClickOutside={true}
  container={boundary}
  items={menuItems}
  offset={{left: 0, top: 4}}
  reference={virtualTrigger}
  triggerBehavior={virtualTrigger === undefined ? 'toggle' : 'open'}
  on:clicktrigger={handleClickTrigger}
>
  <div class="container">
    <div class="message" use:contextmenu={handleContextMenuEvent}>
      <Bubble padding="sm" direction="none" clickable={action !== undefined}>
        <Text {text} color="mono-low" wrap={true} size="body-small" selectable={true} />
      </Bubble>
    </div>
  </div>
</ContextMenuProvider>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    align-items: start;
    justify-content: start;
    gap: rem(4px);
  }
</style>
