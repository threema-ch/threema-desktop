<!--
  @component 
  Renders an avatar (an image, or initials used as a fallback).
-->
<script lang="ts">
  import type {AvatarProps} from '~/app/ui/components/atoms/avatar/props';
  import LazyImage from '~/app/ui/components/atoms/lazy-image/LazyImage.svelte';
  import type {f64} from '~/common/types';

  type $$Props = AvatarProps;

  export let byteStore: $$Props['byteStore'];
  export let charm: $$Props['charm'] = undefined;
  export let color: $$Props['color'];
  export let description: $$Props['description'];
  export let disabled: NonNullable<$$Props['disabled']> = false;
  export let initials: $$Props['initials'];
  export let size: $$Props['size'];

  const avatarRadiusPercent = 50;
  const cutoutRadiusPercent = 20;
  const offsetPercent = -5;
  const distanceFromCenterPercent = avatarRadiusPercent + offsetPercent;

  /**
   * Calculate charm position: 50% (center) plus a percentage of the avatar's radius (the distance
   * the charm should be positioned away from the avatar's center).
   */
  function getCharmPosition(
    currentCharm: typeof charm,
  ): [charmXPercent: f64 | undefined, charmYPercent: f64 | undefined] {
    if (currentCharm === undefined) {
      return [undefined, undefined];
    }

    return [
      50 +
        distanceFromCenterPercent *
          Math.cos((Math.PI / 180) * ((currentCharm.positionDegrees ?? 135) - 90)),
      50 +
        distanceFromCenterPercent *
          Math.sin((Math.PI / 180) * ((currentCharm.positionDegrees ?? 135) - 90)),
    ];
  }

  $: [charmXPercent, charmYPercent] = getCharmPosition(charm);
</script>

<span
  class="container"
  style={`--c-t-size: ${size}px;
          --c-t-charm-x: ${charmXPercent ?? 0}%;
          --c-t-charm-y: ${charmYPercent ?? 0}%;
          --c-t-cutout-radius: ${cutoutRadiusPercent}%;
          --c-t-font-size: 45cqw;`}
>
  {#if $$slots.charm}
    <div class="charm">
      <slot name="charm" />
    </div>
  {/if}

  <span class="avatar" data-color={color}>
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
      {disabled}
      on:click
    >
      <span slot="failed">
        <span class="initials">{initials}</span>
      </span>
    </LazyImage>
  </span>
</span>

<style lang="scss">
  @use 'component' as *;

  $-vars: (size, charm-x, charm-y, cutout-radius, font-size);
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  .container {
    display: block;
    position: relative;

    .charm {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;

      width: calc(var($-temp-vars, --c-t-cutout-radius) * 2);
      height: calc(var($-temp-vars, --c-t-cutout-radius) * 2);
      left: calc(var($-temp-vars, --c-t-charm-x) - var($-temp-vars, --c-t-cutout-radius));
      top: calc(var($-temp-vars, --c-t-charm-y) - var($-temp-vars, --c-t-cutout-radius));

      border-radius: 50%;
      font-size: var(--cc-profile-picture-overlay-badge-icon-size);
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

    // Only mask avatar if slot "charm" is filled.
    .charm:has([slot='charm']:not(:empty)) ~ .avatar {
      /* prettier-ignore */
      mask-image: radial-gradient(
        circle at var($-temp-vars, --c-t-charm-x) var($-temp-vars, --c-t-charm-y),
        transparent calc(var($-temp-vars, --c-t-cutout-radius)),
        /* Add a small gap between the cutout and the opaque area for smooth edges. */ 
        black calc(var($-temp-vars, --c-t-cutout-radius) + 1%)
      );
    }
  }
</style>
