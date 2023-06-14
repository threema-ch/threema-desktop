<script lang="ts">
  import {onMount} from 'svelte';

  import {EMOJI_LIST} from '~/app/ui/linking/emoji-list';
  import {type u53} from '~/common/types';
  import {joinConstArray} from '~/common/utils/array';

  export let index: u53;

  const emojiNames = EMOJI_LIST.map((emoji) => joinConstArray(emoji, '_'));

  let url: `./res/linking-emoji/emoji_${(typeof emojiNames)[u53]}.svg` | undefined = undefined;

  function updateUrl(i: u53): void {
    const emojiName = emojiNames.at(i);

    if (emojiName !== undefined) {
      url = `./res/linking-emoji/emoji_${emojiName}.svg`;
    }
  }

  onMount(() => {
    updateUrl(index);
  });

  $: updateUrl(index);
</script>

<template>
  {#if url !== undefined}
    <img class="emoji" src={url} alt="Emoji" />
  {/if}
</template>
