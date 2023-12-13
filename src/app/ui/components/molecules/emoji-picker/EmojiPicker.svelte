<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import EmojiGroups from '#3sc/components/generic/EmojiPicker/EmojiGroups.svelte';
  import EmojiPicker from '#3sc/components/generic/EmojiPicker/EmojiPicker.svelte';
  import type {u53} from '~/common/types';

  const dispatch = createEventDispatcher<{
    clickemoji: string;
  }>();

  let emojiGroupsComponent: EmojiGroups;
  let emojiListComponent: EmojiPicker;

  function handleClickGroup(event: CustomEvent<u53>): void {
    emojiListComponent.scrollToGroup(event.detail);
  }

  function handleChangeGroup(event: CustomEvent<u53>): void {
    emojiGroupsComponent.setActiveGroup(event.detail);
  }
</script>

<div class="container">
  <EmojiGroups bind:this={emojiGroupsComponent} on:groupClicked={handleClickGroup} />
  <EmojiPicker
    bind:this={emojiListComponent}
    on:insertEmoji={(event) => dispatch('clickemoji', event.detail)}
    on:activeGroupChange={handleChangeGroup}
  />
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    grid-template:
      'groups'
      'emojis' 1fr;
    height: rem(300px);
    width: rem(280px);
    padding: rem(8px);
    max-height: min(100%, 100vh);

    @extend %elevation-060;
    background-color: var(--cc-emoji-picker-background-color);
    border-radius: rem(4px);
  }
</style>
