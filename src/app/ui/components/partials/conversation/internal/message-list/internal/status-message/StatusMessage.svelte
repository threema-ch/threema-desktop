<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {contextmenu} from '~/app/ui/actions/contextmenu';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import Bubble from '~/app/ui/components/molecules/message/internal/bubble/Bubble.svelte';
  import type {AnyStatusMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/props';
  import {getContextMenuItems} from '~/app/ui/components/partials/conversation/internal/message-list/internal/status-message/helpers';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {AnchorPoint, VirtualRect} from '~/app/ui/generic/popover/types';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  type $$Props = Omit<AnyStatusMessageProps, 'type' | 'id'>;

  export let boundary: $$Props['boundary'] = undefined;
  export let action: SvelteNullableBinding<$$Props['action']> = undefined;
  export let information: $$Props['information'];
  export let services: $$Props['services'];
  unusedProp(services);

  let popover: SvelteNullableBinding<Popover> = null;
  let virtualTrigger: VirtualRect | undefined = undefined;

  const anchorPoints: AnchorPoint = {
    reference: {
      horizontal: 'center',
      vertical: 'bottom',
    },
    popover: {
      horizontal: 'center',
      vertical: 'top',
    },
  };

  const dispatch = createEventDispatcher<{clickdeleteoption: undefined}>();

  function handleClickDelete(): void {
    popover?.close();
    dispatch('clickdeleteoption');
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

  const popoverItems = getContextMenuItems($i18n, handleClickDelete);
</script>

<div use:contextmenu={handleContextMenuEvent}>
  <Bubble padding="medium" direction={'none'} clickable={action !== undefined}>
    <Text text={information.text} color="mono-low" wrap={true} size={'body-small'} selectable={true}
    ></Text>
  </Bubble>
</div>
<ContextMenuProvider
  bind:popover
  items={popoverItems}
  container={boundary}
  triggerBehavior={virtualTrigger === undefined ? 'toggle' : 'open'}
  offset={{left: 0, top: 4}}
  {anchorPoints}
  reference={virtualTrigger}
  on:clicktrigger={() => (virtualTrigger = undefined)}
></ContextMenuProvider>
