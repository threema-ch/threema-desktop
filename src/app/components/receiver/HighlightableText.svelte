<script lang="ts">
  import {escapeRegExp} from '~/common/utils/regex';

  export let text: string;
  export let substringToHighlight: string | undefined = undefined;

  function fragmentTextAtSubstring(textArg: string, substring: string): string[] {
    return textArg.split(new RegExp(`(${escapeRegExp(substring)})`, 'ui'));
  }
</script>

<template>
  {#if substringToHighlight === undefined || substringToHighlight.trim() === ''}
    {text}
  {:else}
    {#each fragmentTextAtSubstring(text, substringToHighlight) as fragment, i}
      {#if i % 2 === 0}
        {fragment}
      {:else}
        <span class="highlighted-text">{fragment}</span>
      {/if}
    {/each}
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .highlighted-text {
    background-color: $consumer-green-600;
    color: #ffffff;
  }
</style>
