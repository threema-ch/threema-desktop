<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {type Readable} from 'svelte/store';

  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ComposeArea from '~/app/ui/main/conversation/compose/ComposeArea.svelte';

  /**
   * Text that will be used to initialize the compose area.
   */
  export let initialText: string | undefined;

  // Component event dispatcher
  const dispatch = createEventDispatcher<{
    recordAudio: undefined;
    attachData: undefined;
    sendMessage: string;
  }>();

  // Reference to the compose area component
  let composeArea: ComposeArea;
  let composeAreaIsEmpty: Readable<boolean>;

  // TODO(WEBMD-196): Record audio messages
  // function recordAudio(): void {
  //   dispatch('recordAudio');
  // }

  function attachData(): void {
    dispatch('attachData');
  }

  function sendMessage(): void {
    dispatch('sendMessage', composeArea.getText());
    composeArea.clearText();
  }

  /**
   * Insert more text content into the compose area
   */
  export function insertText(text: string): void {
    composeArea.insertText(text);
  }

  /**
   * Get current inserted text
   */
  export function getText(): string {
    return composeArea.getText();
  }

  /**
   * Remove entered text
   */
  export function clearText(): void {
    composeArea.clearText();
  }

  /**
   * Focus wrapper div
   */
  export function focus(): void {
    composeArea.focus();
  }
</script>

<template>
  <div>
    <IconButton flavor="naked" on:click={attachData} class="wip">
      <MdIcon theme="Outlined">attach_file</MdIcon>
    </IconButton>
    <ComposeArea
      {initialText}
      bind:this={composeArea}
      bind:isEmpty={composeAreaIsEmpty}
      on:submit={sendMessage}
    />
    <IconButton flavor="naked" class="wip">
      <MdIcon theme="Outlined">insert_emoticon</MdIcon>
    </IconButton>
    {#if $composeAreaIsEmpty}
      <!-- <IconButton flavor="naked" on:click={recordAudio} class="wip">
        <MdIcon theme="Outlined">mic_none</MdIcon>
      </IconButton> -->
    {:else}
      <IconButton flavor="filled" on:click={sendMessage}>
        <MdIcon theme="Filled">arrow_upward</MdIcon>
      </IconButton>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    display: grid;
    grid-template: 100% / auto 1fr auto auto;
    align-items: end;
    padding: rem(12px) rem(8px);
  }
</style>
