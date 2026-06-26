<script module lang="ts">
  import {defineMeta} from '@storybook/addon-svelte-csf';
  import {fn} from 'storybook/test';

  import Switch from './Switch.svelte';

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const {Story} = defineMeta({
    title: 'Components/Switch',
    component: Switch,
    args: {
      onclick: fn(),
    },
    tags: ['autodocs'],
  });
</script>

<Story name="Off" args={{checked: false}} />

<Story name="On" args={{checked: true}} />

<Story name="Disabled Off" args={{checked: false, disabled: true}} />

<Story name="Disabled On" args={{checked: true, disabled: true}} />
