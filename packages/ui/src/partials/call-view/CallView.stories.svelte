<script module lang="ts">
  import {defineMeta} from '@storybook/addon-svelte-csf';

  import {createTestVideoStream} from '../../utils/test/create-test-video-stream';

  import type {CallViewFeed} from './CallView.svelte';

  import {CallView} from './index';

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const {Story} = defineMeta({
    title: 'Partials/CallView',
    component: CallView,
    tags: ['autodocs'],
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

  const participants = [
    {color: 'deep-purple', initials: 'JD', name: 'Jane Doe'},
    {color: 'teal', initials: 'JS', name: 'John Smith'},
    {color: 'amber', initials: 'AM', name: 'Alex Morgan'},
    {color: 'pink', initials: 'RK', name: 'Robin Kim'},
    {color: 'indigo', initials: 'SL', name: 'Sam Lee'},
    {color: 'red', initials: 'CB', name: 'Chris Baker with a rather long name'},
  ] as const;

  // A handful of streams, shared between the feeds, because a stream can be shown by any number of
  // elements and a story does not need a camera per participant.
  const streams = Array.from({length: 3}, () => createTestVideoStream());

  /**
   * Build the feeds of a call: The user's own first, then `count` other participants, cycling
   * through the ones above if more are needed.
   *
   * The state of one's own feed follows the controls, so that toggling the camera or the microphone
   * shows what a participant would actually see.
   */
  function buildFeeds(
    count: number,
    self: {readonly isCameraEnabled: boolean; readonly isMicrophoneEnabled: boolean},
  ): CallViewFeed[] {
    return [
      {
        alt: 'Your own video',
        color: 'green',
        id: 'self',
        initials: 'ME',
        // The user's own camera is mirrored, because that is the picture one is used to.
        isMirrored: true,
        isMuted: !self.isMicrophoneEnabled,
        kind: 'camera',
        label: 'Me',
        stream: self.isCameraEnabled ? streams[0] : undefined,
      },
      ...Array.from({length: count}, (_, index) => {
        const participant = participants[index % participants.length];

        return {
          alt: `Video of ${participant?.name ?? 'someone'}`,
          color: participant?.color,
          id: `participant-${index}`,
          initials: participant?.initials ?? '??',
          isMuted: index % 3 === 0,
          kind: 'camera' as const,
          label: `${participant?.name ?? 'Someone'}${index >= participants.length ? ` (${index})` : ''}`,
          // Every third feed has no video, i.e. shows its avatar.
          stream: index % 3 === 2 ? undefined : streams[index % streams.length],
        };
      }),
    ];
  }

  /**
   * The user's own shared screen, which the screen-sharing control adds to the feeds. It comes
   * first, because a shared screen is what everyone is looking at.
   */
  const screenFeed: CallViewFeed = {
    alt: 'My own screen',
    id: 'self-screen',
    initials: 'ME',
    isMuted: false,
    kind: 'display',
    label: 'My screen',
    stream: streams[1],
  };
</script>

<script lang="ts">
  let count = $state<number>(4);
  let isSharingScreen = $state<boolean>(false);
  let isMicrophoneEnabled = $state<boolean>(true);
  let isCameraEnabled = $state<boolean>(true);

  const feeds = $derived([
    ...(isSharingScreen ? [screenFeed] : []),
    ...buildFeeds(count, {isCameraEnabled, isMicrophoneEnabled}),
  ]);
</script>

{#snippet controls()}
  <CallView.Control
    icon={{glyph: isMicrophoneEnabled ? 'mic' : 'mic_off'}}
    isActive={isMicrophoneEnabled}
    label="Microphone"
    {log}
    onclick={() => (isMicrophoneEnabled = !isMicrophoneEnabled)}
    type="toggle"
  />
  <CallView.Control
    icon={{glyph: isCameraEnabled ? 'videocam' : 'videocam_off'}}
    isActive={isCameraEnabled}
    label="Camera"
    {log}
    onclick={() => (isCameraEnabled = !isCameraEnabled)}
    type="toggle"
  />
  <CallView.Control
    icon={{glyph: 'screen_share'}}
    isActive={isSharingScreen}
    label="Share screen"
    {log}
    onclick={() => (isSharingScreen = !isSharingScreen)}
    type="toggle"
  />
  <CallView.Control
    icon={{glyph: 'call_end'}}
    label="Leave call"
    {log}
    onclick={() => log.info('Leave call')}
    type="button"
    variant="destructive"
  />
{/snippet}

<!--
  A call, with the number of participants adjustable, because the layout is a table of column counts
  per number of feeds: one feed fills the stage, two split it, three and four share a two-by-two
  grid, and so on. Clicking a feed expands it beside a strip of the others.
-->
<Story name="Call">
  {#snippet template()}
    <div class="flex h-screen flex-col">
      <div class="flex flex-wrap items-center gap-2 p-2 text-sm">
        <button
          class="rounded bg-grey-200 px-2 py-1 dark:bg-grey-700"
          onclick={() => (count = Math.max(0, count - 1))}>Remove participant</button
        >
        <button class="rounded bg-grey-200 px-2 py-1 dark:bg-grey-700" onclick={() => (count += 1)}
          >Add participant</button
        >
        <span>{feeds.length} feeds (yours and {count} others)</span>
      </div>

      <div class="min-h-0 flex-1">
        <CallView
          {controls}
          {feeds}
          {labels}
          {log}
          onclickfeedexpand={(_, feed) => log.info('Expanded', feed.id)}
        />
      </div>
    </div>
  {/snippet}
</Story>

<!--
  In a narrow column, e.g. a collapsed sidebar, every feed becomes a circle showing nothing but the
  picture and the mute state, and the controls stack vertically instead of sitting side by side.
-->
<Story name="Sidebar">
  {#snippet template()}
    <div class="h-screen w-20">
      <CallView {controls} {feeds} {labels} {log} />
    </div>
  {/snippet}
</Story>
