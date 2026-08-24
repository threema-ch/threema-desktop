<script module lang="ts">
  import {defineMeta} from '@storybook/addon-svelte-csf';

  import {ContextMenu} from '../../components/context-menu';

  import Control from './Control.svelte';

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const {Story} = defineMeta({
    title: 'Partials/CallView/Control',
    component: Control,
    tags: ['autodocs'],
    globals: {
      theme: 'dark',
    },
  });

  const log = console;

  const microphones = [
    {id: 'default', label: 'Default — MacBook Pro Microphone'},
    {id: 'headset', label: 'A headset with a rather long product name nobody needs'},
  ];
</script>

<script lang="ts">
  let isMicrophoneOn = $state<boolean>(true);
  let selectedMicrophoneId = $state<string>('default');
</script>

{#snippet microphoneMenu()}
  <ContextMenu {log}>
    <ContextMenu.Group icon={{glyph: 'mic'}}>
      {#snippet heading()}Microphone{/snippet}

      {#each microphones as microphone (microphone.id)}
        <ContextMenu.Item
          checked={microphone.id === selectedMicrophoneId}
          onclick={async () => {
            // Simulate slow switching, which the item reports with a spinner.
            await new Promise((resolve) => {
              setTimeout(resolve, 1000);
            });
            selectedMicrophoneId = microphone.id;
          }}
          title={microphone.label}
        >
          {microphone.label}
        </ContextMenu.Item>
      {/each}
    </ContextMenu.Group>
  </ContextMenu>
{/snippet}

<!--
  A control which turns something on and off, and renders in an alternating color depending on its
  current state.
-->
<Story name="Toggle">
  {#snippet template(args)}
    <Control
      {...args.type === 'toggle' ? args : {}}
      icon={{glyph: isMicrophoneOn ? 'mic' : 'mic_off'}}
      isActive={isMicrophoneOn}
      label="Microphone"
      {log}
      onclick={() => (isMicrophoneOn = !isMicrophoneOn)}
      type="toggle"
    />
  {/snippet}
</Story>

<!--
  With a menu attached, the control renders a chevron in its corner.
-->
<Story name="With a Menu">
  {#snippet template(args)}
    <Control
      {...args.type === 'toggle' ? args : {}}
      icon={{glyph: isMicrophoneOn ? 'mic' : 'mic_off'}}
      isActive={isMicrophoneOn}
      label="Microphone"
      {log}
      onclick={() => (isMicrophoneOn = !isMicrophoneOn)}
      popover={{label: 'Select microphone', content: microphoneMenu}}
      type="toggle"
    />
  {/snippet}
</Story>

<!--
  The control can render as a button instead of a toggle, which also supports a destructive variant.
-->
<Story name="Destructive">
  {#snippet template(args)}
    <Control
      {...args.type === 'button' ? args : {}}
      icon={{glyph: 'call_end'}}
      label="Leave call"
      {log}
      onclick={() => log.info('Leave call')}
      type="button"
      variant="destructive"
    />
  {/snippet}
</Story>

<!--
  A control can be disabled, which means it cannot be toggled. Its chevron is disabled along with
  it, if present.
-->
<Story name="Disabled">
  {#snippet template(args)}
    <Control
      {...args.type === 'toggle' ? args : {}}
      disabled
      icon={{glyph: 'videocam_off'}}
      isActive={false}
      label="Camera"
      {log}
      popover={{label: 'Select camera', content: microphoneMenu}}
      type="toggle"
    />
  {/snippet}
</Story>
