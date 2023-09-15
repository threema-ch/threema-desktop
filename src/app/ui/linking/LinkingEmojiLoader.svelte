<script lang="ts">
  import {i18n} from '~/app/ui/i18n';
  import {EMOJI_LIST} from '~/app/ui/linking/emoji-list';
  import {type u8, type u53} from '~/common/types';
  import {joinConstArray} from '~/common/utils/array';
  import {literalToLowercase} from '~/common/utils/string';

  /**
   * A single byte that should be mapped to an emoji.
   */
  export let byte: u8;

  // Note: The source emoji list should be uniformly distributed over 256 indices so that no bias
  // occurs.
  const emojis = EMOJI_LIST.map(
    (codepoints) =>
      ({
        codepoint: joinConstArray(codepoints, '_'),
        label: `rendezvous-emoji.label--${literalToLowercase(joinConstArray(codepoints, '-'))}`,
      }) as const,
  );

  let url: `./res/linking-emoji/emoji_${(typeof emojis)[u53]['codepoint']}.svg` | undefined;
  let description: string | undefined;

  $: {
    const emoji = emojis[byte % EMOJI_LIST.length];
    if (emoji !== undefined) {
      url = `./res/linking-emoji/emoji_${emoji.codepoint}.svg`;
      description = $i18n.t(emoji.label);
    }
  }
</script>

<template>
  {#if url !== undefined}
    <img class="emoji" src={url} alt={description} title={description} />
  {/if}
</template>
