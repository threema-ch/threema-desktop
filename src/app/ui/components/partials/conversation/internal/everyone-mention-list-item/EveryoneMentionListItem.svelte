<!--
  @component Renders a mention list item to mention everyone in the group.
-->
<script lang="ts">
  import type {EveryoneMentionListItemProps} from '~/app/ui/components/partials/conversation/internal/everyone-mention-list-item/props';
  import ReceiverCard from '~/app/ui/components/partials/receiver-card/ReceiverCard.svelte';
  import {i18n} from '~/app/ui/i18n';

  type $$Props = EveryoneMentionListItemProps;

  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];
</script>

<button class="button" on:click>
  <ReceiverCard
    content={{
      topLeft: [
        {
          type: 'receiver-name',
          receiver: {...receiver, name: $i18n.t('messaging.label--mention-all')},
        },
      ],
    }}
    options={{
      isClickable: true,
    }}
    {receiver}
    {services}
    size="md"
    on:click
  />
</button>

<style lang="scss">
  @use 'component' as *;

  .button {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;

    background-color: transparent;
    border: none;
    padding: rem(10px) rem(16px);
    text-decoration: inherit;
    color: inherit;

    &:hover {
      cursor: pointer;
      background-color: var(--cc-conversation-preview-background-color--hover);
    }

    &:focus-visible {
      box-shadow: inset 0em 0em 0em em(1px) var(--c-icon-button-naked-outer-border-color--focus);
      outline: none;
    }
  }
</style>
