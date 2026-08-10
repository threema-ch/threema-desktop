<script module lang="ts">
  import {defineMeta} from '@storybook/addon-svelte-csf';
  import {fn} from 'storybook/test';

  import VerticalNavigationStrip, {
    type VerticalNavigationAvatar,
    type VerticalNavigationItem,
  } from './VerticalNavigationStrip.svelte';

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const {Story} = defineMeta({
    title: 'Components/VerticalNavigationStrip',
    component: VerticalNavigationStrip,
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
    },
  });

  const startItems: VerticalNavigationItem[] = [
    {icon: {glyph: 'chat_bubble'}, label: 'Chats', active: true, onclick: fn()},
    {icon: {glyph: 'person'}, label: 'Contacts', onclick: fn()},
    {icon: {glyph: 'calendar_add_on'}, label: 'Conference', onclick: fn()},
    {icon: {glyph: 'drive_folder_upload'}, label: 'SecureShare', onclick: fn()},
  ];

  const endItems: VerticalNavigationItem[] = [
    {icon: {glyph: 'settings'}, label: 'Settings', onclick: fn()},
  ];

  const avatar: VerticalNavigationAvatar = {initials: 'JD', label: 'Jane Doe', onclick: fn()};
</script>

<!--
  The strip fills its container's height, and size constraints and offsets are expected to be
  provided by the consumer.
-->
<Story name="Default" asChild>
  <div class="h-screen w-full">
    <VerticalNavigationStrip
      {startItems}
      {endItems}
      {avatar}
      label="Primary navigation"
      class="py-6"
    />
  </div>
</Story>

<!--
  When the available height is too small for both groups, the start group becomes scrollable and its
  items fade out behind the fixed end group. This story shows the component in a short viewport to
  visualize how it behaves in such conditions.
-->
<Story
  name="Short"
  asChild
  globals={{
    viewport: {
      value: 'short',
    },
  }}
  parameters={{
    viewport: {
      options: {
        short: {
          name: 'Short',
          styles: {width: '92px', height: '360px'},
        },
      },
    },
  }}
>
  <div class="h-90 w-full">
    <VerticalNavigationStrip
      {startItems}
      {endItems}
      {avatar}
      label="Primary navigation"
      class="py-6"
    />
  </div>
</Story>
