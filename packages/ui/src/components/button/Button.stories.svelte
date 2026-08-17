<script module lang="ts">
  import {defineMeta} from '@storybook/addon-svelte-csf';
  import {fn} from 'storybook/test';

  import Button from './Button.svelte';

  async function exampleAsyncHandler(): Promise<void> {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 2000);
    });
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const {Story} = defineMeta({
    title: 'Components/Button',
    component: Button,
    args: {
      // Report log calls to the Storybook actions panel.
      log: {trace: fn(), debug: fn(), info: fn(), warn: fn(), error: fn()},
      onclick: fn(),
    },
    tags: ['autodocs'],
  });
</script>

<Story name="Primary" args={{variant: 'primary'}}>Lorem ipsum</Story>

<Story name="Secondary" args={{variant: 'secondary'}}>Lorem ipsum</Story>

<Story name="Primary with Icon" args={{variant: 'primary', icon: {glyph: 'check'}}}>Confirm</Story>

<Story name="Secondary with Icon" args={{variant: 'secondary', icon: {glyph: 'close'}}}>
  Cancel
</Story>

<Story
  name="Primary with Async Handler"
  args={{
    variant: 'primary',
    icon: {glyph: 'check'},
    onclick: fn(exampleAsyncHandler),
  }}
>
  Confirm
</Story>

<Story
  name="Secondary with Async Handler"
  args={{
    variant: 'secondary',
    icon: {glyph: 'close'},
    onclick: fn(exampleAsyncHandler),
  }}
>
  Cancel
</Story>

<Story name="Neutral" args={{variant: 'neutral'}}>Lorem ipsum</Story>

<Story name="Destructive" args={{variant: 'destructive'}}>Delete</Story>

<Story name="Success" args={{variant: 'success'}}>Confirm</Story>

<Story name="Disabled" args={{variant: 'primary', disabled: true}}>Disabled</Story>

<Story name="Link" args={{href: '/example'}}>Go somewhere</Story>

<!--
  A circular button contains nothing but an icon, so it needs an accessible name of its own. It
  defaults to a 40px button containing a 24px icon, which is the most common icon button size.
-->
<Story
  name="Circle"
  args={{
    'aria-label': 'Mute microphone',
    'icon': {glyph: 'mic_off'},
    'shape': 'circle',
    'variant': 'neutral',
  }}
/>

<Story name="Circle Variants">
  {#snippet template(args)}
    <div class="flex flex-wrap items-center gap-3">
      <Button
        {...args}
        aria-label="Turn on microphone"
        icon={{glyph: 'mic_off'}}
        shape="circle"
        variant="neutral"
      />
      <Button
        {...args}
        aria-label="Turn off microphone"
        icon={{glyph: 'mic'}}
        shape="circle"
        variant="success"
      />
      <Button
        {...args}
        aria-label="Leave call"
        icon={{glyph: 'call_end'}}
        shape="circle"
        variant="destructive"
      />
    </div>
  {/snippet}
</Story>

<!--
  A disabled circular button, which is dimmed and does not react to pointer events.
-->
<Story
  name="Circle Disabled"
  args={{
    'aria-label': 'Mute microphone',
    'disabled': true,
    'icon': {glyph: 'mic_off'},
    'shape': 'circle',
    'variant': 'neutral',
  }}
/>

<!--
  The button's size is customizable by consumers via the `class` prop. As an example, the call UI
  needs: a 48px control, a 26px feed action, and a 20px device chooser.
-->
<Story name="Circle Sizes">
  {#snippet template(args)}
    <div class="flex flex-wrap items-center gap-3">
      <Button
        {...args}
        aria-label="Turn off camera"
        icon={{glyph: 'videocam'}}
        shape="circle"
        variant="neutral"
      />
      <Button
        {...args}
        aria-label="Turn off camera"
        class="p-3"
        icon={{glyph: 'videocam'}}
        shape="circle"
        variant="neutral"
      />
      <Button
        {...args}
        aria-label="Show in full screen"
        class="p-1 text-lg"
        icon={{glyph: 'fit_screen'}}
        shape="circle"
        variant="neutral"
      />
      <Button
        {...args}
        aria-label="Choose a microphone"
        class="p-0.5 text-base"
        icon={{glyph: 'keyboard_arrow_up'}}
        shape="circle"
        variant="neutral"
      />
    </div>
  {/snippet}
</Story>
