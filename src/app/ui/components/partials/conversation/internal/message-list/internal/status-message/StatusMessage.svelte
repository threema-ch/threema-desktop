<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Bubble from '~/app/ui/components/molecules/message/internal/bubble/Bubble.svelte';
  import type {AnyStatusMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/props';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  type $$Props = Omit<AnyStatusMessageProps, 'type' | 'id'>;

  export let action: SvelteNullableBinding<$$Props['action']> = undefined;
  export let information: $$Props['information'];
</script>

<Bubble padding="thin" direction={'none'} clickable={action !== undefined}>
  <Text text={information.text} color="mono-low" wrap={true} size={'body-small'}></Text>
</Bubble>
