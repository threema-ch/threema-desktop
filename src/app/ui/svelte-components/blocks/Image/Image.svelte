<!--
  @component
  Load and display an image resource.

  To specify fallback content that will be shown until the image data is loaded,
  specify a slot value:

  ```html
  <Image src="https://example.com/image.jpg" alt="An image">
    <img src="loading.gif" alt="Loading...">
    <span slot="error">Uh-oh, image could not be loaded or rendered</span>
  </Image>
  ```

  The `src` property may not be undefined, but you may pass in a promise that
  never resolves (for example with `Promise.race([])`).
-->
<script lang="ts">
  import {onDestroy} from 'svelte';

  import {UrlSource} from '~/app/ui/svelte-components/utils/url';
  import {ensureError} from '~/common/utils/assert';

  /**
   * The address or URL of an image resource. May also be a promise.
   */
  export let src: string | Blob | Promise<string | Blob>;
  /**
   * Sets or retrieves a text alternative to the image.
   */
  export let alt: string;
  /**
   * Determines whether the image has been loaded successfully.
   */
  export let complete = false;

  // The image source transformed into a URL source.
  const urlSource = new UrlSource(onDestroy);
</script>

<template>
  {#await urlSource.load(src)}
    <slot />
  {:then url}
    <img
      src={url}
      {alt}
      on:click
      on:load
      on:error
      on:load={() => (complete = true)}
      on:error={(error) => {
        // Force falling back to the error/default slot.
        src = Promise.reject(ensureError(error));
        complete = true;
      }}
      {...$$restProps}
      class:complete
    />
  {:catch}
    <!-- Fall back the error slot, then to the default slot. -->
    <slot name="error">
      <slot />
    </slot>
  {/await}
</template>

<style lang="scss">
  @use 'component' as *;

  img {
    max-width: 100%;
    max-height: 100%;
    width: var(--c-image-width, default);
    height: var(--c-image-height, default);
    object-fit: var(--c-image-object-fit, default);
    border-radius: inherit;
  }
</style>
