<!--
  @component Renders a top bar with the user's profile picture and action buttons.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Timer from '~/app/ui/components/atoms/timer/Timer.svelte';
  import type {TopBarProps} from '~/app/ui/components/partials/group-call-activity/internal/top-bar/props';
  import {i18n} from '~/app/ui/i18n';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  type $$Props = TopBarProps;

  export let isExpanded: $$Props['isExpanded'];
  export let memberCount: $$Props['memberCount'];
  export let startedAt: $$Props['startedAt'];

  const dispatch = createEventDispatcher<{
    clicktoggleexpand: undefined;
  }>();

  function handleClickToggleExpand(): void {
    dispatch('clicktoggleexpand');
  }
</script>

<header class="container" class:expanded={isExpanded}>
  <div class="content">
    <span class="title">
      {$i18n.t(
        'messaging.label--call-participant-count',
        '{n, plural, =0 {No Participants} =1 {1 Participant} other {# Participants}}',
        {
          n: memberCount,
        },
      )}
    </span>

    <Timer from={startedAt}>
      <span slot="default" let:current class="subtitle">
        {current}
      </span>
    </Timer>
  </div>

  <div class="actions">
    <div class="expand">
      <IconButton on:click={handleClickToggleExpand} flavor="naked">
        <MdIcon theme="Outlined">
          {#if isExpanded}
            unfold_less
          {:else}
            unfold_more
          {/if}
        </MdIcon>
      </IconButton>
    </div>
  </div>
</header>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    align-items: center;
    justify-content: center;

    .content {
      display: none;
      overflow: hidden;

      .title,
      .subtitle {
        overflow-wrap: normal;
        white-space: nowrap;
        max-width: 100%;
        display: inline-block;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .title {
        color: var(--cc-call-sidebar-title-color);
        font-size: rem(16px);
        line-height: rem(16px);
      }

      .subtitle {
        color: var(--cc-call-sidebar-subtitle-color);
        font-size: rem(14px);
        line-height: rem(14px);
      }
    }

    .actions {
      --c-icon-button-naked-icon-color: var(--cc-call-sidebar-action-icon-color);

      display: flex;
      align-items: center;
      justify-content: end;

      .expand {
        transform: rotate(45deg);
      }
    }

    &.expanded {
      .content {
        .title {
          color: var(--cc-call-sidebar--expanded-title-color);
        }

        .subtitle {
          color: var(--cc-call-sidebar--expanded-subtitle-color);
        }
      }

      .actions {
        --c-icon-button-naked-icon-color: var(--cc-call-sidebar--expanded-action-icon-color);

        --c-icon-button-naked-outer-background-color--hover: rgba(0, 0, 0, 0.24);
        --c-icon-button-naked-outer-background-color--focus: rgba(0, 0, 0, 0.24);
        --c-icon-button-naked-outer-background-color--active: rgba(0, 0, 0, 0.38);
      }
    }
  }

  @container activity (min-width: 256px) {
    .container {
      justify-content: space-between;

      .content {
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: center;
        gap: rem(4px);
      }
    }
  }
</style>
