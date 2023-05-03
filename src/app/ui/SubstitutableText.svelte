<script lang="ts">
  export let text: string;

  const splitterRegex =
    // eslint-disable-next-line threema/ban-stateful-regex-flags
    /<(?<voidTag>[12345])\/>|<(?<tag>[12345])>(?<text>[^<]*)<\/\k<tag>>|(?<plain>.+?)/gu;

  $: fragments = [...text.matchAll(splitterRegex)].map(({groups}) => ({
    plain: groups?.plain,
    tag: groups?.tag ?? groups?.voidTag,
    isVoidTag: groups?.voidTag !== undefined,
    text: groups?.text,
  }));
</script>

<template>
  {#each fragments as fragment}
    {#if fragment.plain !== undefined}
      {fragment.plain}
    {:else if fragment.tag === '1' && $$slots[1]}
      <slot name="1" text={fragment.text} />
    {:else if fragment.tag === '2' && $$slots[2]}
      <slot name="2" text={fragment.text} />
    {:else if fragment.tag === '3' && $$slots[3]}
      <slot name="3" text={fragment.text} />
    {:else if fragment.tag === '4' && $$slots[4]}
      <slot name="4" text={fragment.text} />
    {:else if fragment.tag === '5' && $$slots[5]}
      <slot name="5" text={fragment.text} />
    {:else if fragment.isVoidTag}
      {`<${fragment.tag}/>`}
    {:else}
      {`<${fragment.tag}>${fragment.text}</${fragment.tag}>`}
    {/if}
  {/each}
</template>
