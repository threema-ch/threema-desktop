<script lang="ts">
  import {unwrap} from '~/app/ui/svelte-components/utils/assert';

  import {
    calculateValueByCoords,
    getProgressPercentage,
    type Orientation,
    type StyleAnchor,
    type StyleDirection,
  } from '.';


  /**
   * Minimum value.
   */
  export let min: number;

  /**
   * Maximum value.
   */
  export let max: number;

  /**
   * Value steps to add/subtract in the range from min to max.
   */
  export let step = 1;

  /**
   * Current slider value.
   */
  export let value: number;

  /**
   * Slider orientation.
   */
  export let orientation: Orientation = 'horizontal';

  /**
   * Whether the slider is disabled.
   */
  export let disabled = false;

  // The thumb element
  let thumb: HTMLDivElement | null = null;

  // The track element
  let track: HTMLDivElement | null = null;

  // Whether the slider is currently being dragged.
  let isDragging = false;

  /**
   * Approximate the current value based on a pointer event.
   */
  function setValueByPointer(event: PointerEvent): void {
    // Only process if currently dragging and not displayed
    if (!isDragging || disabled) {
      return;
    }

    // Calculate value by coords of event
    const next = calculateValueByCoords(
      unwrap(track),
      orientation,
      direction,
      min,
      max,
      step,
      event.x,
      event.y,
    );

    // Only set the new value, if its in our defined range
    if (next >= min && next <= max) {
      // Set new value accourding to mouse position
      value = next;
    }
  }

  /**
   * Update value by keyboard events.
   * If `shift` is pressed while value gets changed - value is multiplied by 10.
   * If `ctrl` is pressed while value gets changed - value is multiplied by 100.
   */
  function updateValueByKeyboard(event: KeyboardEvent): void {
    // Calculate multiplier by `shift` or `ctrl` modifier keys
    let multiplier = 1;
    if (event.ctrlKey) {
      multiplier = 100;
    } else if (event.shiftKey) {
      multiplier = 10;
    }

    // Create next value for later corrections
    let next = value;

    switch (event.code) {
      case 'ArrowUp':
      case 'ArrowRight':
        next += step * multiplier;
        break;

      case 'ArrowDown':
      case 'ArrowLeft':
        next -= step * multiplier;
        break;

      case 'Home':
        next = min;
        break;

      case 'End':
        next = max;
        break;

      default:
        return;
    }

    // Keep next value in range
    if (next > max) {
      next = max;
    }
    if (next < min) {
      next = min;
    }

    // Set new value
    value = next;

    // Prevent bubbling handled key input
    event.preventDefault();
  }

  function getElementSize(element: HTMLDivElement): number {
    switch (orientation) {
      case 'horizontal':
        return element.getBoundingClientRect().width;
      case 'vertical':
        return element.getBoundingClientRect().height;
      default:
        throw new Error('Invalid orientation');
    }
  }

  // Percentage of tracker (0 - 100)
  let percentage: number;
  $: percentage = getProgressPercentage(value, min, max);

  // Thumb position, calculated by percentage of given value
  let position: number | undefined = undefined;
  $: if (thumb !== null && track !== null) {
    position = percentage - (percentage * getElementSize(thumb)) / getElementSize(track);
  }

  let anchor: StyleAnchor;
  let direction: StyleDirection;
  $: {
    switch (orientation) {
      case 'horizontal':
        anchor = 'left';
        direction = 'width';
        break;
      case 'vertical':
        anchor = 'bottom';
        direction = 'height';
        break;
      default:
        throw new Error('Invalid orientation');
    }
  }
</script>

<svelte:body
  on:pointerup={() => (isDragging = false)}
  on:pointercancel={() => (isDragging = false)}
  on:pointermove={setValueByPointer}
/>

<template>
  <div
    class="slider"
    class:disabled
    tabindex="0"
    role="slider"
    aria-orientation={orientation}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    on:pointerdown={(event) => {
      isDragging = true;
      setValueByPointer(event);
    }}
    on:keydown={updateValueByKeyboard}
    on:touchmove={(event) => {
      // If not prevented, the touch event may move the viewport
      if (isDragging) {
        event.preventDefault();
      }
    }}
    data-position={position}
    data-percentage={percentage}
    data-value={value}
  >
    <div class="track" bind:this={track}>
      <div class="total">
        <div class="progress" style="{direction}: {percentage * 100}%" />
      </div>
    </div>
    <div bind:this={thumb} class="thumb" style="{anchor}: {(position ?? 0) * 100}%;">
      <slot name="thumb">
        <div class="handle" />
      </slot>
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .slider {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    user-select: none;
    outline: none;

    &[aria-orientation='vertical'] {
      .track {
        .total {
          height: 100%;
          width: var(--c-slider-track-height, default);

          display: flex;
          align-items: flex-end;

          .progress {
            height: initial;
            width: 100%;
          }
        }
      }
    }

    &.disabled {
      filter: brightness(50%);

      .handle {
        cursor: default;
      }
    }
  }

  .track {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;

    .total {
      width: 100%;
      height: var(--c-slider-track-height, default);
      background-color: var(--c-slider-track-color, default);

      .progress {
        height: 100%;
        background-color: var(--c-slider-track-progress-color, default);
      }
    }
  }

  .thumb {
    position: absolute;

    .handle {
      width: var(--c-slider-thumb-size, default);
      height: var(--c-slider-thumb-size, default);
      border-radius: 50%;
      background-color: var(--c-slider-thumb-color, default);
      cursor: pointer;
    }
  }
</style>
