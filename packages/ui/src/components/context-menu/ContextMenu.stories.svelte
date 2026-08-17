<script module lang="ts">
  import {defineMeta} from '@storybook/addon-svelte-csf';

  import PopoverProvider from '../../hocs/popover-provider/PopoverProvider.svelte';
  import Button from '../button/Button.svelte';

  import {ContextMenu} from './index';

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const {Story} = defineMeta({
    title: 'Components/ContextMenu',
    component: ContextMenu,
    tags: ['autodocs'],
  });

  const log = console;

  const speakers = [
    {id: 'default', label: 'Default — MacBook Pro Speakers'},
    {id: 'display', label: 'Studio Display Speakers'},
    {id: 'headset', label: 'A headset with a rather long product name nobody needs'},
  ];

  const microphones = [
    {id: 'default', label: 'Default — MacBook Pro Microphone'},
    {id: 'headset', label: 'A headset with a rather long product name nobody needs'},
  ];
</script>

<script lang="ts">
  let selectedSpeakerId = $state<string>('default');
  let selectedMicrophoneId = $state<string>('headset');
  let isOpen = $state<boolean>(false);
</script>

<!--
  A menu of actions, each with an icon of its own.
-->
<Story name="Actions">
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <ContextMenu {...args} {log}>
        <ContextMenu.Item icon={{glyph: 'content_copy'}} onclick={() => log.info('Copy')}>
          Copy conference link
        </ContextMenu.Item>
        <ContextMenu.Item icon={{glyph: 'person_add'}} onclick={() => log.info('Invite')}>
          Invite people
        </ContextMenu.Item>
        <ContextMenu.Item disabled icon={{glyph: 'edit'}} onclick={() => log.info('Rename')}>
          Rename conference
        </ContextMenu.Item>
      </ContextMenu>
    </div>
  {/snippet}
</Story>

<!--
  Two labelled sections, each a set of choices with the selected one checked. The sections are
  separated automatically, and labels which do not fit the menu are truncated, with the full text
  available on hover.
-->
<Story name="Device Selection">
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <ContextMenu {...args} {log}>
        <ContextMenu.Group icon={{glyph: 'volume_up'}}>
          {#snippet heading()}Speakers{/snippet}

          {#each speakers as speaker (speaker.id)}
            <ContextMenu.Item
              checked={speaker.id === selectedSpeakerId}
              onclick={() => (selectedSpeakerId = speaker.id)}
              title={speaker.label}
            >
              {speaker.label}
            </ContextMenu.Item>
          {/each}
        </ContextMenu.Group>

        <ContextMenu.Group icon={{glyph: 'mic'}}>
          {#snippet heading()}Microphone{/snippet}

          {#each microphones as microphone (microphone.id)}
            <ContextMenu.Item
              checked={microphone.id === selectedMicrophoneId}
              onclick={() => (selectedMicrophoneId = microphone.id)}
              title={microphone.label}
            >
              {microphone.label}
            </ContextMenu.Item>
          {/each}
        </ContextMenu.Group>
      </ContextMenu>
    </div>
  {/snippet}
</Story>

<!--
  A choice which takes a moment to apply shows a spinner. An action which has no space for an icon
  shows no spinner.
-->
<Story name="Slow Selection">
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <ContextMenu {...args} {log}>
        <ContextMenu.Group icon={{glyph: 'mic'}}>
          {#snippet heading()}Microphone{/snippet}

          {#each microphones as microphone (microphone.id)}
            <ContextMenu.Item
              checked={microphone.id === selectedMicrophoneId}
              onclick={async () => {
                await new Promise((resolve) => {
                  setTimeout(resolve, 1500);
                });
                selectedMicrophoneId = microphone.id;
              }}
              title={microphone.label}
            >
              {microphone.label}
            </ContextMenu.Item>
          {/each}
        </ContextMenu.Group>

        <ContextMenu.Group>
          <ContextMenu.Item
            onclick={async () =>
              await new Promise((resolve) => {
                setTimeout(resolve, 1500);
              })}
          >
            An action without an icon
          </ContextMenu.Item>
        </ContextMenu.Group>
      </ContextMenu>
    </div>
  {/snippet}
</Story>

<!--
  Items with and without an icon in the same menu. Their labels line up, because the leading column
  is shared by all items of a menu. Two unlabelled sections show how a menu is split without
  headings.
-->
<Story name="Mixed Items">
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <ContextMenu {...args} {log}>
        <ContextMenu.Group>
          <ContextMenu.Item icon={{glyph: 'reply'}} onclick={() => log.info('Reply')}>
            Reply
          </ContextMenu.Item>
          <ContextMenu.Item onclick={() => log.info('Copy')}>Copy</ContextMenu.Item>
          <ContextMenu.Item onclick={() => log.info('Forward')}>Forward</ContextMenu.Item>
        </ContextMenu.Group>

        <ContextMenu.Group>
          <ContextMenu.Item icon={{glyph: 'delete'}} onclick={() => log.info('Delete')}>
            Delete
          </ContextMenu.Item>
        </ContextMenu.Group>
      </ContextMenu>
    </div>
  {/snippet}
</Story>

<!--
  The menu composed with a `PopoverProvider`, which is what makes it a context menu: the provider
  positions it relative to the trigger, and the menu itself knows nothing about it.
-->
<Story name="Inside a Popover">
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <PopoverProvider
        align="end"
        {isOpen}
        onclickoutside={() => (isOpen = false)}
        onclicktrigger={() => (isOpen = !isOpen)}
        placement="block-start"
      >
        {#snippet anchor(props)}
          <Button {...props} {log} icon={{glyph: 'more_vert'}} variant="secondary">Options</Button>
        {/snippet}

        {#snippet popover()}
          <ContextMenu {...args} {log}>
            <ContextMenu.Item icon={{glyph: 'content_copy'}} onclick={() => (isOpen = false)}>
              Copy conference link
            </ContextMenu.Item>
            <ContextMenu.Item icon={{glyph: 'person_add'}} onclick={() => (isOpen = false)}>
              Invite people
            </ContextMenu.Item>
          </ContextMenu>
        {/snippet}
      </PopoverProvider>
    </div>
  {/snippet}
</Story>
