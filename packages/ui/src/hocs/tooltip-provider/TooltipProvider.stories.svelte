<script module lang="ts">
  import {defineMeta} from '@storybook/addon-svelte-csf';

  import Button from '../../components/button/Button.svelte';
  import Icon from '../../components/icon/Icon.svelte';

  import TooltipProvider from './TooltipProvider.svelte';

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const {Story} = defineMeta({
    title: 'HOCs/TooltipProvider',
    component: TooltipProvider,
    args: {
      placement: 'block-start',
      text: 'Copy conference link',
    },
    argTypes: {
      placement: {
        control: 'inline-radio',
        options: ['block-start', 'block-end', 'inline-start', 'inline-end'],
      },
    },
    tags: ['autodocs'],
  });

  const log = console;

  const controls = [
    {glyph: 'mic_off', text: 'Unmute microphone'},
    {glyph: 'videocam', text: 'Turn off camera'},
    {glyph: 'present_to_all', text: 'Share your screen'},
  ];
</script>

<!--
  The tooltip appears while the trigger is hovered, and also while it has keyboard focus, so it can
  be reached with `Tab`. It hides again as soon as the trigger is clicked.
-->
<Story name="Text on Hover">
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <TooltipProvider {...args}>
        {#snippet children(props)}
          <Button {...props} {log} variant="primary">Hover or focus me</Button>
        {/snippet}
      </TooltipProvider>
    </div>
  {/snippet}
</Story>

<!--
  An info icon as the trigger, which is the most common arrangement in the app. The trigger is a
  `<button>` rather than a bare icon, so that keyboard users can reach the explanation too.
-->
<Story
  name="On an Info Icon"
  args={{
    text: "Your password is stored using your system's default secure credential storage.",
  }}
>
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <TooltipProvider {...args}>
        {#snippet children(props)}
          <button
            {...props}
            aria-label="More information"
            class="cursor-help text-grey-500 dark:text-grey-400"
            type="button"
          >
            <Icon class="text-xl" glyph="info" />
          </button>
        {/snippet}
      </TooltipProvider>
    </div>
  {/snippet}
</Story>

<!--
  Text which does not fit on one line wraps, balanced across lines, up to a bubble width of 280px.
-->
<Story
  name="Long Text"
  args={{
    text: 'This device could not detect a default secure credential storage, so the password cannot be stored.',
  }}
>
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <TooltipProvider {...args}>
        {#snippet children(props)}
          <Button {...props} {log} variant="secondary">Hover me</Button>
        {/snippet}
      </TooltipProvider>
    </div>
  {/snippet}
</Story>

<!--
  Several triggers next to each other. Each tooltip decides on its own when it is shown, so no state
  is wired up at the call site.
-->
<Story name="In a Row of Buttons">
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <div class="flex gap-3">
        {#each controls as control (control.glyph)}
          <TooltipProvider {...args} text={control.text}>
            {#snippet children(props)}
              <Button
                {...props}
                {log}
                aria-label={control.text}
                icon={{glyph: control.glyph}}
                shape="circle"
                variant="neutral"
              />
            {/snippet}
          </TooltipProvider>
        {/each}
      </div>
    </div>
  {/snippet}
</Story>
