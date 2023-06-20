<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import EmojiGroups from '#3sc/components/generic/EmojiPicker/EmojiGroups.svelte';
  import EmojiPicker from '#3sc/components/generic/EmojiPicker/EmojiPicker.svelte';
  import {type u53} from '~/common/types';

  let emojiGroups: EmojiGroups;
  let emojiPicker: EmojiPicker;

  const dispatch = createEventDispatcher<{
    insertEmoji: string;
  }>();

  function setActiveGroup(event: CustomEvent<u53>): void {
    emojiGroups.setActiveGroup(event.detail);
  }

  function scrollToGroup(event: CustomEvent<u53>): void {
    emojiPicker.scrollToGroup(event.detail);
  }
</script>

<template>
  <div class="wrapper">
    <EmojiGroups bind:this={emojiGroups} on:groupClicked={scrollToGroup} />
    <EmojiPicker
      bind:this={emojiPicker}
      on:insertEmoji={(event) => dispatch('insertEmoji', event.detail)}
      on:activeGroupChange={setActiveGroup}
    />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .wrapper {
    // Layout
    display: grid;
    grid-template:
      'groups'
      'emojis' 1fr;
    height: rem(300px);
    width: rem(280px);
    padding: rem(8px);
    margin: rem(8px);
    max-height: calc(100vh - rem(8px) - rem(8px));

    // Styling
    @extend %elevation-060;
    background-color: var(--cc-emoji-picker-background-color);
    border-radius: rem(4px);
  }
</style>
