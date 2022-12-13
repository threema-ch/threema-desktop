<script lang="ts">
  import {type AnyMessageBody, type Message} from '~/common/viewmodel/types';

  /**
   * Conversation data.
   */
  export let message: Pick<Message<AnyMessageBody>, 'type'>;
</script>

<template>
  <div>Unsupported message type `{message.type}`</div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    padding: var(--mc-message-unsupported-padding);
  }
</style>
