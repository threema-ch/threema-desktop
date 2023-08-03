<script lang="ts">
  import {onMount} from 'svelte';

  import {i18n} from '~/app/ui/i18n';
  import {EMOJI_LIST} from '~/app/ui/linking/emoji-list';
  import {type u53} from '~/common/types';
  import {joinConstArray} from '~/common/utils/array';
  import {literalToLowercase} from '~/common/utils/string';

  export let index: u53;

  const emojiNames = EMOJI_LIST.map((emoji) => joinConstArray(emoji, '_'));
  const emojiLabels = EMOJI_LIST.map(
    (emoji) => `rendezvous-emoji.label--${literalToLowercase(joinConstArray(emoji, '-'))}` as const,
  );

  let url: `./res/linking-emoji/emoji_${(typeof emojiNames)[u53]}.svg` | undefined;
  let description: string | undefined;

  function updateUrl(i: u53): void {
    const emojiName = emojiNames.at(i);

    if (emojiName !== undefined) {
      url = `./res/linking-emoji/emoji_${emojiName}.svg`;
      // Note: If emojiName was found, we simply assume that the label is defined as well.
      description = $i18n.t(emojiLabels[i]);
    }
  }

  onMount(() => {
    updateUrl(index);
  });

  $: updateUrl(index);
</script>

<template>
  {#if url !== undefined}
    <img class="emoji" src={url} alt={description} title={description} />
  {/if}
</template>
