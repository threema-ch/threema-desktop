<!--
  @component Renders the header of the call activity, i.e. how many participants are in the call,
  how long it has been running, and the button which expands or collapses the panel.
-->
<script lang="ts">
  import {Button} from '@threema/ui';
  import {cx} from 'tailwind-variants';

  import Timer from '~/app/ui/components/atoms/timer/Timer.svelte';
  import type {HeaderProps} from '~/app/ui/components/partials/call-activity/internal/header/props';
  import {i18n} from '~/app/ui/i18n';

  const {isExpanded, log, onclicktoggleexpand, state}: HeaderProps = $props();

  const isMacOs = import.meta.env.BUILD_PLATFORM === 'macos';
</script>

<header
  class={cx(
    'flex size-full items-center justify-center border-b',
    // Note: The separator is the same one which divides the app's panels, so it is taken from the
    // theme both style systems share rather than from a Tailwind color.
    isExpanded ? 'border-transparent' : 'border-[var(--t-panel-gap-color)]',
    // There is no room for the title and the duration beside the button while the panel is narrow.
    '@min-[256px]:justify-between @min-[256px]:pr-3',
    // Push call info to the right, so they are not rendered behind the macOS traffic lights.
    isMacOs && isExpanded ? '@min-[256px]:pl-23' : '@min-[256px]:pl-4',
    // Used as the drag area of the Electron window on macOS.
    isMacOs && '[-webkit-app-region:drag]',
  )}
>
  <div class="hidden overflow-hidden @min-[256px]:flex @min-[256px]:flex-col @min-[256px]:gap-1">
    <span class="truncate text-base/4 text-black dark:text-white">
      {#if state.type === 'connecting'}
        {$i18n.t('messaging.label--call-connecting', 'Connecting…')}
      {:else}
        {$i18n.t(
          'messaging.label--call-participant-count',
          '{n, plural, =0 {No Participants} =1 {1 Participant} other {# Participants}}',
          {n: state.nParticipants},
        )}
      {/if}
    </span>

    {#if state.type === 'connected'}
      <Timer from={state.startedAt}>
        {#snippet snippetTimeDisplay(current)}
          <span class="truncate text-sm/3.5 text-grey-600 dark:text-grey-400">
            {current}
          </span>
        {/snippet}
      </Timer>
    {/if}
  </div>

  <Button
    aria-label={isExpanded
      ? $i18n.t('messaging.action--call-collapse-panel', 'Collapse call')
      : $i18n.t('messaging.action--call-expand-panel', 'Expand call')}
    class={cx(
      'rotate-45 p-1.5 text-[21px] text-black hover:bg-black/5 active:bg-black/10 dark:text-white dark:hover:bg-white/10 dark:active:bg-white/20',
      // Keep the button clickable inside the drag area.
      isMacOs && '[-webkit-app-region:no-drag]',
    )}
    icon={{glyph: isExpanded ? 'unfold_less' : 'unfold_more'}}
    {log}
    onclick={onclicktoggleexpand}
    shape="circle"
    variant="secondary"
  />
</header>
