<script module lang="ts">
  import {defineMeta} from '@storybook/addon-svelte-csf';

  import {
    PROFILE_PICTURE_BACKGROUND_COLOR_CLASS_MAP,
    type ProfilePictureColor,
  } from '../../utils/profile-picture-color';
  import {createTestImageBytes} from '../../utils/test/create-test-image-bytes';
  import Icon from '../icon/Icon.svelte';

  import {Avatar} from './index';

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const {Story} = defineMeta({
    title: 'Components/Avatar',
    component: Avatar,
    args: {
      initials: 'AB',
    },
    tags: ['autodocs'],
  });

  const profileColors = Object.keys(
    PROFILE_PICTURE_BACKGROUND_COLOR_CLASS_MAP,
  ) as readonly ProfilePictureColor[];

  // Example image, created as PNG data to match the pixel-based profile pictures used at runtime.
  // It is deliberately not square, to show how such an image is fitted into the circle.
  //
  // Note: The test helper creates a solid black image, i.e. it shows how the avatar lays out an
  // image, but not what an actual profile picture looks like.
  //
  // Creating the image is asynchronous, so the story below awaits this promise in the markup.
  const imageBytes = createTestImageBytes({width: 480, height: 240});
</script>

<!--
  Without an image, the initials are displayed on a neutral grey background. At most two grapheme
  clusters are shown, i.e. the `ABC` below is displayed as `AB`.
-->
<Story name="Initials" args={{class: 'size-12', initials: 'ABC'}}>
  {#snippet template(args)}
    <Avatar {...args} />
  {/snippet}
</Story>

<!--
  The initials fallback can be tinted with one of the profile picture colors, which is derived from
  a contact's identity at runtime.
-->
<Story name="Profile Colors">
  {#snippet template(args)}
    <div class="flex flex-wrap items-center gap-3">
      {#each profileColors as color (color)}
        <Avatar {...args} {color} class="size-12" />
      {/each}
    </div>
  {/snippet}
</Story>

<!--
  The avatar fills its parent, so it is usually given a fixed size class. Its content (including the
  initials) scales with the circle.
-->
<Story name="Sizes" args={{color: 'teal'}}>
  {#snippet template(args)}
    <div class="flex items-center gap-3">
      <Avatar {...args} class="size-10" />
      <Avatar {...args} class="size-12" />
      <Avatar {...args} class="size-16" />
    </div>
  {/snippet}
</Story>

<!--
  The image can be passed as raw bytes, a `Blob` or an url. An image which is not square is cropped
  (`object-cover`) instead of being distorted. Note: Because the example image is a solid rectangle,
  the crop is not visible as such, but the avatar keeps its circular shape.
-->
<Story name="Image" args={{class: 'size-16'}}>
  {#snippet template(args)}
    {#await imageBytes then image}
      <Avatar {...args} {image} />
    {/await}
  {/snippet}
</Story>

<!--
  If the image cannot be loaded (or the source is not a valid url), the initials are displayed
  instead.
-->
<Story
  name="Broken Image"
  args={{class: 'size-16', color: 'red', image: 'https://localhost.invalid/missing.png'}}
>
  {#snippet template(args)}
    <Avatar {...args} />
  {/snippet}
</Story>

<!--
  In a container which is not square (marked with a dashed outline), the circle is limited by the
  container's shorter side and centered along its longer one. Charms are placed on the circle, not
  on the container.
-->
<Story name="Non-Square Container" args={{color: 'teal'}}>
  {#snippet template(args)}
    <div class="flex items-start gap-3">
      <div class="h-16 w-40 outline-1 outline-grey-400 outline-dashed">
        <Avatar {...args}>
          <Avatar.Charm position={{type: 'radial', degrees: 45}}>
            <span class="block size-4 rounded-full bg-primary-500"></span>
          </Avatar.Charm>
        </Avatar>
      </div>

      <div class="h-40 w-16 outline-1 outline-grey-400 outline-dashed">
        <Avatar {...args}>
          <Avatar.Charm position={{type: 'radial', degrees: 45}}>
            <span class="block size-4 rounded-full bg-primary-500"></span>
          </Avatar.Charm>
        </Avatar>
      </div>
    </div>
  {/snippet}
</Story>

<!--
  A charm is placed on the avatar's circle at `position.degrees` (`0` is the top center) and is cut
  out of the avatar. It is sized by its content, i.e. it does not need to know its own size, and can
  be interactive.
-->
<Story name="Charm" args={{class: 'size-12', color: 'teal'}}>
  {#snippet template(args)}
    <Avatar {...args}>
      <Avatar.Charm position={{type: 'radial', degrees: 45}}>
        <button
          class="flex size-4 cursor-pointer items-center justify-center rounded-full bg-grey-400 text-white"
          aria-label="Remove"
        >
          <Icon glyph="close" />
        </button>
      </Avatar.Charm>
    </Avatar>
  {/snippet}
</Story>

<!--
  Any number of charms can be placed on the avatar, each with its own size, position and gap:

  - The red charm sits on the circle at `45°`, with the default gap of `2px`.
  - The blue charm is larger and uses a wider `gapPx`.
  - The green charm is nudged inwards with an `offsetPx`.
  - The amber charm is positioned relative to the avatar's content (in percent) instead of on the
    circle.
  - The purple charm has no gap (`gapPx={0}`), so it is drawn on top of the avatar instead of being
    cut out of it.
-->
<Story name="Charms" args={{class: 'size-20', color: 'teal'}}>
  {#snippet template(args)}
    <Avatar {...args}>
      <Avatar.Charm position={{type: 'radial', degrees: 45}}>
        <span class="block size-4 rounded-full bg-profile-red"></span>
      </Avatar.Charm>
      <Avatar.Charm position={{type: 'radial', degrees: 135}} gapPx={4}>
        <span class="block size-5 rounded-full bg-profile-blue"></span>
      </Avatar.Charm>
      <Avatar.Charm position={{type: 'radial', degrees: 270, offsetPx: {x: 4, y: 0}}}>
        <span class="block size-4 rounded-full bg-profile-green"></span>
      </Avatar.Charm>
      <Avatar.Charm position={{type: 'relative', x: 50, y: 100}}>
        <span class="block size-4 rounded-full bg-profile-amber"></span>
      </Avatar.Charm>
      <Avatar.Charm position={{type: 'radial', degrees: 0}} gapPx={0}>
        <span class="block size-4 rounded-full bg-profile-purple"></span>
      </Avatar.Charm>
    </Avatar>
  {/snippet}
</Story>
