<!--
  @component Renders an avatar (an image, or initials used as a fallback).
-->
<script lang="ts">
  import type {AvatarProps} from '~/app/ui/components/atoms/avatar/props';
  import LazyImage from '~/app/ui/components/atoms/lazy-image/LazyImage.svelte';
  import RadialExclusionMaskProvider from '~/app/ui/components/hocs/radial-exclusion-mask-provider/RadialExclusionMaskProvider.svelte';
  import type {RadialExclusionMaskProviderProps} from '~/app/ui/components/hocs/radial-exclusion-mask-provider/props';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import ThreemaIcon from '~/app/ui/svelte-components/blocks/Icon/ThreemaIcon.svelte';
  import type {f64, u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = AvatarProps;

  export let byteStore: $$Props['byteStore'];
  export let charms: NonNullable<$$Props['charms']> = [];
  export let color: $$Props['color'];
  export let description: $$Props['description'];
  export let initials: $$Props['initials'];
  export let isClickable: NonNullable<$$Props['isClickable']> = true;
  export let isFocusable: NonNullable<$$Props['isFocusable']> = true;
  export let size: $$Props['size'];

  const DEFAULT_OFFSET_PX = {x: 0, y: 0};
  const DEFAULT_POSITION_DEG = 135;
  const DEFAULT_SIZE_PX = 16;
  const DEFAULT_GAP_PX = 2;

  /**
   * Calculate relative positioning of an orb to the avatar's top left corner, in percent.
   */
  function getRelativePosition({
    avatarDiameter,
    charmDiameter,
    offset,
    position,
  }: {
    /**
     * Diameter of the avatar, in pixels.
     */
    readonly avatarDiameter: u53;
    /**
     * Diameter of the charm, in pixels.
     */
    readonly charmDiameter: u53;
    /**
     * Offset of the charm from the avatar's circle, in pixels.
     */
    readonly offset: {
      readonly x: u53;
      readonly y: u53;
    };
    /**
     * Position on the avatar's circle, in degrees (`0` to `360`).
     */
    readonly position: u53;
  }): {readonly x: f64; readonly y: f64} {
    // Convert to radian and adjust by `-90` degrees to start from the top center.
    const radian = ((position - 90) * Math.PI) / 180;

    const avatarRadius = avatarDiameter / 2;
    const charmRadius = charmDiameter / 2;

    // Offset of the charm from the avatar's center.
    const xOffsetFromCenter = avatarRadius * Math.cos(radian) - charmRadius;
    const yOffsetFromCenter = avatarRadius * Math.sin(radian) - charmRadius;

    // Position of the charm relative to the avatar's top left corner, plus offset.
    const xPosition = avatarRadius + xOffsetFromCenter + offset.x;
    const yPosition = avatarRadius + yOffsetFromCenter + offset.y;

    // Return charm position values as percentages.
    return {
      x: (xPosition / avatarDiameter) * 100,
      y: (yPosition / avatarDiameter) * 100,
    };
  }

  /**
   * Calculates cutouts for each charm that needs one.
   */
  function getCutouts(currentCharms: typeof charms): RadialExclusionMaskProviderProps['cutouts'] {
    return currentCharms.flatMap((charm) => {
      switch (charm.style?.type) {
        case undefined:
        case 'cutout': {
          const diameter =
            (charm.size ?? DEFAULT_SIZE_PX) +
            (charm.style?.type === 'cutout' ? charm.style.gap : DEFAULT_GAP_PX) * 2;

          return [
            {
              diameter,
              position: getRelativePosition({
                avatarDiameter: size,
                charmDiameter: diameter,
                // Add the cutout's radius to the offset, because the cutout is positioned from its
                // center instead of its top left corner.
                offset: charm.offset
                  ? {x: charm.offset.x + diameter / 2, y: charm.offset.y + diameter / 2}
                  : {x: DEFAULT_OFFSET_PX.x + diameter / 2, y: DEFAULT_OFFSET_PX.y + diameter / 2},
                position: charm.position ?? DEFAULT_POSITION_DEG,
              }),
            },
          ];
        }

        case 'overlay':
          // Return an empty array to filter out this value, as type `"overlay"` doesn't require a
          // cutout.
          return [];

        default:
          return unreachable(charm.style);
      }
    });
  }
</script>

<div class="container" style:--c-t-size={`${size}px`} style:--c-t-font-size="45cqw">
  {#each charms as charm}
    {@const diameter = charm.size ?? DEFAULT_SIZE_PX}
    {@const {x, y} = getRelativePosition({
      avatarDiameter: size,
      charmDiameter: diameter,
      offset: charm.offset ?? DEFAULT_OFFSET_PX,
      position: charm.position ?? DEFAULT_POSITION_DEG,
    })}

    <div
      class="charm"
      data-content-type={charm.content.type}
      style:--c-t-background-color={charm.style?.backgroundColor ?? 'transparent'}
      style:--c-t-content-color={charm.style?.contentColor ?? 'currentColor'}
      style:width={`${diameter}px`}
      style:height={`${diameter}px`}
      style:left={`${x}%`}
      style:top={`${y}%`}
    >
      {#if charm.content.type === 'text'}
        <div class="text">{charm.content.text}</div>
      {:else if charm.content.type === 'icon'}
        <div class="icon" title={charm.content.description}>
          {#if charm.content.family === 'threema' || charm.content.family === undefined}
            <ThreemaIcon theme="Filled">{charm.content.icon}</ThreemaIcon>
          {:else if charm.content.family === 'material'}
            <MdIcon theme="Filled">{charm.content.icon}</MdIcon>
          {:else}
            {unreachable(charm.content.family)}
          {/if}
        </div>
      {:else}
        {unreachable(charm.content)}
      {/if}
    </div>
  {/each}

  <RadialExclusionMaskProvider cutouts={getCutouts(charms)}>
    <span class="avatar" data-color={color}>
      {#if $$slots.overlay}
        <span class="overlay">
          <slot name="overlay" />
        </span>
      {/if}

      <LazyImage
        {byteStore}
        constraints={{
          min: {
            width: size,
            height: size,
          },
          max: {
            width: size,
            height: size,
          },
        }}
        {description}
        dimensions={undefined}
        {isClickable}
        {isFocusable}
        on:click
      >
        <span slot="failed">
          <span class="initials">{initials}</span>
        </span>
      </LazyImage>
    </span>
  </RadialExclusionMaskProvider>
</div>

<style lang="scss">
  @use 'component' as *;

  $-vars: (size, background-color, content-color, font-size);
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  .container {
    display: block;
    position: relative;
    width: var($-temp-vars, --c-t-size);
    height: var($-temp-vars, --c-t-size);

    .charm {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;

      color: var($-temp-vars, --c-t-content-color);
      background-color: var($-temp-vars, --c-t-background-color);

      border-radius: 50%;

      &[data-content-type='text'] {
        font-size: rem(10px);
      }

      &[data-content-type='icon'] {
        font-size: var(--cc-profile-picture-overlay-badge-icon-size);
      }

      .icon,
      .text {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    .avatar {
      container-type: size;

      display: block;
      position: relative;
      overflow: hidden;
      border-radius: 50%;
      width: var($-temp-vars, --c-t-size);
      height: var($-temp-vars, --c-t-size);

      @each $color in map-get-req($config, profile-picture-colors) {
        &[data-color='#{$color}'] {
          color: var(--c-profile-picture-initials-#{$color}, default);
          background-color: var(--c-profile-picture-background-#{$color}, default);
        }
      }

      .overlay {
        position: absolute;
        display: block;
        width: var($-temp-vars, --c-t-size);
        height: var($-temp-vars, --c-t-size);
        top: 0;
        left: 0;
      }

      .initials {
        font-size: min(rem(16px), var($-temp-vars, --c-t-font-size));
        display: flex;
        place-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        text-transform: uppercase;
      }
    }
  }
</style>
