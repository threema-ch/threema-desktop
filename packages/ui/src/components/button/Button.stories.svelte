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

<Story name="Disabled" args={{variant: 'primary', disabled: true}}>Disabled</Story>

<Story name="Link" args={{href: '/example'}}>Go somewhere</Story>
