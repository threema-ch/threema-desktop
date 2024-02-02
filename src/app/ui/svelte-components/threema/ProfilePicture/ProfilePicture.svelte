<!--
  @component
  A profile picture with fallback to a colored background with two
  initials.

  If the `img` property is a promise, then the fallback profile picture will be shown
  until the promise is resolved.

  The `img` property may not be undefined, but you may pass in a promise that
  never resolves (for example with `Promise.race([])`).
-->
<script lang="ts">
  import Image from '~/app/ui/svelte-components/blocks/Image/Image.svelte';

  import type {ProfilePictureColor, ProfilePictureShape} from '.';


  /**
   * The address or URL of an image resource. May also be a promise.
   */
  export let img: string | Blob | Promise<string | Blob>;
  /**
   * Text alternative to the profile picture if displayed as an image.
   */
  export let alt: string;
  /**
   * Initials to be displayed while the profile picture image is unavailable.
   */
  export let initials: string;
  /**
   * The color associated to the profile picture.
   */
  export let color: ProfilePictureColor;
  /**
   * Optional title of the profile picture to be displayed when hovering.
   */
  export let title: string | undefined = undefined;
  /**
   * Optional profile picture display shape, defaults to 'square'.
   */
  export let shape: ProfilePictureShape = 'square';
  /**
   * Use predefined font sizes
   */
  export let fontSize: 'small' | 'large' = 'large';
</script>

<template>
  <div data-color={color} data-shape={shape}>
    <Image src={img} {alt} {title} on:load on:error {...$$restProps}>
      <span class="initials" data-size={fontSize}>{initials}</span>
    </Image>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    @include def-var(
      (--c-image-width: 100%, --c-image-height: 100%, --c-image-object-fit: cover)...
    );

    display: grid;
    place-items: center;
    user-select: none;
    width: var(--c-profile-picture-size, default);
    height: var(--c-profile-picture-size, default);
    overflow: hidden;

    @each $color in map-get-req($config, profile-picture-colors) {
      &[data-color='#{$color}'] {
        background-color: var(--c-profile-picture-background-#{$color}, default);

        .initials {
          color: var(--c-profile-picture-initials-#{$color}, default);
        }
      }
    }

    &[data-shape='circle'] {
      border-radius: 50%;
    }
  }

  .initials {
    &[data-size='large'] {
      @extend %font-large-400;
    }
    &[data-size='small'] {
      @extend %font-small-400;
    }

    text-transform: uppercase;
  }
</style>
