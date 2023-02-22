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

  /**
   * Whether this is a quote display or not.
   */
  export let isQuoted = false;
</script>

<template>
  <div class:is-quoted={isQuoted}>
    {#if message.type === 'text'}
      <div class="text">
        <Text text={message.body.text} {mentions} />
      </div>
    {:else if message.type === 'file'}
      <div class="file">
        <!-- TODO(DESK-932): Properly render message -->
        {#if message.body.filename !== undefined}
          Media / file message: {message.body.filename}
        {:else}
          Media / file message
        {/if}
        <br />
        <em>
          Please view this message on your mobile device. It is not yet supported on desktop.
        </em>
        {#if message.body.caption !== undefined}
          <br /><br />Caption: <em>{message.body.caption}</em>
        {/if}
      </div>
    {:else}
      <div class="unsupported-message">Unsupported message type `{message.type}`</div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .is-quoted {
    .text,
    .unsupported-message {
      opacity: 0.6;
    }
  }
</style>
