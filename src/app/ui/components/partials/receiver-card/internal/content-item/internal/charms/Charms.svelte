<!--
  @component 
  Renders icons to display the current preferences of a conversation.
-->
<script lang="ts">
  import {createEventDispatcher, onDestroy} from 'svelte';

  import RadialExclusionMaskProvider from '~/app/ui/components/hocs/radial-exclusion-mask-provider/RadialExclusionMaskProvider.svelte';
  import type {CharmsProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/charms/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import ThreemaIcon from '~/app/ui/svelte-components/blocks/Icon/ThreemaIcon.svelte';
  import {formatDurationBetween} from '~/app/ui/utils/timestamp';
  import type {u53} from '~/common/types';
  import {TIMER, type TimerCanceller} from '~/common/utils/timer';

  type $$Props = CharmsProps;

  export let call: $$Props['call'] = undefined;
  export let isBlocked: NonNullable<$$Props['isBlocked']> = false;
  export let isPinned: NonNullable<$$Props['isPinned']> = false;
  export let isPrivate: NonNullable<$$Props['isPrivate']> = false;
  export let notificationPolicy: NonNullable<$$Props['notificationPolicy']> = {
    type: 'default',
    isMuted: false,
  };

  const DEFAULT_CUTOUT = {
    diameter: 26,
    position: {
      x: -50,
      y: 50,
    },
  };

  let now: Date = new Date();
  let nowUpdateCanceller: TimerCanceller | undefined;

  const dispatch = createEventDispatcher<{
    clickjoincall: MouseEvent;
  }>();

  function handleClickCallCharm(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Only dispatch a join request if there is an active call that hasn't been joined yet.
    if (call?.isJoined === false) {
      dispatch('clickjoincall', event);
    }
  }

  function handleChangeCall(currentCall: typeof call): void {
    nowUpdateCanceller?.();

    // Only start a timer if there is an active, joined call.
    if (currentCall?.isJoined === true) {
      nowUpdateCanceller = TIMER.repeat(() => {
        now = new Date();
      }, 1000);
    }
  }

  function getNumberCountOf(timestamp: string): u53 {
    return timestamp.length - timestamp.split(':').length + 1;
  }

  $: hasNotificationPolicy = notificationPolicy.type !== 'default' || notificationPolicy.isMuted;
  $: currentDuration =
    call !== undefined && call.isJoined ? formatDurationBetween(call.startedAt, now) : undefined;

  $: handleChangeCall(call);

  onDestroy(() => {
    nowUpdateCanceller?.();
  });
</script>

<span class="container">
  {#if call !== undefined}
    <span class="item">
      <button class="charm call" class:joined={call.isJoined} on:click={handleClickCallCharm}>
        <span class="icon">
          <MdIcon theme="Filled">call</MdIcon>
        </span>
        {#if call.isJoined}
          {#if currentDuration === undefined}
            <!-- This should never happen, but if there is an active call but no duration somehow,
            show a default label. -->
            <span>{$i18n.t('messaging.label--call-joined-short', 'Joined')}</span>
          {:else}
            <span
              class="timer"
              style={`--c-t-number-count: ${getNumberCountOf(currentDuration)}ch;`}
              >{currentDuration}</span
            >
          {/if}
        {:else}
          <span>{$i18n.t('messaging.label--call-join-short', 'Join')}</span>
        {/if}
      </button>
    </span>
  {/if}

  {#if isBlocked}
    {@const hasNeighborLeft = call !== undefined}

    <span class="item">
      <RadialExclusionMaskProvider cutouts={hasNeighborLeft ? [DEFAULT_CUTOUT] : []}>
        <span class="charm blocked">
          <MdIcon title={$i18n.t('contacts.label--blocked', 'Blocked')} theme="Filled">block</MdIcon
          >
        </span>
      </RadialExclusionMaskProvider>
    </span>
  {/if}

  {#if hasNotificationPolicy}
    {@const hasNeighborLeft = call !== undefined || isBlocked}

    <span class="item">
      <RadialExclusionMaskProvider cutouts={hasNeighborLeft ? [DEFAULT_CUTOUT] : []}>
        <span class="charm">
          {#if notificationPolicy.type === 'mentioned'}
            <MdIcon theme="Filled">alternate_email</MdIcon>
          {:else if notificationPolicy.type === 'never'}
            <MdIcon theme="Filled">remove_circle</MdIcon>
          {:else if notificationPolicy.isMuted}
            <MdIcon theme="Filled">notifications_off</MdIcon>
          {/if}
        </span>
      </RadialExclusionMaskProvider>
    </span>
  {/if}

  {#if isPrivate}
    {@const hasNeighborLeft = call !== undefined || isBlocked || hasNotificationPolicy}

    <span class="item">
      <RadialExclusionMaskProvider cutouts={hasNeighborLeft ? [DEFAULT_CUTOUT] : []}>
        <span class="charm">
          <ThreemaIcon theme="Filled">incognito</ThreemaIcon>
        </span>
      </RadialExclusionMaskProvider>
    </span>
  {/if}

  {#if isPinned}
    {@const hasNeighborLeft = call !== undefined || isBlocked || hasNotificationPolicy || isPrivate}

    <span class="item">
      <RadialExclusionMaskProvider cutouts={hasNeighborLeft ? [DEFAULT_CUTOUT] : []}>
        <span class="charm pinned">
          <MdIcon theme="Filled">push_pin</MdIcon>
        </span>
      </RadialExclusionMaskProvider>
    </span>
  {/if}
</span>

<style lang="scss">
  @use 'component' as *;

  $-vars: (number-count);
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  .container {
    display: flex;
    flex-direction: row;
    position: relative;

    .item {
      transition: filter 0.3s ease-out;
      filter: drop-shadow(0px 2px 5px rgba(0, 0, 0, 0.075));

      .charm {
        display: flex;
        align-items: center;
        justify-content: center;

        height: rem(20px);
        min-width: rem(20px);
        color: var(--cc-conversation-preview-properties-icon-color);
        background-color: var(--cc-conversation-preview-properties-background-color);
        border-radius: rem(10px);
        font-size: rem(12px);

        &.call {
          @extend %neutral-input;

          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: rem(2px);

          padding: 0 rem(6px);
          color: var(--cc-conversation-preview-properties-call-text-color);
          background-color: var(--cc-conversation-preview-properties-call-background-color);

          &:not(.joined) {
            transform: translate3d(0, 0, 0) scale3d(1, 1, 1);

            transition-duration: 0.25s;
            transition-timing-function: cubic-bezier(0.05, 0.5, 0.1, 1);
            transition-property: background-color, transform;
            backface-visibility: hidden;

            &:hover {
              cursor: pointer;

              background-color: var(
                --cc-conversation-preview-properties-call-background-color--hover
              );
              transform: translate3d(0, rem(-1px), 0) scale3d(1.05, 1.05, 1.05);

              .icon {
                animation: ring 3s infinite;
              }
            }
          }

          &.joined {
            color: var(--cc-conversation-preview-properties-call-joined-text-color);
            background-color: var(
              --cc-conversation-preview-properties-call-joined-background-color
            );
          }

          .timer {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;

            width: calc(var($-temp-vars, --c-t-number-count) + rem(4px));
          }
        }

        &.blocked {
          color: red;
          font-weight: 900;
        }

        &.pinned {
          color: var(--cc-conversation-preview-properties-icon-pin-color);
        }
      }

      &:has(.charm.call:not(.joined):hover) {
        filter: drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.25));
      }

      &:nth-child(1) {
        z-index: 5;
      }

      &:nth-child(2) {
        z-index: 4;
      }

      &:nth-child(3) {
        z-index: 3;
      }

      &:nth-child(4) {
        z-index: 2;
      }

      &:nth-child(5) {
        z-index: 1;
      }
    }

    & :global(> *:not(:first-child)) {
      margin-left: -1px;
    }
  }

  @keyframes ring {
    0% {
      transform: rotate(0deg);
    }
    2% {
      transform: rotate(10deg);
    }
    4% {
      transform: rotate(0eg);
    }
    6% {
      transform: rotate(-10deg);
    }
    8% {
      transform: rotate(0deg);
    }
    10% {
      transform: rotate(10deg);
    }
    12% {
      transform: rotate(0eg);
    }
    14% {
      transform: rotate(-10deg);
    }
    16% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }
</style>
