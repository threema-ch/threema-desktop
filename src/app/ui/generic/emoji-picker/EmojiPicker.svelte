<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {fade} from 'svelte/transition';

  import EmojiGroups from '#3sc/components/generic/EmojiPicker/EmojiGroups.svelte';
  import EmojiPicker from '#3sc/components/generic/EmojiPicker/EmojiPicker.svelte';
  import {type u32, type u53} from '~/common/types';

  let wrapper: HTMLElement;
  let emojiGroups: EmojiGroups;
  let emojiPicker: EmojiPicker;

  let visible = false;

  const dispatch = createEventDispatcher<{
    insertEmoji: string;
  }>();

  /**
   * Reference position X for emoji picker
   */
  export let x: u32;
  /**
   * Reference position Y for emoji picker
   */
  export let y: u32;

  // Top left position of emoji picker
  let xTopLeft: u32;
  let yTopLeft: u32;

  /**
   * Return whether the emoji picker is visible.
   */
  export function isVisible(): boolean {
    return visible;
  }

  /**
   * Show the emoji picker.
   */
  export function show(): void {
    visible = true;
  }

  /**
   * Hide the emoji picker.
   */
  export function hide(): void {
    visible = false;
  }

  // Recompute positioning when wrapper is shown
  $: if (wrapper !== undefined && wrapper !== null) {
    const computedStyle = window.getComputedStyle(wrapper);
    // Note: Fixed positioning includes the margin, thus we need to subtract it below
    xTopLeft = x - wrapper.offsetWidth - parseInt(computedStyle.marginLeft, 10);
    yTopLeft = y - wrapper.offsetHeight - parseInt(computedStyle.marginTop, 10);
  }

  function setActiveGroup(event: CustomEvent<u53>): void {
    emojiGroups.setActiveGroup(event.detail);
  }

  function scrollToGroup(event: CustomEvent<u53>): void {
    emojiPicker.scrollToGroup(event.detail);
  }

  /**
   * Handle clicks on the <body> element (to detect clicks outside the emoji picker).
   */
  function onBodyClick(event: MouseEvent): void {
    // Ignore if picker isn't visible
    if (!visible || wrapper === null || wrapper === undefined) {
      return;
    }

    // Ignore clicks inside wrapper
    if (event.target === wrapper || wrapper.contains(event.target as Node)) {
      return;
    }

    // Hide emoji picker
    hide();
  }
</script>

<svelte:body on:click={onBodyClick} />

<template>
  {#if visible}
    <div
      class="wrapper"
      bind:this={wrapper}
      transition:fade={{duration: 100}}
      style:left={`${xTopLeft}px`}
      style:top={`${yTopLeft}px`}
    >
      <EmojiGroups bind:this={emojiGroups} on:groupClicked={scrollToGroup} />
      <EmojiPicker
        bind:this={emojiPicker}
        on:insertEmoji={(event) => dispatch('insertEmoji', event.detail)}
        on:activeGroupChange={setActiveGroup}
      />
    </div>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .wrapper {
    // Positioning
    position: fixed;
    right: 0;
    bottom: rem(30px);
    z-index: $z-index-context-menu;

    // Layout
    display: grid;
    grid-template:
      'groups'
      'emojis' 1fr;
    height: rem(300px);
    width: rem(280px);
    padding: rem(8px);
    margin: rem(16px) rem(16px) rem(24px);

    // Styling
    @extend %elevation-060;
    background-color: var(--cc-emoji-picker-background-color);
    border-radius: rem(4px);
  }
</style>
