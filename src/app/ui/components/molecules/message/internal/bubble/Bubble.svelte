<!--
  @component
  Renders a chat message bubble.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import type {BubbleProps} from '~/app/ui/components/molecules/message/internal/bubble/props';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  type $$Props = BubbleProps;

  export let clickable: NonNullable<$$Props['clickable']> = false;
  export let direction: $$Props['direction'];
  export let highlighted: NonNullable<$$Props['highlighted']> = false;
  export let padding: NonNullable<$$Props['padding']> = 'md';

  const dispatch = createEventDispatcher<{
    completehighlightanimation: undefined;
  }>();

  let element: SvelteNullableBinding<Element> = null;

  function handleChangeHighlight(enable: boolean): void {
    if (enable) {
      element?.addEventListener(
        'animationend',
        () => {
          highlighted = false;
          dispatch('completehighlightanimation');
        },
        {once: true},
      );
    }
  }

  $: handleChangeHighlight(highlighted);
</script>

<button
  bind:this={element}
  class={`bubble ${direction} ${padding}`}
  class:highlighted
  data-disabled={!clickable}
  on:click
>
  <slot />
</button>

<style lang="scss">
  @use 'component' as *;

  .bubble {
    @extend %neutral-input;

    position: relative;
    border-radius: rem(10px);
    text-align: left;
    overflow: hidden;

    &.inbound {
      background-color: var(--mc-message-background-color-incoming);
    }

    &.outbound {
      background-color: var(--mc-message-background-color-outgoing);
    }

    &.none {
      background-color: var(--mc-status-message-background-color);
    }

    &.xs {
      padding: rem(2px);
    }

    &.sm {
      padding: rem(4px) rem(8px);
    }

    &.md {
      padding: rem(8px) rem(10px);
    }

    &::after {
      content: '';
      position: absolute;
      pointer-events: none;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
    }

    &.highlighted {
      &::after {
        animation-name: pulse-brightness;
        animation-duration: 0.5s;
        animation-timing-function: ease-in-out;
        animation-delay: 0s;
        animation-iteration-count: 2;
      }
    }

    &:not([data-disabled='true']) {
      @include clicktarget-button-rect;

      &::after {
        transition: background-color 0.15s;
      }

      &:hover {
        cursor: pointer;

        &::after {
          background-color: var(--mc-message-highlight-overlay-color);
        }
      }
    }
  }

  @keyframes pulse-brightness {
    50% {
      background-color: var(--mc-message-highlight-overlay-color);
    }
  }
</style>
