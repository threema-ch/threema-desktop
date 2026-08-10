<script module lang="ts">
  import {defineMeta} from '@storybook/addon-svelte-csf';

  import Icon from './Icon.svelte';

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const {Story} = defineMeta({
    title: 'Components/Icon',
    component: Icon,
    args: {
      glyph: 'chat_bubble',
    },
    tags: ['autodocs'],
  });

  const fonts = [
    {font: {family: 'material', style: 'outlined'}, glyph: 'chat_bubble'},
    {font: {family: 'material', style: 'filled'}, glyph: 'chat_bubble'},
    {font: {family: 'threema', style: 'outlined'}, glyph: 'incognito'},
    {font: {family: 'threema', style: 'filled'}, glyph: 'incognito'},
  ] as const;

  const sizes = ['text-base', 'text-2xl', 'text-5xl'] as const;
</script>

<!--
  By default, an icon is rendered with the outlined Material Symbols font, and is hidden from
  assistive technology because it is assumed to be decorative.
-->
<Story name="Default">
  {#snippet template(args)}
    <Icon {...args} />
  {/snippet}
</Story>

<!--
  The `font` prop selects the icon font. The Material Symbols font is a variable font, so it is
  available both outlined and filled. The Threema icon fonts ship as separate outlined and filled
  fonts. Note that the two font families do not share glyph names.
-->
<Story name="Icon Fonts">
  {#snippet template()}
    <div class="flex flex-wrap items-center gap-6">
      {#each fonts as { font, glyph } (`${font.family}-${font.style}`)}
        <div class="flex flex-col items-center gap-2">
          <Icon class="text-4xl" {font} {glyph} />
          <span class="text-[10px] text-grey-600 dark:text-grey-300">
            {font.family}/{font.style}
          </span>
        </div>
      {/each}
    </div>
  {/snippet}
</Story>

<!--
  An icon is sized by its font size, so it can be scaled with any font size utility via the `class`
  prop.
-->
<Story name="Sizes">
  {#snippet template(args)}
    <div class="flex flex-wrap items-center gap-6">
      {#each sizes as size (size)}
        <Icon {...args} class={size} />
      {/each}
    </div>
  {/snippet}
</Story>

<!--
  Without an explicit size, an icon takes the line height of its surrounding text, which keeps it
  aligned with the text it is placed next to.
-->
<Story name="In Text">
  {#snippet template(args)}
    <p class="max-w-80 text-base">
      Tap the <Icon {...args} /> button to start a new conversation, or the
      <Icon {...args} glyph="group_add" /> button to create a group.
    </p>
  {/snippet}
</Story>

<!--
  If an icon is the only content of a control, and that control has no accessible name of its own,
  the icon needs a `label`. It is then exposed as an image with that name instead of being hidden.
-->
<Story name="With Accessible Name">
  {#snippet template()}
    <Icon
      class="text-2xl"
      font={{family: 'material', style: 'filled'}}
      glyph="mic_off"
      label="Microphone is muted"
    />
  {/snippet}
</Story>
