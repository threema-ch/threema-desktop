<!--
  @component
  Message "payload" content display (e.g. text or image).
-->
<script lang="ts">
  import Text from '~/app/ui/generic/form/Text.svelte';
  import {type AnyMessageBody, type Message} from '~/common/viewmodel/types';
  import {type Mention} from '~/common/viewmodel/utils/mentions';

  /**
   * The message to be parsed and displayed with the requested features.
   */
  export let message: Message<AnyMessageBody>;

  /**
   * Mentions parsed from the message
   */
  export let mentions: Mention[];
</script>

<template>
  {#if message.type === 'text'}
    <div class="text">
      <Text text={message.body.text} {mentions} />
    </div>
  {:else}
    <div class="unsupported-message">Unsupported message type `{message.type}`</div>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .text,
  .unsupported-message {
    padding: var(--mc-message-content-padding);
  }
</style>
