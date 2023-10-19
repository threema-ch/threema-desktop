<!--
  @component 
  Renders a separator displaying the number of unread messages in a conversation.
-->
<script lang="ts">
  import type {UnreadMessagesIndicatorProps} from '~/app/ui/components/partials/chat-view/internal/unread-messages-indicator/props';
  import {i18n} from '~/app/ui/i18n';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = UnreadMessagesIndicatorProps;

  export let variant: $$Props['variant'];
</script>

<div class="unread-messages-indicator">
  {#if variant === 'new-messages'}
    {$i18n.t('messaging.label--unread-messages', 'New Messages')}
  {:else if variant === 'hairline'}
    <!-- No content. -->
  {:else}
    {unreachable(variant)}
  {/if}
</div>

<style lang="scss">
  @use 'component' as *;

  .unread-messages-indicator {
    display: flex;
    align-items: center;
    text-align: center;
    margin-top: rem(5px);
    margin-bottom: rem(5px);
    color: var(--t-color-primary);

    &::before,
    &::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--t-color-primary);
    }

    &::before {
      margin-left: rem(10px);
      margin-right: rem(10px);
    }

    &::after {
      margin-left: rem(10px);
      margin-right: rem(10px);
    }

    &:empty {
      opacity: 0.4;
      margin-top: rem(15px);
      margin-bottom: rem(15px);

      &::before {
        margin-right: 0;
      }

      &::after {
        margin-left: 0;
      }
    }
  }
</style>
