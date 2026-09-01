<script module lang="ts">
  import {defineMeta} from '@storybook/addon-svelte-csf';

  import {createTestVideoStream} from '../../utils/test/create-test-video-stream';

  import Feed from './Feed.svelte';

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const {Story} = defineMeta({
    title: 'Partials/CallView/Feed',
    component: Feed,
    tags: ['autodocs'],
    globals: {
      theme: 'dark',
    },
    args: {
      alt: 'Video of Jane Doe',
      fit: 'cover',
      initials: 'JD',
      label: 'Jane Doe',
    },
    parameters: {
      layout: 'fullscreen',
    },
  });

  const log = console;

  const labels = {
    collapse: 'Collapse',
    expand: 'Expand',
    fullscreen: 'Full screen',
    muted: 'Microphone is muted',
    pictureInPicture: 'Picture-in-Picture',
  };

  const stream = createTestVideoStream({height: 600, width: 600});
</script>

<script lang="ts">
  let isExpanded = $state<boolean>(false);
  let visibleSize = $state<string>('not measured yet');
</script>

<!--
  A feed showing a camera, i.e. cropped to fill the tile and mirrored the way one's own camera is.
-->
<Story name="Feed">
  {#snippet template(args)}
    <div class="w-full max-w-100">
      <Feed
        {...args}
        color="deep-purple"
        {isExpanded}
        isMirrored
        isMuted
        {labels}
        {log}
        onchangevisiblesize={(size) =>
          (visibleSize = size === undefined ? 'not visible' : `${size.width} × ${size.height}`)}
        onclick={() => log.info('Feed clicked')}
        onclickexpand={() => (isExpanded = !isExpanded)}
        {stream}
      />
    </div>

    <p class="mt-2 text-sm text-grey-500">Reported size: {visibleSize}</p>
  {/snippet}
</Story>

<!--
  Without a stream, e.g. because the participant turned their camera off, the feed falls back to
  their avatar. The actions which are related to video are dropped along with it, because there is
  nothing to use fullscreen or picture-in-picture with.
-->
<Story name="Without Video">
  {#snippet template(args)}
    <div class="w-full max-w-100">
      <Feed
        {...args}
        color="deep-purple"
        isMuted
        {labels}
        {log}
        onclick={() => log.info('Feed clicked')}
        onclickexpand={() => log.info('Expand clicked')}
      />
    </div>
  {/snippet}
</Story>

<!--
  Below 256px the feed becomes a circle which shows nothing but the picture and the mute state.
  Everything else, including the actions, is dropped.
-->
<Story name="Compact">
  {#snippet template(args)}
    <div class="size-50">
      <Feed
        {...args}
        color="deep-purple"
        isMirrored
        isMuted
        {labels}
        {log}
        onclick={() => log.info('Feed clicked')}
        onclickexpand={() => log.info('Expand clicked')}
        {stream}
      />
    </div>
  {/snippet}
</Story>
