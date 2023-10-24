<!--
  @component Renders an avatar (an image, or initials used as a fallback).
-->
<script lang="ts">
  import type {AvatarProps} from '~/app/ui/components/atoms/avatar/props';
  import LazyImage from '~/app/ui/components/atoms/lazy-image/LazyImage.svelte';

  type $$Props = AvatarProps;

  export let bytes: $$Props['bytes'];
  export let initials: $$Props['initials'];
  export let description: $$Props['description'];
  export let color: $$Props['color'];
  export let size: $$Props['size'];
</script>

<span class="avatar" data-color={color}>
  <LazyImage
    {bytes}
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
    disabled={false}
    on:click
  >
    <span slot="failed">
      <span class="initials">{initials}</span>
    </span>
  </LazyImage>
</span>

<style lang="scss">
  @use 'component' as *;

  .avatar {
    display: inline-block;
    position: relative;
    overflow: hidden;
    border-radius: 50%;

    @each $color in map-get-req($config, profile-picture-colors) {
      &[data-color='#{$color}'] {
        color: var(--c-profile-picture-initials-#{$color}, default);
        background-color: var(--c-profile-picture-background-#{$color}, default);
      }
    }

    .initials {
      @extend %font-small-400;
      display: flex;
      place-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  }
</style>
