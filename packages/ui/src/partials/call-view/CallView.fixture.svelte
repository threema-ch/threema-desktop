<!--
  @component Test fixture which renders a `CallView` with controls, so that the tests can reach a
  control the way a user does. Not part of the package's API.
-->

<script lang="ts" module>
  import type {Logger} from '@threema/ts-utils/logging/logger';
  import type {HTMLAttributes} from 'svelte/elements';

  import type {CallViewFeed, CallViewProps} from './CallView.svelte';

  import {CallView} from './index';

  export type CallViewFixtureProps = {
    readonly feeds: readonly CallViewFeed[];
    /**
     * Whether to render controls. Defaults to `false`.
     */
    readonly hasControls?: boolean;
    readonly log: Logger;
    readonly onclickcontrol?: () => void;
    readonly onclickfeed?: CallViewProps['onclickfeed'];
    readonly onclickfeedexpand?: CallViewProps['onclickfeedexpand'];
  } & HTMLAttributes<HTMLDivElement>;

  const LABELS = {
    collapse: 'Collapse',
    expand: 'Expand',
    fullscreen: 'Full screen',
    muted: 'Microphone is muted',
    pictureInPicture: 'Picture-in-Picture',
  };
</script>

<script lang="ts">
  const {
    feeds,
    hasControls = false,
    log,
    onclickcontrol,
    onclickfeed,
    onclickfeedexpand,
    ...restProps
  }: CallViewFixtureProps = $props();
</script>

{#snippet controls()}
  <CallView.Control
    icon={{glyph: 'mic'}}
    isActive={true}
    label="Microphone"
    {log}
    onclick={() => onclickcontrol?.()}
    type="toggle"
  />
  <CallView.Control icon={{glyph: 'videocam'}} isActive={true} label="Camera" {log} type="toggle" />
  <CallView.Control
    icon={{glyph: 'call_end'}}
    label="Leave call"
    {log}
    type="button"
    variant="destructive"
  />
{/snippet}

<CallView
  controls={hasControls ? controls : undefined}
  {feeds}
  labels={LABELS}
  {log}
  {onclickfeed}
  {onclickfeedexpand}
  {...restProps}
/>
